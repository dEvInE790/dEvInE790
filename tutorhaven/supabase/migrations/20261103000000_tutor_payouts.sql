-- TutorHaven — automatic tutor payouts (Paystack split payments).
-- Run after 20261102000000_production_payments.sql. Safe to run more than once.
--
-- Each tutor connects a bank account; the paystack-payout-account Edge Function
-- verifies it with Paystack and creates a Paystack subaccount. When a learner
-- pays for a session, Paystack splits the payment: the tutor's share settles to
-- the tutor's bank, TutorHaven keeps its commission.
--
-- Tutor's share = session list price × (1 − commission), so membership
-- discounts come out of TutorHaven's commission, never the tutor's earnings.
-- TutorHaven always keeps at least Paystack's fee (it bears the fees), so a
-- large membership discount can reduce the tutor's share slightly.

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
alter table public.platform_settings add column if not exists commission_rate numeric(4, 3) not null default 0.15;
alter table public.platform_settings drop constraint if exists platform_settings_commission_rate_check;
alter table public.platform_settings add constraint platform_settings_commission_rate_check check (commission_rate between 0 and 0.5);
alter table public.platform_settings add column if not exists payout_account_required boolean not null default true;

-- ---------------------------------------------------------------------------
-- Tutor payout accounts (written only by the server after Paystack verifies them)
-- ---------------------------------------------------------------------------
create table if not exists public.tutor_payout_accounts (
  tutor_id uuid primary key references public.tutors (id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number_last4 text not null check (account_number_last4 ~ '^[0-9]{4}$'),
  account_name text not null,
  subaccount_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tutor_payout_accounts enable row level security;
drop policy if exists "payout accounts: own or admin" on public.tutor_payout_accounts;
create policy "payout accounts: own or admin" on public.tutor_payout_accounts for select
using (tutor_id = auth.uid() or public.is_admin());
revoke all on public.tutor_payout_accounts from anon;
grant select on public.tutor_payout_accounts to authenticated;

-- Who is asking, for the payout Edge Function.
create or replace function public.payout_account_context()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'user_id', p.id, 'role', p.role, 'full_name', p.full_name, 'suspended', p.suspended_at is not null,
    'email', (select email from auth.users where id = p.id),
    'subaccount_code', (select subaccount_code from tutor_payout_accounts where tutor_id = p.id)
  )
  from profiles p where p.id = auth.uid();
$$;

-- Backend only: stores a payout account the Edge Function verified with Paystack.
create or replace function public.save_payout_account(
  p_tutor uuid, p_bank_code text, p_bank_name text, p_account_last4 text, p_account_name text, p_subaccount_code text
) returns public.tutor_payout_accounts
language plpgsql security definer set search_path = public as $$
declare v tutor_payout_accounts;
begin
  insert into tutor_payout_accounts (tutor_id, bank_code, bank_name, account_number_last4, account_name, subaccount_code)
  values (p_tutor, p_bank_code, p_bank_name, p_account_last4, p_account_name, p_subaccount_code)
  on conflict (tutor_id) do update set
    bank_code = excluded.bank_code, bank_name = excluded.bank_name, account_number_last4 = excluded.account_number_last4,
    account_name = excluded.account_name, subaccount_code = excluded.subaccount_code, updated_at = now()
  returning * into v;
  perform public.log_payment_event(null, 'payout_account.saved', 'admin', null, p_subaccount_code, null,
    json_build_object('tutor_id', p_tutor, 'bank', p_bank_name, 'last4', p_account_last4)::jsonb);
  perform public.notify(p_tutor, 'payout_account', 'Payout account saved',
    'Session payments will be paid to ' || p_bank_name || ' ••••' || p_account_last4 || ' (' || p_account_name || ').', '/dashboard/payouts');
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listing now also needs a payout account (when the platform requires it)
-- ---------------------------------------------------------------------------
create or replace function public.is_public_tutor(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tutors t join profiles p on p.id = t.id
    cross join platform_settings s
    where t.id = p_id and s.id = 1 and t.status = 'approved' and p.suspended_at is null
      and (not s.tutor_subscription_required or public.has_active_subscription(t.id, 'tutor'))
      and (not s.payout_account_required or exists (select 1 from tutor_payout_accounts a where a.tutor_id = t.id))
  );
$$;

-- ---------------------------------------------------------------------------
-- Split amounts on checkouts and payments
-- ---------------------------------------------------------------------------
alter table public.payment_intents add column if not exists tutor_id uuid references public.profiles (id) on delete set null;
alter table public.payment_intents add column if not exists subaccount_code text;
alter table public.payment_intents add column if not exists platform_fee numeric(12, 2);
alter table public.payment_intents add column if not exists tutor_share numeric(12, 2);

alter table public.payments add column if not exists tutor_id uuid references public.profiles (id) on delete set null;
alter table public.payments add column if not exists platform_fee numeric(12, 2);
alter table public.payments add column if not exists tutor_share numeric(12, 2);
alter table public.payments add column if not exists split_subaccount text;
create index if not exists payments_tutor_idx on public.payments (tutor_id, created_at desc);

-- Paystack's local card fee (1.5% + ₦100, ₦100 waived under ₦2,500, capped at ₦2,000).
create or replace function public.paystack_fee_estimate(p_amount numeric)
returns numeric language sql immutable as $$
  select least(2000, round(p_amount * 0.015 + case when p_amount >= 2500 then 100 else 0 end));
$$;

-- Works out the split when a session checkout starts.
create or replace function public.set_intent_split()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_booking bookings;
  v_rate numeric;
  v_share numeric;
begin
  if new.kind = 'session' and new.booking_id is not null then
    select * into v_booking from bookings where id = new.booking_id;
    select commission_rate into v_rate from platform_settings where id = 1;
    v_share := round(v_booking.price * (1 - coalesce(v_rate, 0.15)));
    -- TutorHaven always keeps at least Paystack's fee, since it bears the fees.
    v_share := greatest(0, least(v_share, new.amount - public.paystack_fee_estimate(new.amount)));
    new.tutor_id := v_booking.tutor_id;
    new.tutor_share := v_share;
    new.platform_fee := new.amount - v_share;
    new.subaccount_code := (select subaccount_code from tutor_payout_accounts where tutor_id = v_booking.tutor_id);
  else
    new.platform_fee := new.amount;
    new.tutor_share := 0;
  end if;
  return new;
end;
$$;
drop trigger if exists set_intent_split on public.payment_intents;
create trigger set_intent_split before insert on public.payment_intents
for each row execute function public.set_intent_split();

-- Copies the split onto the payment record when it is fulfilled.
create or replace function public.set_payment_split()
returns trigger language plpgsql security definer set search_path = public as $$
declare v payment_intents;
begin
  if new.provider_ref is not null then
    select * into v from payment_intents where reference = new.provider_ref;
    if found then
      new.tutor_id := v.tutor_id;
      new.platform_fee := v.platform_fee;
      new.tutor_share := v.tutor_share;
      new.split_subaccount := v.subaccount_code;
    end if;
  end if;
  if new.platform_fee is null then
    new.platform_fee := case when new.kind = 'session' then null else new.amount end;
  end if;
  return new;
end;
$$;
drop trigger if exists set_payment_split on public.payments;
create trigger set_payment_split before insert on public.payments
for each row execute function public.set_payment_split();

-- Backend only: the split for a checkout, passed to Paystack's initialize call.
create or replace function public.payment_split(p_reference text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('subaccount_code', subaccount_code, 'platform_fee', platform_fee, 'tutor_share', tutor_share, 'amount', amount)
  from payment_intents where reference = p_reference;
$$;

-- A tutor's own earnings (their share of paid sessions).
create or replace function public.my_earnings()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', coalesce(sum(tutor_share) filter (where status = 'succeeded'), 0),
    'this_month', coalesce(sum(tutor_share) filter (where status = 'succeeded' and created_at >= date_trunc('month', now())), 0),
    'paid_to_bank', coalesce(sum(tutor_share) filter (where status = 'succeeded' and split_subaccount is not null), 0),
    'awaiting_manual_payout', coalesce(sum(tutor_share) filter (where status = 'succeeded' and split_subaccount is null), 0),
    'sessions', count(*) filter (where status = 'succeeded')
  )
  from payments where tutor_id = auth.uid() and kind = 'session';
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_settings(p jsonb)
returns public.platform_settings
language plpgsql security definer set search_path = public as $$
declare v platform_settings;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update platform_settings set
    hold_minutes = coalesce((p ->> 'hold_minutes')::int, hold_minutes),
    tutor_subscription_required = coalesce((p ->> 'tutor_subscription_required')::boolean, tutor_subscription_required),
    commission_rate = coalesce((p ->> 'commission_rate')::numeric, commission_rate),
    payout_account_required = coalesce((p ->> 'payout_account_required')::boolean, payout_account_required),
    updated_at = now()
  where id = 1 returning * into v;
  return v;
end;
$$;

drop function if exists public.admin_list_payments(text, text, int);
create or replace function public.admin_list_payments(p_status text default '', p_search text default '', p_limit int default 100)
returns table (
  id uuid, user_id uuid, full_name text, email text, kind text, amount numeric, currency text, status text,
  description text, provider text, provider_ref text, note text, booking_id uuid, created_at timestamptz, refunded_at timestamptz,
  tutor_name text, platform_fee numeric, tutor_share numeric, split_subaccount text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.user_id, pr.full_name, u.email::text, p.kind, p.amount, p.currency, p.status,
           p.description, p.provider, p.provider_ref, p.note, p.booking_id, p.created_at, p.refunded_at,
           tp.full_name, p.platform_fee, p.tutor_share, p.split_subaccount
    from payments p
    join profiles pr on pr.id = p.user_id
    join auth.users u on u.id = p.user_id
    left join profiles tp on tp.id = p.tutor_id
    where (coalesce(p_status, '') = '' or p.status = p_status)
      and (coalesce(p_search, '') = ''
           or pr.full_name ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%'
           or coalesce(tp.full_name, '') ilike '%' || p_search || '%'
           or coalesce(p.provider_ref, '') ilike '%' || p_search || '%'
           or p.description ilike '%' || p_search || '%')
    order by p.created_at desc
    limit least(p_limit, 500);
end;
$$;

-- Tutors and their payout status, for the admin panel.
create or replace function public.admin_payout_accounts()
returns table (tutor_id uuid, full_name text, email text, tutor_status public.tutor_status, bank_name text, account_last4 text,
               account_name text, subaccount_code text, updated_at timestamptz, earned numeric, awaiting_manual_payout numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select t.id, p.full_name, u.email::text, t.status, a.bank_name, a.account_number_last4, a.account_name, a.subaccount_code, a.updated_at,
      coalesce((select sum(x.tutor_share) from payments x where x.tutor_id = t.id and x.kind = 'session' and x.status = 'succeeded'), 0),
      coalesce((select sum(x.tutor_share) from payments x where x.tutor_id = t.id and x.kind = 'session' and x.status = 'succeeded' and x.split_subaccount is null), 0)
    from tutors t join profiles p on p.id = t.id join auth.users u on u.id = t.id
    left join tutor_payout_accounts a on a.tutor_id = t.id
    order by a.updated_at desc nulls last, p.full_name;
end;
$$;

create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'users_by_role', (select coalesce(json_object_agg(role, n), '{}') from (select role, count(*) n from profiles group by role) x),
    'tutors_pending', (select count(*) from tutors where status = 'pending'),
    'tutors_listed', (select count(*) from tutors t where public.is_public_tutor(t.id)),
    'tutors_without_payout', (select count(*) from tutors t where t.status = 'approved' and not exists (select 1 from tutor_payout_accounts a where a.tutor_id = t.id)),
    'bookings_by_status', (select coalesce(json_object_agg(status, n), '{}') from (select status, count(*) n from bookings group by status) x),
    'revenue_total', (select coalesce(sum(amount), 0) from payments where status = 'succeeded'),
    'revenue_sessions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'session'),
    'revenue_tutor_subscriptions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'subscription' and audience = 'tutor'),
    'revenue_learner_subscriptions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'subscription' and coalesce(audience, 'learner') = 'learner'),
    'session_commission', (select coalesce(sum(platform_fee), 0) from payments where status = 'succeeded' and kind = 'session'),
    'tutor_earnings', (select coalesce(sum(tutor_share), 0) from payments where status = 'succeeded' and kind = 'session'),
    'awaiting_manual_payout', (select coalesce(sum(tutor_share), 0) from payments where status = 'succeeded' and kind = 'session' and split_subaccount is null),
    'refunded_total', (select coalesce(sum(amount), 0) from payments where status = 'refunded'),
    'revenue_by_month', (
      select coalesce(json_agg(json_build_object('month', m, 'amount', coalesce(a, 0)) order by m), '[]')
      from (
        select to_char(d, 'YYYY-MM') m,
          (select sum(amount) from payments p where p.status = 'succeeded' and date_trunc('month', p.created_at) = d) a
        from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
      ) x
    ),
    'new_users_30d', (select count(*) from profiles where created_at > now() - interval '30 days'),
    'active_subscriptions', (select count(*) from subscriptions where status in ('active', 'cancelled') and current_period_end > now()),
    'active_tutor_subscriptions', (select count(*) from subscriptions where audience = 'tutor' and status in ('active', 'cancelled') and current_period_end > now()),
    'payments_pending', (select count(*) from payment_intents where status = 'pending'),
    'payments_failed_30d', (select count(*) from payment_intents where status in ('failed', 'abandoned') and updated_at > now() - interval '30 days'),
    'refunds_pending', (select count(*) from payments where status = 'refund_pending'),
    'refunds_pending_amount', (select coalesce(sum(amount), 0) from payments where status = 'refund_pending'),
    'qualifications_pending', (select count(*) from tutor_qualifications where status = 'pending'),
    'suspended_users', (select count(*) from profiles where suspended_at is not null)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke execute on function
  public.save_payout_account(uuid, text, text, text, text, text),
  public.payment_split(text),
  public.set_intent_split(),
  public.set_payment_split()
from public, anon, authenticated;
grant execute on function public.save_payout_account(uuid, text, text, text, text, text), public.payment_split(text) to service_role;

revoke execute on function public.payout_account_context(), public.my_earnings(), public.admin_payout_accounts(), public.admin_list_payments(text, text, int) from public, anon;
grant execute on function public.payout_account_context(), public.my_earnings(), public.admin_payout_accounts(), public.admin_list_payments(text, text, int) to authenticated;
