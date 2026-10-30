-- TutorHaven — core schema, row level security and RPCs.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'parent', 'tutor', 'admin');
create type public.tutor_status as enum ('pending', 'approved', 'rejected');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  avatar_url text,
  grade_level text,
  subjects text[] not null default '{}',
  goals text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tutors (
  id uuid primary key references public.profiles (id) on delete cascade,
  headline text not null default '',
  bio text not null default '',
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  languages text[] not null default '{English}',
  hourly_rate numeric(10, 2) not null default 35 check (hourly_rate between 5 and 500),
  years_experience int not null default 0 check (years_experience between 0 and 60),
  location text not null default '',
  timezone text not null default 'UTC',
  status public.tutor_status not null default 'pending',
  rating numeric(3, 2) not null default 0,
  review_count int not null default 0,
  sessions_completed int not null default 0,
  created_at timestamptz not null default now()
);

-- Weekly recurring availability, in the tutor's own timezone.
create table public.availability (
  id bigint generated always as identity primary key,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute int not null check (end_minute between 1 and 1440),
  check (end_minute > start_minute)
);
create index availability_tutor_idx on public.availability (tutor_id);

create table public.parent_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  booked_by uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes int not null check (duration_minutes in (30, 45, 60, 90)),
  price numeric(10, 2) not null,
  amount_paid numeric(10, 2),
  status public.booking_status not null default 'pending_payment',
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint bookings_no_overlap exclude using gist (
    tutor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);
create index bookings_student_idx on public.bookings (student_id, starts_at);
create index bookings_tutor_idx on public.bookings (tutor_id, starts_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
create index reviews_tutor_idx on public.reviews (tutor_id, created_at desc);

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('plus', 'family')),
  status text not null default 'active' check (status in ('active', 'canceled')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  kind text not null check (kind in ('session', 'subscription')),
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  status text not null default 'succeeded' check (status in ('succeeded', 'refunded')),
  description text not null default '',
  provider text not null default 'test',
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.favourites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tutor_id)
);

-- Public directory of approved tutors (RLS of the underlying tables still applies).
create view public.tutor_directory with (security_invoker = true) as
select
  t.*,
  p.full_name,
  p.avatar_url,
  array_to_string(t.subjects, ' ') as subjects_text
from public.tutors t
join public.profiles p on p.id = t.id
where t.status = 'approved';

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_parent_of(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from parent_links where parent_id = auth.uid() and student_id = p_student);
$$;

create or replace function public.is_tutor_of(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings where tutor_id = auth.uid() and student_id = p_student);
$$;

create or replace function public.is_public_tutor(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tutors where id = p_id and status = 'approved');
$$;

-- Discount (0–1) that the given user's subscription grants on sessions.
create or replace function public.member_discount(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((
    select case plan when 'family' then 0.15 when 'plus' then 0.10 else 0 end
    from subscriptions
    where user_id = p_user and current_period_end > now()
  ), 0);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile (and tutor record) for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  v_role := case coalesce(new.raw_user_meta_data ->> 'role', 'student')
    when 'parent' then 'parent'::public.user_role
    when 'tutor' then 'tutor'::public.user_role
    else 'student'::public.user_role -- admin can never be self-assigned
  end;

  insert into profiles (id, full_name, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), v_role);

  if v_role = 'tutor' then
    insert into tutors (id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Users may edit their own profile, but never their role.
-- Runs with the caller's rights so current_user reflects the API role; RPCs (owned by
-- postgres) can still change protected columns.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
before update on public.profiles
for each row execute function public.protect_profile_columns();

-- Tutors may edit their listing, but status and stats are system-managed.
-- Runs with the caller's rights so current_user reflects the API role; RPCs (owned by
-- postgres) can still change protected columns.
create or replace function public.protect_tutor_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status := old.status;
    new.rating := old.rating;
    new.review_count := old.review_count;
    new.sessions_completed := old.sessions_completed;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger protect_tutor_columns
before update on public.tutors
for each row execute function public.protect_tutor_columns();

-- Keep tutor rating aggregates in sync with reviews.
create or replace function public.refresh_tutor_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tutor uuid := coalesce(new.tutor_id, old.tutor_id);
begin
  update tutors t set
    rating = coalesce((select round(avg(rating)::numeric, 2) from reviews where tutor_id = v_tutor), 0),
    review_count = (select count(*) from reviews where tutor_id = v_tutor)
  where t.id = v_tutor;
  return null;
end;
$$;

create trigger refresh_tutor_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_tutor_rating();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.availability enable row level security;
alter table public.parent_links enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.favourites enable row level security;

create policy "profiles: read own, public tutors, related people"
on public.profiles for select using (
  id = auth.uid()
  or public.is_public_tutor(id)
  or public.is_parent_of(id)
  or public.is_tutor_of(id)
  or public.is_admin()
);
create policy "profiles: update own" on public.profiles for update
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "tutors: read approved or own" on public.tutors for select
using (status = 'approved' or id = auth.uid() or public.is_admin());
create policy "tutors: update own" on public.tutors for update
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "availability: read" on public.availability for select
using (public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin());
create policy "availability: tutor inserts own" on public.availability for insert
with check (tutor_id = auth.uid());
create policy "availability: tutor updates own" on public.availability for update
using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
create policy "availability: tutor deletes own" on public.availability for delete
using (tutor_id = auth.uid());

create policy "parent_links: read own" on public.parent_links for select
using (parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy "parent_links: parent removes" on public.parent_links for delete
using (parent_id = auth.uid());

create policy "bookings: participants read" on public.bookings for select using (
  student_id = auth.uid()
  or booked_by = auth.uid()
  or tutor_id = auth.uid()
  or public.is_parent_of(student_id)
  or public.is_admin()
);

create policy "reviews: public read" on public.reviews for select using (true);

create policy "subscriptions: read own" on public.subscriptions for select
using (user_id = auth.uid() or public.is_admin());

create policy "payments: read own" on public.payments for select
using (user_id = auth.uid() or public.is_admin());

create policy "favourites: read own" on public.favourites for select using (user_id = auth.uid());
create policy "favourites: add own" on public.favourites for insert with check (user_id = auth.uid());
create policy "favourites: remove own" on public.favourites for delete using (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant update on public.profiles, public.tutors to authenticated;
grant insert, update, delete on public.availability to authenticated;
grant insert, delete on public.favourites to authenticated;
grant delete on public.parent_links to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs — all state changes with business rules go through these.
-- ---------------------------------------------------------------------------

-- Platform-wide numbers for the landing page.
create or replace function public.public_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tutors', (select count(*) from tutors where status = 'approved'),
    'subjects', (select count(distinct s) from tutors, unnest(subjects) s where status = 'approved'),
    'avg_rating', (select round(avg(rating)::numeric, 1) from reviews),
    'reviews', (select count(*) from reviews),
    'sessions', (select count(*) from bookings where status = 'completed')
  );
$$;

-- Recent high-rated reviews with author first name, for social proof.
create or replace function public.featured_reviews(p_limit int default 6)
returns table (id uuid, rating int, comment text, author_name text, tutor_name text, tutor_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, split_part(a.full_name, ' ', 1), tp.full_name, r.tutor_id, r.created_at
  from reviews r
  join profiles a on a.id = r.author_id
  join profiles tp on tp.id = r.tutor_id
  join tutors t on t.id = r.tutor_id and t.status = 'approved'
  where r.rating >= 4 and length(r.comment) >= 20
  order by r.created_at desc
  limit least(p_limit, 20);
$$;

-- Reviews for a tutor's profile page.
create or replace function public.tutor_reviews(p_tutor uuid)
returns table (id uuid, rating int, comment text, author_name text, subject text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, split_part(a.full_name, ' ', 1), b.subject, r.created_at
  from reviews r
  join profiles a on a.id = r.author_id
  join bookings b on b.id = r.booking_id
  where r.tutor_id = p_tutor and public.is_public_tutor(p_tutor)
  order by r.created_at desc
  limit 50;
$$;

-- Occupied time ranges for a tutor (no details about who booked them).
create or replace function public.tutor_busy_slots(p_tutor uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at
  from bookings b
  where b.tutor_id = p_tutor
    and b.status <> 'cancelled'
    and not (b.status = 'pending_payment' and b.created_at < now() - interval '20 minutes')
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
  where tutor_id = p_tutor and status = 'pending_payment' and created_at < now() - interval '20 minutes';

  begin
    insert into bookings (tutor_id, student_id, booked_by, subject, starts_at, ends_at, duration_minutes, price, notes)
    values (
      p_tutor, p_student, v_uid, trim(p_subject), p_starts_at,
      p_starts_at + make_interval(mins => p_duration), p_duration,
      round(v_tutor.hourly_rate * p_duration / 60.0, 2),
      left(coalesce(p_notes, ''), 1000)
    )
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'Sorry, that slot was just taken. Please pick another time.';
  end;

  return v_booking;
end;
$$;

-- Test-mode checkout: records the payment and confirms the booking.
-- Swap the body for a call to your payment provider (e.g. a Stripe webhook) in production.
create or replace function public.pay_for_booking(p_booking uuid)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking bookings;
  v_amount numeric(10, 2);
  v_tutor_name text;
  v_payment payments;
begin
  select * into v_booking from bookings where id = p_booking and booked_by = v_uid for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'pending_payment' then raise exception 'This booking has already been processed'; end if;
  if v_booking.created_at < now() - interval '20 minutes' then
    update bookings set status = 'cancelled' where id = p_booking;
    raise exception 'This checkout expired. Please choose a time again.';
  end if;

  v_amount := round(v_booking.price * (1 - public.member_discount(v_uid)), 2);
  select full_name into v_tutor_name from profiles where id = v_booking.tutor_id;

  update bookings set status = 'confirmed', amount_paid = v_amount where id = p_booking;
  insert into payments (user_id, booking_id, kind, amount, description)
  values (v_uid, p_booking, 'session', v_amount, v_booking.subject || ' with ' || v_tutor_name)
  returning * into v_payment;
  return v_payment;
end;
$$;

-- Cancel or complete a booking, with role-appropriate rules.
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
    update payments set status = 'refunded' where booking_id = p_booking and status = 'succeeded';
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

create or replace function public.submit_review(p_booking uuid, p_rating int, p_comment text)
returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking bookings;
  v_review reviews;
begin
  select * into v_booking from bookings
  where id = p_booking and (student_id = v_uid or booked_by = v_uid);
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'completed' then raise exception 'You can review a session once it is completed'; end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;

  insert into reviews (booking_id, tutor_id, author_id, rating, comment)
  values (p_booking, v_booking.tutor_id, v_uid, p_rating, left(coalesce(trim(p_comment), ''), 2000))
  on conflict (booking_id) do update set rating = excluded.rating, comment = excluded.comment
  returning * into v_review;
  return v_review;
end;
$$;

-- Parent links a child's student account by email.
create or replace function public.link_child(p_email text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_child profiles;
begin
  if not exists (select 1 from profiles where id = v_uid and role = 'parent') then
    raise exception 'Only parent accounts can link a learner';
  end if;
  select p.* into v_child
  from auth.users u join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) and p.role = 'student';
  if not found then
    raise exception 'No student account uses that email yet. Ask your child to sign up as a student first.';
  end if;
  insert into parent_links (parent_id, student_id) values (v_uid, v_child.id) on conflict do nothing;
  return v_child;
end;
$$;

-- Test-mode subscription checkout.
create or replace function public.subscribe(p_plan text)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_price numeric(10, 2);
  v_sub subscriptions;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  v_price := case p_plan when 'plus' then 19 when 'family' then 39 end;
  if v_price is null then raise exception 'Unknown plan'; end if;

  insert into subscriptions (user_id, plan, status, current_period_end)
  values (v_uid, p_plan, 'active', now() + interval '1 month')
  on conflict (user_id) do update
    set plan = excluded.plan, status = 'active',
        current_period_end = greatest(subscriptions.current_period_end, now()) + interval '1 month'
  returning * into v_sub;

  insert into payments (user_id, kind, amount, description)
  values (v_uid, 'subscription', v_price, 'TutorHaven ' || initcap(p_plan) || ' — monthly');
  return v_sub;
end;
$$;

-- Stops renewal; benefits last until the end of the paid period.
create or replace function public.cancel_subscription()
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_sub subscriptions;
begin
  update subscriptions set status = 'canceled' where user_id = auth.uid() returning * into v_sub;
  if not found then raise exception 'No active subscription'; end if;
  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
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
    'active_subscriptions', (select count(*) from subscriptions where current_period_end > now())
  );
end;
$$;

create or replace function public.admin_list_users(p_search text default '', p_limit int default 50)
returns table (id uuid, email text, full_name text, role public.user_role, created_at timestamptz, tutor_status public.tutor_status)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at, t.status
    from profiles p
    join auth.users u on u.id = p.id
    left join tutors t on t.id = p.id
    where coalesce(p_search, '') = ''
       or p.full_name ilike '%' || p_search || '%'
       or u.email ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(p_limit, 200);
end;
$$;

create or replace function public.admin_set_tutor_status(p_tutor uuid, p_status public.tutor_status)
returns public.tutors
language plpgsql security definer set search_path = public as $$
declare
  v_tutor tutors;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update tutors set status = p_status where id = p_tutor returning * into v_tutor;
  if not found then raise exception 'Tutor not found'; end if;
  return v_tutor;
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update profiles set role = p_role where id = p_user returning * into v_profile;
  if not found then raise exception 'User not found'; end if;
  if p_role = 'tutor' then insert into tutors (id) values (p_user) on conflict do nothing; end if;
  return v_profile;
end;
$$;

-- Only signed-in users may call state-changing RPCs.
revoke execute on function
  public.create_booking(uuid, uuid, text, timestamptz, int, text),
  public.pay_for_booking(uuid),
  public.set_booking_status(uuid, public.booking_status),
  public.submit_review(uuid, int, text),
  public.link_child(text),
  public.subscribe(text),
  public.cancel_subscription(),
  public.admin_overview(),
  public.admin_list_users(text, int),
  public.admin_set_tutor_status(uuid, public.tutor_status),
  public.admin_set_role(uuid, public.user_role)
from public, anon;
grant execute on function
  public.create_booking(uuid, uuid, text, timestamptz, int, text),
  public.pay_for_booking(uuid),
  public.set_booking_status(uuid, public.booking_status),
  public.submit_review(uuid, int, text),
  public.link_child(text),
  public.subscribe(text),
  public.cancel_subscription(),
  public.admin_overview(),
  public.admin_list_users(text, int),
  public.admin_set_tutor_status(uuid, public.tutor_status),
  public.admin_set_role(uuid, public.user_role)
to authenticated;
