-- TutorHaven — naira pricing, Paystack payments and admin settings.
-- Run after 20261030000000_init.sql. Safe on a database that already has data.

-- ---------------------------------------------------------------------------
-- Naira
-- ---------------------------------------------------------------------------
alter table public.tutors drop constraint if exists tutors_hourly_rate_check;
-- Rates entered under the old dollar rules are converted to a sensible naira rate.
update public.tutors set hourly_rate = greatest(1000, round(hourly_rate * 250 / 500) * 500) where hourly_rate < 1000;
alter table public.tutors add constraint tutors_hourly_rate_check check (hourly_rate between 1000 and 1000000);
alter table public.tutors alter column hourly_rate set default 5000;
alter table public.tutors alter column timezone set default 'Africa/Lagos';

alter table public.payments alter column currency set default 'NGN';
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('succeeded', 'refund_pending', 'refunded'));
alter table public.payments add column if not exists provider_ref text unique;
alter table public.payments add column if not exists refunded_at timestamptz;
alter table public.payments add column if not exists note text not null default '';

-- ---------------------------------------------------------------------------
-- Platform settings (single row, edited from the admin panel)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  currency text not null default 'NGN',
  plus_price numeric(12, 2) not null default 7500 check (plus_price > 0),
  family_price numeric(12, 2) not null default 15000 check (family_price > 0),
  plus_discount numeric(4, 3) not null default 0.10 check (plus_discount between 0 and 0.5),
  family_discount numeric(4, 3) not null default 0.15 check (family_discount between 0 and 0.5),
  hold_minutes int not null default 30 check (hold_minutes between 10 and 120),
  test_mode boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists "settings: public read" on public.platform_settings;
create policy "settings: public read" on public.platform_settings for select using (true);
grant select on public.platform_settings to anon, authenticated;

create or replace function public.settings()
returns public.platform_settings language sql stable security definer set search_path = public as $$
  select * from platform_settings where id = 1;
$$;

create or replace function public.member_discount(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((
    select case s.plan when 'family' then ps.family_discount when 'plus' then ps.plus_discount else 0 end
    from subscriptions s, platform_settings ps
    where s.user_id = p_user and s.current_period_end > now() and ps.id = 1
  ), 0);
$$;

-- ---------------------------------------------------------------------------
-- Checkout holds use the configurable hold time
-- ---------------------------------------------------------------------------
create or replace function public.hold_expired(p_created timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select p_created < now() - make_interval(mins => (select hold_minutes from platform_settings where id = 1));
$$;

create or replace function public.tutor_busy_slots(p_tutor uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at
  from bookings b
  where b.tutor_id = p_tutor
    and b.status <> 'cancelled'
    and not (b.status = 'pending_payment' and public.hold_expired(b.created_at))
    and b.starts_at < p_to and b.ends_at > p_from;
$$;

create or replace function public.create_booking(
  p_tutor uuid,
  p_student uuid,
  p_subject text,
  p_starts_at timestamptz,
  p_duration int,
  p_notes text default ''
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tutor tutors;
  v_local timestamp;
  v_minute int;
  v_booking bookings;
begin
  if v_uid is null then raise exception 'Please sign in to book a session'; end if;
  if p_student <> v_uid and not exists (select 1 from parent_links where parent_id = v_uid and student_id = p_student) then
    raise exception 'You can only book for yourself or a linked child';
  end if;
  if p_tutor = p_student then raise exception 'You cannot book a session with yourself'; end if;

  select * into v_tutor from tutors where id = p_tutor and status = 'approved';
  if not found then raise exception 'This tutor is not available for booking'; end if;
  if p_duration not in (30, 45, 60, 90) then raise exception 'Invalid session length'; end if;
  if p_starts_at < now() + interval '1 hour' then raise exception 'Sessions must be booked at least an hour in advance'; end if;
  if p_starts_at > now() + interval '60 days' then raise exception 'Sessions can be booked up to 60 days ahead'; end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'Please choose a subject'; end if;

  v_local := p_starts_at at time zone v_tutor.timezone;
  v_minute := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  if v_minute % 15 <> 0 or not exists (
    select 1 from availability a
    where a.tutor_id = p_tutor
      and a.weekday = extract(dow from v_local)::int
      and a.start_minute <= v_minute
      and v_minute + p_duration <= a.end_minute
  ) then
    raise exception 'That time is outside the tutor''s availability';
  end if;

  -- Release abandoned checkouts so they don't hold slots forever.
  update bookings set status = 'cancelled'
  where tutor_id = p_tutor and status = 'pending_payment' and public.hold_expired(created_at)
    and not exists (select 1 from payment_intents pi where pi.booking_id = bookings.id and pi.status = 'succeeded');

  begin
    insert into bookings (tutor_id, student_id, booked_by, subject, starts_at, ends_at, duration_minutes, price, notes)
    values (
      p_tutor, p_student, v_uid, trim(p_subject), p_starts_at,
      p_starts_at + make_interval(mins => p_duration), p_duration,
      round(v_tutor.hourly_rate * p_duration / 60.0),
      left(coalesce(p_notes, ''), 1000)
    )
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'Sorry, that slot was just taken. Please pick another time.';
  end;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paystack: payment intents and fulfilment
-- ---------------------------------------------------------------------------
create table if not exists public.payment_intents (
  reference text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('session', 'subscription')),
  booking_id uuid references public.bookings (id) on delete set null,
  plan text check (plan in ('plus', 'family')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payment_intents_user_idx on public.payment_intents (user_id, created_at desc);

alter table public.payment_intents enable row level security;
drop policy if exists "payment_intents: read own" on public.payment_intents;
create policy "payment_intents: read own" on public.payment_intents for select
using (user_id = auth.uid() or public.is_admin());
grant select on public.payment_intents to authenticated;

-- Called (with the user's token) by the paystack-init Edge Function.
-- Computes the amount on the server and returns what Paystack needs.
create or replace function public.start_checkout(p_kind text, p_booking uuid default null, p_plan text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_booking bookings;
  v_amount numeric(12, 2);
  v_ref text;
  v_desc text;
  s platform_settings;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  select * into s from platform_settings where id = 1;
  select email into v_email from auth.users where id = v_uid;

  if p_kind = 'session' then
    select * into v_booking from bookings where id = p_booking and booked_by = v_uid for update;
    if not found then raise exception 'Booking not found'; end if;
    if v_booking.status <> 'pending_payment' then raise exception 'This booking has already been processed'; end if;
    if public.hold_expired(v_booking.created_at) then
      update bookings set status = 'cancelled' where id = p_booking;
      raise exception 'This checkout expired. Please choose a time again.';
    end if;
    v_amount := round(v_booking.price * (1 - public.member_discount(v_uid)));
    v_desc := v_booking.subject || ' session';
  elsif p_kind = 'subscription' then
    v_amount := case p_plan when 'plus' then s.plus_price when 'family' then s.family_price end;
    if v_amount is null then raise exception 'Unknown plan'; end if;
    v_desc := 'TutorHaven ' || initcap(p_plan) || ' — 1 month';
  else
    raise exception 'Unknown checkout type';
  end if;

  v_ref := 'TH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into payment_intents (reference, user_id, kind, booking_id, plan, amount)
  values (v_ref, v_uid, p_kind, case when p_kind = 'session' then p_booking end, case when p_kind = 'subscription' then p_plan end, v_amount);

  return json_build_object('reference', v_ref, 'amount', v_amount, 'currency', 'NGN', 'email', v_email, 'description', v_desc);
end;
$$;

-- Called only by the backend (service role) after Paystack confirms the charge.
-- Idempotent: safe to call from both the webhook and the verify endpoint.
create or replace function public.fulfill_payment(p_reference text, p_amount_kobo bigint, p_payload jsonb default '{}')
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_intent payment_intents;
  v_booking bookings;
  v_status text := 'succeeded';
  v_note text := '';
  v_tutor_name text;
begin
  select * into v_intent from payment_intents where reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  if v_intent.status = 'succeeded' then
    return json_build_object('status', 'succeeded', 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'plan', v_intent.plan, 'already', true);
  end if;
  if p_amount_kobo < round(v_intent.amount * 100) then
    update payment_intents set status = 'failed', provider_payload = p_payload where reference = p_reference;
    raise exception 'Amount paid does not match the amount due';
  end if;

  if v_intent.kind = 'session' then
    select * into v_booking from bookings where id = v_intent.booking_id for update;
    if not found then
      v_status := 'refund_pending';
      v_note := 'Booking no longer exists';
    elsif v_booking.status = 'pending_payment' or v_booking.status = 'cancelled' then
      begin
        update bookings set status = 'confirmed', amount_paid = v_intent.amount where id = v_booking.id;
      exception when exclusion_violation then
        -- The hold expired and someone else took the slot while the learner was paying.
        v_status := 'refund_pending';
        v_note := 'Slot was taken before payment completed';
      end;
    elsif v_booking.status = 'confirmed' then
      v_status := 'refund_pending';
      v_note := 'Booking was already paid';
    end if;
    select full_name into v_tutor_name from profiles where id = v_booking.tutor_id;
    insert into payments (user_id, booking_id, kind, amount, currency, status, description, provider, provider_ref, note)
    values (v_intent.user_id, v_intent.booking_id, 'session', v_intent.amount, 'NGN', v_status,
            coalesce(v_booking.subject || ' with ' || v_tutor_name, 'Session'), 'paystack', p_reference, v_note);
  else
    insert into subscriptions (user_id, plan, status, current_period_end)
    values (v_intent.user_id, v_intent.plan, 'active', now() + interval '1 month')
    on conflict (user_id) do update
      set plan = excluded.plan, status = 'active',
          current_period_end = greatest(subscriptions.current_period_end, now()) + interval '1 month';
    insert into payments (user_id, kind, amount, currency, status, description, provider, provider_ref)
    values (v_intent.user_id, 'subscription', v_intent.amount, 'NGN', 'succeeded',
            'TutorHaven ' || initcap(v_intent.plan) || ' — 1 month', 'paystack', p_reference);
  end if;

  update payment_intents set status = 'succeeded', paid_at = now(), provider_payload = p_payload where reference = p_reference;
  return json_build_object('status', v_status, 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'plan', v_intent.plan, 'note', v_note);
end;
$$;

-- Paystack refund recorded by the paystack-refund Edge Function (service role).
create or replace function public.record_refund(p_payment uuid, p_note text default '')
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_payment payments;
begin
  update payments set status = 'refunded', refunded_at = now(), note = trim(note || ' ' || coalesce(p_note, ''))
  where id = p_payment and status in ('succeeded', 'refund_pending')
  returning * into v_payment;
  if not found then raise exception 'Payment not found or already refunded'; end if;
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Test-mode RPCs only work when an admin turns test mode on
-- ---------------------------------------------------------------------------
create or replace function public.pay_for_booking(p_booking uuid)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking bookings;
  v_amount numeric(12, 2);
  v_tutor_name text;
  v_payment payments;
begin
  if not (select test_mode from platform_settings where id = 1) then
    raise exception 'Test payments are turned off. Please pay with Paystack.';
  end if;
  select * into v_booking from bookings where id = p_booking and booked_by = v_uid for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'pending_payment' then raise exception 'This booking has already been processed'; end if;
  if public.hold_expired(v_booking.created_at) then
    update bookings set status = 'cancelled' where id = p_booking;
    raise exception 'This checkout expired. Please choose a time again.';
  end if;

  v_amount := round(v_booking.price * (1 - public.member_discount(v_uid)));
  select full_name into v_tutor_name from profiles where id = v_booking.tutor_id;
  update bookings set status = 'confirmed', amount_paid = v_amount where id = p_booking;
  insert into payments (user_id, booking_id, kind, amount, currency, description, provider)
  values (v_uid, p_booking, 'session', v_amount, 'NGN', v_booking.subject || ' with ' || v_tutor_name, 'test')
  returning * into v_payment;
  return v_payment;
end;
$$;

create or replace function public.subscribe(p_plan text)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_price numeric(12, 2);
  v_sub subscriptions;
  s platform_settings;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  select * into s from platform_settings where id = 1;
  if not s.test_mode then raise exception 'Test payments are turned off. Please pay with Paystack.'; end if;
  v_price := case p_plan when 'plus' then s.plus_price when 'family' then s.family_price end;
  if v_price is null then raise exception 'Unknown plan'; end if;

  insert into subscriptions (user_id, plan, status, current_period_end)
  values (v_uid, p_plan, 'active', now() + interval '1 month')
  on conflict (user_id) do update
    set plan = excluded.plan, status = 'active',
        current_period_end = greatest(subscriptions.current_period_end, now()) + interval '1 month'
  returning * into v_sub;

  insert into payments (user_id, kind, amount, currency, description, provider)
  values (v_uid, 'subscription', v_price, 'NGN', 'TutorHaven ' || initcap(p_plan) || ' — 1 month', 'test');
  return v_sub;
end;
$$;

-- Cancelling a paid Paystack session queues a refund for an admin to issue;
-- test-mode payments are marked refunded straight away.
create or replace function public.set_booking_status(p_booking uuid, p_status public.booking_status)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking bookings;
  v_is_tutor boolean;
  v_is_learner_side boolean;
  v_window interval;
begin
  select * into v_booking from bookings where id = p_booking for update;
  if not found then raise exception 'Booking not found'; end if;

  v_is_tutor := v_booking.tutor_id = v_uid;
  v_is_learner_side := v_booking.student_id = v_uid or v_booking.booked_by = v_uid or public.is_parent_of(v_booking.student_id);
  if not (v_is_tutor or v_is_learner_side or public.is_admin()) then
    raise exception 'Booking not found';
  end if;

  if p_status = 'cancelled' then
    if v_booking.status not in ('pending_payment', 'confirmed') then
      raise exception 'Only upcoming sessions can be cancelled';
    end if;
    if v_booking.status = 'confirmed' and not v_is_tutor and not public.is_admin() then
      v_window := case when public.member_discount(v_booking.booked_by) > 0 then interval '2 hours' else interval '24 hours' end;
      if v_booking.starts_at - now() < v_window then
        raise exception 'Sessions can be cancelled up to % before they start',
          case when v_window = interval '2 hours' then '2 hours' else '24 hours' end;
      end if;
    end if;
    update bookings set status = 'cancelled' where id = p_booking returning * into v_booking;
    update payments set status = 'refunded', refunded_at = now()
    where booking_id = p_booking and status = 'succeeded' and provider = 'test';
    update payments set status = 'refund_pending', note = trim(note || ' Cancelled ' || to_char(now(), 'YYYY-MM-DD'))
    where booking_id = p_booking and status = 'succeeded' and provider <> 'test';
  elsif p_status = 'completed' then
    if not (v_is_tutor or public.is_admin()) then raise exception 'Only the tutor can complete a session'; end if;
    if v_booking.status <> 'confirmed' then raise exception 'Only confirmed sessions can be completed'; end if;
    if v_booking.starts_at > now() then raise exception 'This session has not started yet'; end if;
    update bookings set status = 'completed' where id = p_booking returning * into v_booking;
    update tutors set sessions_completed = sessions_completed + 1 where id = v_booking.tutor_id;
  else
    raise exception 'Unsupported status change';
  end if;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin panel RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_settings(p jsonb)
returns public.platform_settings
language plpgsql security definer set search_path = public as $$
declare
  v platform_settings;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update platform_settings set
    plus_price = coalesce((p ->> 'plus_price')::numeric, plus_price),
    family_price = coalesce((p ->> 'family_price')::numeric, family_price),
    plus_discount = coalesce((p ->> 'plus_discount')::numeric, plus_discount),
    family_discount = coalesce((p ->> 'family_discount')::numeric, family_discount),
    hold_minutes = coalesce((p ->> 'hold_minutes')::int, hold_minutes),
    test_mode = coalesce((p ->> 'test_mode')::boolean, test_mode),
    updated_at = now()
  where id = 1
  returning * into v;
  return v;
end;
$$;

create or replace function public.admin_list_payments(p_status text default '', p_search text default '', p_limit int default 100)
returns table (
  id uuid, user_id uuid, full_name text, email text, kind text, amount numeric, currency text, status text,
  description text, provider text, provider_ref text, note text, booking_id uuid, created_at timestamptz, refunded_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.user_id, pr.full_name, u.email::text, p.kind, p.amount, p.currency, p.status,
           p.description, p.provider, p.provider_ref, p.note, p.booking_id, p.created_at, p.refunded_at
    from payments p
    join profiles pr on pr.id = p.user_id
    join auth.users u on u.id = p.user_id
    where (coalesce(p_status, '') = '' or p.status = p_status)
      and (coalesce(p_search, '') = ''
           or pr.full_name ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%'
           or coalesce(p.provider_ref, '') ilike '%' || p_search || '%'
           or p.description ilike '%' || p_search || '%')
    order by p.created_at desc
    limit least(p_limit, 500);
end;
$$;

-- For refunds issued outside Paystack (e.g. bank transfer).
create or replace function public.admin_mark_refunded(p_payment uuid, p_note text default '')
returns public.payments
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.record_refund(p_payment, coalesce(nullif(p_note, ''), 'Marked refunded by admin'));
end;
$$;

create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'users_by_role', (select coalesce(json_object_agg(role, n), '{}') from (select role, count(*) n from profiles group by role) x),
    'tutors_pending', (select count(*) from tutors where status = 'pending'),
    'bookings_by_status', (select coalesce(json_object_agg(status, n), '{}') from (select status, count(*) n from bookings group by status) x),
    'revenue_total', (select coalesce(sum(amount), 0) from payments where status = 'succeeded'),
    'revenue_by_month', (
      select coalesce(json_agg(json_build_object('month', m, 'amount', coalesce(a, 0)) order by m), '[]')
      from (
        select to_char(d, 'YYYY-MM') m,
          (select sum(amount) from payments p
            where p.status = 'succeeded' and date_trunc('month', p.created_at) = d) a
        from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
      ) x
    ),
    'new_users_30d', (select count(*) from profiles where created_at > now() - interval '30 days'),
    'active_subscriptions', (select count(*) from subscriptions where current_period_end > now()),
    'refunds_pending', (select count(*) from payments where status = 'refund_pending'),
    'refunds_pending_amount', (select coalesce(sum(amount), 0) from payments where status = 'refund_pending')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke execute on function public.fulfill_payment(text, bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.record_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.fulfill_payment(text, bigint, jsonb) to service_role;
grant execute on function public.record_refund(uuid, text) to service_role;

revoke execute on function
  public.start_checkout(text, uuid, text),
  public.admin_update_settings(jsonb),
  public.admin_list_payments(text, text, int),
  public.admin_mark_refunded(uuid, text)
from public, anon;
grant execute on function
  public.start_checkout(text, uuid, text),
  public.admin_update_settings(jsonb),
  public.admin_list_payments(text, text, int),
  public.admin_mark_refunded(uuid, text)
to authenticated;
