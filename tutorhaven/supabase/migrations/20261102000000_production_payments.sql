-- TutorHaven — production payments, subscriptions, messaging and admin operations.
-- Run after 20261030000000_init.sql and 20261101000000_naira_paystack_admin.sql.
--
-- * Removes simulated ("test mode") payments: money only moves through Paystack.
-- * Admin-managed subscription plans for learners (session discounts) and tutors (listing access).
-- * Subscriptions with pending / active / expired / cancelled status and renewal dates.
-- * Payment event log that doubles as webhook idempotency protection.
-- * Failed / abandoned payment handling, refund tracking, notifications, messages,
--   tutor qualification review, account suspension and a scheduled maintenance job.

-- ---------------------------------------------------------------------------
-- Account suspension
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_reason text not null default '';

create or replace function public.is_suspended(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select suspended_at is not null from profiles where id = p_user), false);
$$;

-- Users may edit their own profile, but never their role or suspension.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.created_at := old.created_at;
    new.suspended_at := old.suspended_at;
    new.suspended_reason := old.suspended_reason;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Subscription plans (managed in the admin panel)
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  audience text not null check (audience in ('learner', 'tutor')),
  name text not null check (length(trim(name)) between 2 and 60),
  description text not null default '',
  price numeric(12, 2) not null check (price >= 100),
  interval_months int not null default 1 check (interval_months between 1 and 12),
  session_discount numeric(4, 3) not null default 0 check (session_discount between 0 and 0.5),
  features text[] not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Carry over learner prices from the previous settings; add a default tutor plan.
do $$
declare
  s jsonb;
begin
  -- jsonb, so this still works when the old columns are already gone (re-runs).
  select to_jsonb(ps) into s from public.platform_settings ps where id = 1;
  insert into public.subscription_plans (code, audience, name, description, price, session_discount, features, sort_order)
  values
    ('plus', 'learner', 'Plus', 'For learners who book every week.', coalesce((s ->> 'plus_price')::numeric, 7500), coalesce((s ->> 'plus_discount')::numeric, 0.10),
      array['Money off every session', 'Free cancellation up to 2 hours before'], 1),
    ('family', 'learner', 'Family', 'One plan for every learner at home.', coalesce((s ->> 'family_price')::numeric, 15000), coalesce((s ->> 'family_discount')::numeric, 0.15),
      array['Money off sessions for all linked children', 'Free cancellation up to 2 hours before'], 2),
    ('tutor_pro', 'tutor', 'Tutor Pro', 'Get listed and take paid bookings.', 5000, 0,
      array['Listed in tutor search', 'Accept paid bookings', 'Earnings dashboard and messaging'], 1)
  on conflict (code) do nothing;
end $$;

alter table public.subscription_plans enable row level security;
drop policy if exists "plans: read" on public.subscription_plans;
create policy "plans: read" on public.subscription_plans for select using (is_active or public.is_admin());
grant select on public.subscription_plans to anon, authenticated;

-- Settings: prices now live on plans; simulated payments are removed.
alter table public.platform_settings add column if not exists tutor_subscription_required boolean not null default true;

-- ---------------------------------------------------------------------------
-- Subscriptions (one row per user per audience; history lives in payments)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.subscription_status as enum ('pending', 'active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'plan' and data_type = 'text') then
    alter table public.subscriptions rename to subscriptions_legacy;
  end if;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('learner', 'tutor')),
  plan_id uuid not null references public.subscription_plans (id),
  status public.subscription_status not null default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, audience)
);
create index if not exists subscriptions_period_idx on public.subscriptions (status, current_period_end);

-- Keep only legacy memberships that were genuinely paid through Paystack;
-- simulated ones stay in subscriptions_legacy for your records and grant nothing.
do $$ begin
  if to_regclass('public.subscriptions_legacy') is not null then
    insert into public.subscriptions (user_id, audience, plan_id, status, current_period_start, current_period_end)
    select l.user_id, 'learner', p.id,
           case when l.current_period_end > now() then 'active'::public.subscription_status else 'expired'::public.subscription_status end,
           l.current_period_end - interval '1 month', l.current_period_end
    from public.subscriptions_legacy l
    join public.subscription_plans p on p.code = l.plan
    where exists (
      select 1 from public.payments pay
      where pay.user_id = l.user_id and pay.kind = 'subscription' and pay.provider = 'paystack' and pay.status = 'succeeded'
    )
    on conflict (user_id, audience) do nothing;
    revoke all on public.subscriptions_legacy from anon, authenticated;
  end if;
end $$;

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions v2: read own" on public.subscriptions;
create policy "subscriptions v2: read own" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
grant select on public.subscriptions to authenticated;

create or replace function public.has_active_subscription(p_user uuid, p_audience text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = p_user and audience = p_audience
      and status in ('active', 'cancelled') and current_period_end > now()
  );
$$;

-- Session discount from the learner's active plan.
create or replace function public.member_discount(p_user uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.session_discount from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.user_id = p_user and s.audience = 'learner' and s.status in ('active', 'cancelled') and s.current_period_end > now()
  ), 0);
$$;

-- A tutor is publicly listed and bookable when approved, not suspended and
-- (if the platform requires it) holding an active tutor subscription.
create or replace function public.is_public_tutor(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tutors t join profiles p on p.id = t.id
    where t.id = p_id and t.status = 'approved' and p.suspended_at is null
      and (not (select tutor_subscription_required from platform_settings where id = 1)
           or public.has_active_subscription(t.id, 'tutor'))
  );
$$;

-- Learners (and their parents) can always see tutors they have booked.
create or replace function public.is_learner_of(p_tutor uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b
    where b.tutor_id = p_tutor and (b.student_id = auth.uid() or b.booked_by = auth.uid() or public.is_parent_of(b.student_id))
  );
$$;

drop policy if exists "profiles: read own, public tutors, related people" on public.profiles;
create policy "profiles: read own, public tutors, related people" on public.profiles for select using (
  id = auth.uid() or public.is_public_tutor(id) or public.is_learner_of(id)
  or public.is_parent_of(id) or public.is_tutor_of(id) or public.is_admin()
);
drop policy if exists "tutors: read approved or own" on public.tutors;
drop policy if exists "tutors: read listed, booked or own" on public.tutors;
create policy "tutors: read listed, booked or own" on public.tutors for select
using (public.is_public_tutor(id) or id = auth.uid() or public.is_learner_of(id) or public.is_admin());
drop policy if exists "availability: read" on public.availability;
create policy "availability: read" on public.availability for select
using (public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Tutor qualifications (reviewed by admins)
-- ---------------------------------------------------------------------------
create table if not exists public.tutor_qualifications (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  title text not null check (length(trim(title)) between 2 and 120),
  institution text not null default '',
  year int check (year between 1950 and 2100),
  document_path text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  review_note text not null default '',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists tutor_qualifications_tutor_idx on public.tutor_qualifications (tutor_id);
-- Deleting an admin account keeps their past reviews (reviewer becomes unknown).
alter table public.tutor_qualifications drop constraint if exists tutor_qualifications_reviewed_by_fkey;
alter table public.tutor_qualifications add constraint tutor_qualifications_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles (id) on delete set null;

-- Tutors manage their entries; any edit sends it back for review.
create or replace function public.protect_qualification_review()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.review_note := ''; new.reviewed_at := null; new.reviewed_by := null;
    else
      new.status := 'pending'; new.review_note := ''; new.reviewed_at := null; new.reviewed_by := null;
      new.tutor_id := old.tutor_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_qualification_review on public.tutor_qualifications;
create trigger protect_qualification_review before insert or update on public.tutor_qualifications
for each row execute function public.protect_qualification_review();

alter table public.tutor_qualifications enable row level security;
drop policy if exists "qualifications: read own" on public.tutor_qualifications;
create policy "qualifications: read own" on public.tutor_qualifications for select using (tutor_id = auth.uid() or public.is_admin());
drop policy if exists "qualifications: add own" on public.tutor_qualifications;
create policy "qualifications: add own" on public.tutor_qualifications for insert with check (tutor_id = auth.uid());
drop policy if exists "qualifications: edit own" on public.tutor_qualifications;
create policy "qualifications: edit own" on public.tutor_qualifications for update using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
drop policy if exists "qualifications: remove own" on public.tutor_qualifications;
create policy "qualifications: remove own" on public.tutor_qualifications for delete using (tutor_id = auth.uid());
grant select, insert, update, delete on public.tutor_qualifications to authenticated;

-- Verified qualifications are shown on public profiles (without the documents).
create or replace function public.tutor_public_qualifications(p_tutor uuid)
returns table (id uuid, title text, institution text, year int)
language sql stable security definer set search_path = public as $$
  select q.id, q.title, q.institution, q.year from tutor_qualifications q
  where q.tutor_id = p_tutor and q.status = 'verified' and public.is_public_tutor(p_tutor)
  order by q.year desc nulls last, q.created_at;
$$;

create or replace function public.verified_qualification_count(p_tutor uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from tutor_qualifications where tutor_id = p_tutor and status = 'verified';
$$;

-- Private storage for qualification documents: tutors write to their own folder; admins read.
do $$ begin
  insert into storage.buckets (id, name, public) values ('qualifications', 'qualifications', false) on conflict (id) do nothing;
  execute $p$drop policy if exists "qualifications: tutor uploads own" on storage.objects$p$;
  execute $p$create policy "qualifications: tutor uploads own" on storage.objects for insert to authenticated
    with check (bucket_id = 'qualifications' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$drop policy if exists "qualifications: owner or admin reads" on storage.objects$p$;
  execute $p$create policy "qualifications: owner or admin reads" on storage.objects for select to authenticated
    using (bucket_id = 'qualifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))$p$;
  execute $p$drop policy if exists "qualifications: owner deletes" on storage.objects$p$;
  execute $p$create policy "qualifications: owner deletes" on storage.objects for delete to authenticated
    using (bucket_id = 'qualifications' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
exception when others then
  -- Never let storage setup abort the migration; certificates are optional.
  raise notice 'Skipped the qualifications storage bucket (%). Tutors can still add qualifications without documents.', sqlerrm;
end $$;

-- Public directory: only listed tutors, with their verified qualification count.
drop view if exists public.tutor_directory;
create view public.tutor_directory with (security_invoker = true) as
select
  t.*,
  p.full_name,
  p.avatar_url,
  array_to_string(t.subjects, ' ') as subjects_text,
  public.verified_qualification_count(t.id) as verified_qualifications
from public.tutors t
join public.profiles p on p.id = t.id
where public.is_public_tutor(t.id);
grant select on public.tutor_directory to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payments: intents, attempts, refunds and an event log
-- ---------------------------------------------------------------------------
alter table public.payment_intents drop constraint if exists payment_intents_plan_check;
alter table public.payment_intents drop constraint if exists payment_intents_status_check;
alter table public.payment_intents add constraint payment_intents_status_check
  check (status in ('pending', 'succeeded', 'failed', 'abandoned'));
alter table public.payment_intents add column if not exists plan_id uuid references public.subscription_plans (id);
alter table public.payment_intents add column if not exists audience text check (audience in ('learner', 'tutor'));
alter table public.payment_intents add column if not exists paystack_status text;
alter table public.payment_intents add column if not exists failure_reason text not null default '';
alter table public.payment_intents add column if not exists updated_at timestamptz not null default now();

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('succeeded', 'refund_pending', 'refund_processing', 'refunded'));
alter table public.payments add column if not exists plan_id uuid references public.subscription_plans (id);
alter table public.payments add column if not exists audience text;
-- New payments only ever come from Paystack (the old default was 'test').
alter table public.payments alter column provider set default 'paystack';

-- Every payment-related event, for troubleshooting. idempotency_key makes
-- webhook processing exactly-once: a repeated delivery hits the unique key.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  reference text,
  event text not null,
  source text not null check (source in ('checkout', 'callback', 'verify', 'webhook', 'refund', 'maintenance', 'admin')),
  idempotency_key text unique,
  outcome text not null default '',
  error text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists payment_events_reference_idx on public.payment_events (reference, created_at desc);
alter table public.payment_events enable row level security;
drop policy if exists "payment_events: admin read" on public.payment_events;
create policy "payment_events: admin read" on public.payment_events for select using (public.is_admin());
grant select on public.payment_events to authenticated;

-- Returns false when the idempotency key was already recorded (duplicate delivery).
create or replace function public.log_payment_event(
  p_reference text, p_event text, p_source text, p_idempotency_key text default null,
  p_outcome text default '', p_error text default null, p_payload jsonb default '{}'
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into payment_events (reference, event, source, idempotency_key, outcome, error, payload)
  values (p_reference, p_event, p_source, p_idempotency_key, coalesce(p_outcome, ''), p_error, coalesce(p_payload, '{}'));
  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.payment_event_seen(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from payment_events where idempotency_key = p_key);
$$;

-- Pending checkouts from the last 24 hours, for re-checking with Paystack.
create or replace function public.pending_payment_references(p_limit int default 50)
returns setof text language sql stable security definer set search_path = public as $$
  select reference from payment_intents
  where status = 'pending' and created_at > now() - interval '24 hours' and created_at < now() - interval '2 minutes'
  order by created_at limit least(p_limit, 200);
$$;

-- ---------------------------------------------------------------------------
-- In-app notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select using (user_id = auth.uid());
grant select on public.notifications to authenticated;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text default '', p_link text default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, coalesce(p_body, ''), p_link);
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Messages between learners and tutors
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, read_at);
alter table public.messages enable row level security;
drop policy if exists "messages: participants read" on public.messages;
create policy "messages: participants read" on public.messages for select
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());
grant select on public.messages to authenticated;

create or replace function public.send_message(p_to uuid, p_body text)
returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_me profiles;
  v_them profiles;
  v_msg messages;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  select * into v_me from profiles where id = v_uid;
  select * into v_them from profiles where id = p_to;
  if v_me.suspended_at is not null then raise exception 'Your account is suspended'; end if;
  if not found or v_them.suspended_at is not null then raise exception 'This person can’t receive messages'; end if;
  if coalesce(length(trim(p_body)), 0) = 0 then raise exception 'Please write a message'; end if;
  -- Learners can start conversations with listed tutors (or tutors they’ve booked);
  -- tutors reply to people who contacted or booked them. Admins can message anyone.
  if not (
    v_me.role = 'admin'
    or (v_me.role in ('student', 'parent') and (public.is_public_tutor(p_to) or public.is_learner_of(p_to)))
    or (v_me.role = 'tutor' and (
          exists (select 1 from messages m where m.sender_id = p_to and m.recipient_id = v_uid)
          or exists (select 1 from bookings b where b.tutor_id = v_uid and (b.student_id = p_to or b.booked_by = p_to))))
    or exists (select 1 from messages m where m.sender_id = p_to and m.recipient_id = v_uid)
  ) then
    raise exception 'You can’t message this person yet';
  end if;
  if (select count(*) from messages where sender_id = v_uid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'You’re sending messages too quickly. Please wait a little.';
  end if;
  insert into messages (sender_id, recipient_id, body) values (v_uid, p_to, left(trim(p_body), 2000)) returning * into v_msg;
  return v_msg;
end;
$$;

create or replace function public.mark_conversation_read(p_other uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update messages set read_at = now() where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.my_conversations()
returns table (other_id uuid, other_name text, other_role public.user_role, last_body text, last_at timestamptz, last_from_me boolean, unread int)
language sql stable security definer set search_path = public as $$
  with mine as (
    select m.*, case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other
    from messages m where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ), last as (
    select distinct on (other) other, body, created_at, sender_id = auth.uid() as from_me from mine order by other, created_at desc
  )
  select l.other, p.full_name, p.role, l.body, l.created_at, l.from_me,
         (select count(*)::int from mine x where x.other = l.other and x.recipient_id = auth.uid() and x.read_at is null)
  from last l join profiles p on p.id = l.other
  order by l.created_at desc;
$$;

-- One conversation, oldest first (only ever between the caller and p_other).
create or replace function public.conversation_messages(p_other uuid, p_limit int default 200)
returns setof public.messages
language sql stable security definer set search_path = public as $$
  select * from (
    select * from messages
    where (sender_id = auth.uid() and recipient_id = p_other) or (sender_id = p_other and recipient_id = auth.uid())
    order by created_at desc limit least(p_limit, 500)
  ) m order by created_at;
$$;

-- Badge counts for the app header.
create or replace function public.my_unread_counts()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'messages', (select count(*) from messages where recipient_id = auth.uid() and read_at is null),
    'notifications', (select count(*) from notifications where user_id = auth.uid() and read_at is null)
  );
$$;

-- Name of someone you are allowed to message (for the conversation header).
create or replace function public.conversation_partner(p_other uuid)
returns table (id uuid, full_name text, role public.user_role)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role from profiles p
  where p.id = p_other and (
    public.is_public_tutor(p_other) or public.is_learner_of(p_other) or public.is_tutor_of(p_other) or public.is_admin()
    or exists (select 1 from messages m where (m.sender_id = p_other and m.recipient_id = auth.uid()) or (m.sender_id = auth.uid() and m.recipient_id = p_other))
  );
$$;

-- ---------------------------------------------------------------------------
-- Public numbers and reviews only count tutors who are actually listed
-- ---------------------------------------------------------------------------
create or replace function public.public_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tutors', (select count(*) from tutors t where public.is_public_tutor(t.id)),
    'subjects', (select count(distinct s) from tutors t, unnest(t.subjects) s where public.is_public_tutor(t.id)),
    'avg_rating', (select round(avg(rating)::numeric, 1) from reviews),
    'reviews', (select count(*) from reviews),
    'sessions', (select count(*) from bookings where status = 'completed')
  );
$$;

create or replace function public.featured_reviews(p_limit int default 6)
returns table (id uuid, rating int, comment text, author_name text, tutor_name text, tutor_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, split_part(a.full_name, ' ', 1), tp.full_name, r.tutor_id, r.created_at
  from reviews r
  join profiles a on a.id = r.author_id
  join profiles tp on tp.id = r.tutor_id
  where r.rating >= 4 and length(r.comment) >= 20 and public.is_public_tutor(r.tutor_id)
  order by r.created_at desc
  limit least(p_limit, 20);
$$;

-- ---------------------------------------------------------------------------
-- Bookings: listed tutors only, suspended accounts blocked
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_tutor uuid, p_student uuid, p_subject text, p_starts_at timestamptz, p_duration int, p_notes text default ''
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
  if public.is_suspended(v_uid) then raise exception 'Your account is suspended. Please contact support.'; end if;
  if p_student <> v_uid and not exists (select 1 from parent_links where parent_id = v_uid and student_id = p_student) then
    raise exception 'You can only book for yourself or a linked child';
  end if;
  if p_tutor = p_student then raise exception 'You cannot book a session with yourself'; end if;
  if not public.is_public_tutor(p_tutor) then raise exception 'This tutor is not taking bookings right now'; end if;
  select * into v_tutor from tutors where id = p_tutor;
  if p_duration not in (30, 45, 60, 90) then raise exception 'Invalid session length'; end if;
  if p_starts_at < now() + interval '1 hour' then raise exception 'Sessions must be booked at least an hour in advance'; end if;
  if p_starts_at > now() + interval '60 days' then raise exception 'Sessions can be booked up to 60 days ahead'; end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'Please choose a subject'; end if;

  v_local := p_starts_at at time zone v_tutor.timezone;
  v_minute := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  if v_minute % 15 <> 0 or not exists (
    select 1 from availability a
    where a.tutor_id = p_tutor and a.weekday = extract(dow from v_local)::int
      and a.start_minute <= v_minute and v_minute + p_duration <= a.end_minute
  ) then
    raise exception 'That time is outside the tutor''s availability';
  end if;

  update bookings set status = 'cancelled'
  where tutor_id = p_tutor and status = 'pending_payment' and public.hold_expired(created_at)
    and not exists (select 1 from payment_intents pi where pi.booking_id = bookings.id and pi.status in ('pending', 'succeeded') and not public.hold_expired(pi.created_at));

  begin
    insert into bookings (tutor_id, student_id, booked_by, subject, starts_at, ends_at, duration_minutes, price, notes)
    values (p_tutor, p_student, v_uid, trim(p_subject), p_starts_at, p_starts_at + make_interval(mins => p_duration), p_duration,
            round(v_tutor.hourly_rate * p_duration / 60.0), left(coalesce(p_notes, ''), 1000))
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'Sorry, that slot was just taken. Please pick another time.';
  end;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Checkout: the server prices everything; the client only says what it wants
-- ---------------------------------------------------------------------------
drop function if exists public.start_checkout(text, uuid, text);
create or replace function public.start_checkout(p_kind text, p_booking uuid default null, p_plan_id uuid default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles;
  v_email text;
  v_booking bookings;
  v_plan subscription_plans;
  v_amount numeric(12, 2);
  v_ref text;
  v_desc text;
  v_audience text;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  select * into v_profile from profiles where id = v_uid;
  if v_profile.suspended_at is not null then raise exception 'Your account is suspended. Please contact support.'; end if;
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
    select * into v_plan from subscription_plans where id = p_plan_id and is_active;
    if not found then raise exception 'This plan is not available'; end if;
    v_audience := v_plan.audience;
    if v_audience = 'tutor' and v_profile.role <> 'tutor' then raise exception 'This plan is for tutors'; end if;
    if v_audience = 'learner' and v_profile.role not in ('student', 'parent') then raise exception 'This plan is for students and parents'; end if;
    v_amount := v_plan.price;
    v_desc := 'TutorHaven ' || v_plan.name || ' — ' || v_plan.interval_months || ' month' || case when v_plan.interval_months > 1 then 's' else '' end;
    insert into subscriptions (user_id, audience, plan_id, status) values (v_uid, v_audience, v_plan.id, 'pending')
    on conflict (user_id, audience) do nothing;
  else
    raise exception 'Unknown checkout type';
  end if;

  v_ref := 'TH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into payment_intents (reference, user_id, kind, booking_id, plan_id, audience, amount)
  values (v_ref, v_uid, p_kind, case when p_kind = 'session' then p_booking end, v_plan.id, v_audience, v_amount);
  perform public.log_payment_event(v_ref, 'checkout.started', 'checkout', null, 'pending', null,
    json_build_object('kind', p_kind, 'amount', v_amount, 'booking_id', p_booking, 'plan_id', p_plan_id)::jsonb);
  return json_build_object('reference', v_ref, 'amount', v_amount, 'currency', 'NGN', 'email', v_email, 'description', v_desc);
end;
$$;

-- Confirms a payment Paystack has verified. Backend only (service role).
-- Idempotent per reference; refuses wrong amounts or currencies.
drop function if exists public.fulfill_payment(text, bigint, jsonb);
create or replace function public.fulfill_payment(p_reference text, p_amount_kobo bigint, p_currency text, p_payload jsonb default '{}')
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_intent payment_intents;
  v_booking bookings;
  v_plan subscription_plans;
  v_sub subscriptions;
  v_status text := 'succeeded';
  v_note text := '';
  v_tutor_name text;
  v_start timestamptz;
begin
  select * into v_intent from payment_intents where reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  if v_intent.status = 'succeeded' then
    return json_build_object('status', 'succeeded', 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'already', true);
  end if;
  -- A wrong currency or a short amount is never fulfilled. The attempt is recorded
  -- as failed (not raised, so the record survives) and flagged for an admin.
  if upper(coalesce(p_currency, '')) <> 'NGN' or coalesce(p_amount_kobo, 0) < round(v_intent.amount * 100) then
    v_note := case when upper(coalesce(p_currency, '')) <> 'NGN' then 'Paid in an unexpected currency (' || coalesce(p_currency, '?') || ')'
                   else 'Amount paid (₦' || to_char(coalesce(p_amount_kobo, 0) / 100.0, 'FM999,999,990.00') || ') did not match the amount due' end;
    update payment_intents set status = 'failed', failure_reason = v_note, paystack_status = 'success', provider_payload = p_payload, updated_at = now()
    where reference = p_reference;
    perform public.log_payment_event(p_reference, 'fulfil.rejected', 'verify', null, 'mismatch', v_note, p_payload);
    return json_build_object('status', 'failed', 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'reason', v_note, 'mismatch', true);
  end if;

  if v_intent.kind = 'session' then
    select * into v_booking from bookings where id = v_intent.booking_id for update;
    if not found then
      v_status := 'refund_pending'; v_note := 'Booking no longer exists';
    elsif v_booking.status in ('pending_payment', 'cancelled') then
      begin
        update bookings set status = 'confirmed', amount_paid = v_intent.amount where id = v_booking.id;
      exception when exclusion_violation then
        v_status := 'refund_pending'; v_note := 'Slot was taken before payment completed';
      end;
    else
      v_status := 'refund_pending'; v_note := 'Booking was already paid';
    end if;
    select full_name into v_tutor_name from profiles where id = v_booking.tutor_id;
    insert into payments (user_id, booking_id, kind, amount, currency, status, description, provider, provider_ref, note)
    values (v_intent.user_id, v_intent.booking_id, 'session', v_intent.amount, 'NGN', v_status,
            coalesce(v_booking.subject || ' with ' || v_tutor_name, 'Session'), 'paystack', p_reference, v_note);
    if v_status = 'succeeded' then
      perform public.notify(v_intent.user_id, 'booking_confirmed', 'Booking confirmed',
        v_booking.subject || ' with ' || v_tutor_name || ' on ' || to_char(v_booking.starts_at at time zone 'Africa/Lagos', 'Dy DD Mon, HH12:MI AM'), '/dashboard/sessions');
      perform public.notify(v_booking.tutor_id, 'new_booking', 'New paid booking',
        v_booking.subject || ' on ' || to_char(v_booking.starts_at at time zone 'Africa/Lagos', 'Dy DD Mon, HH12:MI AM'), '/dashboard/sessions');
    else
      perform public.notify(v_intent.user_id, 'refund_due', 'We couldn’t confirm your booking', v_note || '. Your payment will be refunded in full.', '/dashboard/billing');
    end if;
  else
    select * into v_plan from subscription_plans where id = v_intent.plan_id;
    select * into v_sub from subscriptions where user_id = v_intent.user_id and audience = v_intent.audience for update;
    v_start := case when v_sub.status in ('active', 'cancelled') and v_sub.current_period_end > now() then v_sub.current_period_end else now() end;
    insert into subscriptions (user_id, audience, plan_id, status, current_period_start, current_period_end)
    values (v_intent.user_id, v_intent.audience, v_plan.id, 'active', v_start, v_start + make_interval(months => v_plan.interval_months))
    on conflict (user_id, audience) do update set
      plan_id = excluded.plan_id, status = 'active',
      current_period_start = case when subscriptions.status in ('active', 'cancelled') and subscriptions.current_period_end > now()
                                  then subscriptions.current_period_start else excluded.current_period_start end,
      current_period_end = excluded.current_period_end,
      cancelled_at = null, reminder_sent_at = null, updated_at = now()
    returning * into v_sub;
    insert into payments (user_id, kind, amount, currency, status, description, provider, provider_ref, plan_id, audience)
    values (v_intent.user_id, 'subscription', v_intent.amount, 'NGN', 'succeeded',
            'TutorHaven ' || v_plan.name || ' — until ' || to_char(v_sub.current_period_end at time zone 'Africa/Lagos', 'DD Mon YYYY'),
            'paystack', p_reference, v_plan.id, v_intent.audience);
    perform public.notify(v_intent.user_id, 'subscription_active', v_plan.name || ' is active',
      'Your subscription runs until ' || to_char(v_sub.current_period_end at time zone 'Africa/Lagos', 'DD Mon YYYY') || '.',
      case when v_intent.audience = 'tutor' then '/dashboard/subscription' else '/dashboard/billing' end);
  end if;

  update payment_intents set status = 'succeeded', paid_at = now(), paystack_status = 'success', provider_payload = p_payload, updated_at = now()
  where reference = p_reference;
  perform public.log_payment_event(p_reference, 'payment.fulfilled', 'verify', null, v_status, nullif(v_note, ''), p_payload);
  return json_build_object('status', v_status, 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'plan_id', v_intent.plan_id, 'note', v_note);
end;
$$;

-- Records a failed or abandoned attempt (never overrides a success). Backend only.
create or replace function public.mark_payment_unsuccessful(p_reference text, p_status text, p_paystack_status text default null, p_reason text default '', p_payload jsonb default '{}')
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_intent payment_intents;
begin
  if p_status not in ('failed', 'abandoned') then raise exception 'Invalid status'; end if;
  select * into v_intent from payment_intents where reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  if v_intent.status = 'succeeded' then return json_build_object('status', 'succeeded', 'already', true); end if;
  update payment_intents set status = p_status, paystack_status = coalesce(p_paystack_status, paystack_status),
    failure_reason = coalesce(nullif(p_reason, ''), failure_reason), provider_payload = p_payload, updated_at = now()
  where reference = p_reference;
  perform public.log_payment_event(p_reference, 'payment.' || p_status, 'verify', null, p_status, nullif(p_reason, ''), p_payload);
  return json_build_object('status', p_status, 'kind', v_intent.kind, 'booking_id', v_intent.booking_id, 'reason', p_reason);
end;
$$;

-- Status of a reference for its owner (used while Paystack is still processing).
create or replace function public.payment_status(p_reference text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('status', status, 'kind', kind, 'booking_id', booking_id, 'plan_id', plan_id, 'reason', failure_reason)
  from payment_intents where reference = p_reference and (user_id = auth.uid() or public.is_admin());
$$;

-- Refunds: Paystack refunds are asynchronous. The refund function marks them
-- 'refund_processing'; the refund.processed / refund.failed webhooks finish them.
drop function if exists public.record_refund(uuid, text);
create or replace function public.record_refund(p_payment uuid, p_status text, p_note text default '')
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v payments;
begin
  if p_status not in ('refund_processing', 'refunded') then raise exception 'Invalid refund status'; end if;
  update payments set status = p_status,
    refunded_at = case when p_status = 'refunded' then now() else refunded_at end,
    note = trim(note || ' ' || coalesce(p_note, ''))
  where id = p_payment and status in ('succeeded', 'refund_pending', 'refund_processing')
  returning * into v;
  if not found then raise exception 'Payment not found or already refunded'; end if;
  perform public.log_payment_event(v.provider_ref, 'refund.' || p_status, 'refund', null, p_status, null, json_build_object('payment_id', p_payment)::jsonb);
  if p_status = 'refunded' then
    perform public.notify(v.user_id, 'refund', 'Refund issued', v.description || ' — ₦' || to_char(v.amount, 'FM999,999,990'), '/dashboard/billing');
  end if;
  return v;
end;
$$;

create or replace function public.apply_refund_webhook(p_reference text, p_success boolean, p_note text default '')
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_success then
    update payments set status = 'refunded', refunded_at = now(), note = trim(note || ' ' || coalesce(p_note, ''))
    where provider_ref = p_reference and status in ('refund_processing', 'refund_pending');
  else
    update payments set status = 'refund_pending', note = trim(note || ' Refund failed: ' || coalesce(p_note, ''))
    where provider_ref = p_reference and status = 'refund_processing';
  end if;
  get diagnostics n = row_count;
  if p_success and n > 0 then
    perform public.notify(p.user_id, 'refund', 'Refund issued', p.description, '/dashboard/billing') from payments p where p.provider_ref = p_reference;
  end if;
  return n;
end;
$$;

create or replace function public.admin_mark_refunded(p_payment uuid, p_note text default '')
returns public.payments
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.record_refund(p_payment, 'refunded', coalesce(nullif(p_note, ''), 'Refunded outside Paystack by admin'));
end;
$$;

-- Cancelling a paid session queues a full refund for an admin to issue.
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
  if not (v_is_tutor or v_is_learner_side or public.is_admin()) then raise exception 'Booking not found'; end if;

  if p_status = 'cancelled' then
    if v_booking.status not in ('pending_payment', 'confirmed') then raise exception 'Only upcoming sessions can be cancelled'; end if;
    if v_booking.status = 'confirmed' and not v_is_tutor and not public.is_admin() then
      v_window := case when public.member_discount(v_booking.booked_by) > 0 then interval '2 hours' else interval '24 hours' end;
      if v_booking.starts_at - now() < v_window then
        raise exception 'Sessions can be cancelled up to % before they start', case when v_window = interval '2 hours' then '2 hours' else '24 hours' end;
      end if;
    end if;
    update bookings set status = 'cancelled' where id = p_booking returning * into v_booking;
    update payments set status = 'refund_pending', note = trim(note || ' Cancelled ' || to_char(now(), 'YYYY-MM-DD'))
    where booking_id = p_booking and status = 'succeeded';
    perform public.notify(case when v_is_tutor then v_booking.booked_by else v_booking.tutor_id end, 'booking_cancelled', 'Session cancelled',
      v_booking.subject || ' on ' || to_char(v_booking.starts_at at time zone 'Africa/Lagos', 'Dy DD Mon, HH12:MI AM') || ' was cancelled.', '/dashboard/sessions');
  elsif p_status = 'completed' then
    if not (v_is_tutor or public.is_admin()) then raise exception 'Only the tutor can complete a session'; end if;
    if v_booking.status <> 'confirmed' then raise exception 'Only confirmed sessions can be completed'; end if;
    if v_booking.starts_at > now() then raise exception 'This session has not started yet'; end if;
    update bookings set status = 'completed' where id = p_booking returning * into v_booking;
    update tutors set sessions_completed = sessions_completed + 1 where id = v_booking.tutor_id;
    perform public.notify(v_booking.booked_by, 'session_completed', 'How was your session?', 'Leave a review for ' || v_booking.subject || '.', '/dashboard/sessions');
  else
    raise exception 'Unsupported status change';
  end if;
  return v_booking;
end;
$$;

-- Cancelling stops renewal reminders; access continues until the period ends.
drop function if exists public.cancel_subscription();
create or replace function public.cancel_subscription(p_audience text)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare v subscriptions;
begin
  update subscriptions set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where user_id = auth.uid() and audience = p_audience and status = 'active'
  returning * into v;
  if not found then raise exception 'No active subscription to cancel'; end if;
  return v;
end;
$$;

-- Simulated payments are gone: money only moves through Paystack.
drop function if exists public.pay_for_booking(uuid);
drop function if exists public.subscribe(text);
alter table public.platform_settings drop column if exists test_mode;
alter table public.platform_settings drop column if exists plus_price;
alter table public.platform_settings drop column if exists family_price;
alter table public.platform_settings drop column if exists plus_discount;
alter table public.platform_settings drop column if exists family_discount;

-- ---------------------------------------------------------------------------
-- Scheduled maintenance: expiries, renewal reminders, abandoned checkouts
-- ---------------------------------------------------------------------------
create or replace function public.run_maintenance()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_expired int := 0;
  v_reminded int := 0;
  v_abandoned int := 0;
  v_released int := 0;
  r record;
begin
  -- Renewal reminders 3 days before the end of a paid period.
  for r in
    select s.*, p.name as plan_name from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.status = 'active' and s.current_period_end between now() and now() + interval '3 days' and s.reminder_sent_at is null
  loop
    perform public.notify(r.user_id, 'renewal_reminder', r.plan_name || ' ends soon',
      'Your subscription ends on ' || to_char(r.current_period_end at time zone 'Africa/Lagos', 'DD Mon YYYY') || '. Renew to keep your benefits.',
      case when r.audience = 'tutor' then '/dashboard/subscription' else '/pricing' end);
    update subscriptions set reminder_sent_at = now() where id = r.id;
    v_reminded := v_reminded + 1;
  end loop;

  -- Expire lapsed subscriptions.
  for r in
    select s.*, p.name as plan_name from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.status in ('active', 'cancelled') and s.current_period_end <= now()
  loop
    update subscriptions set status = 'expired', updated_at = now() where id = r.id;
    perform public.notify(r.user_id, 'subscription_expired', r.plan_name || ' has expired',
      case when r.audience = 'tutor' then 'Your profile is hidden from search until you renew.' else 'Member discounts no longer apply. Renew any time.' end,
      case when r.audience = 'tutor' then '/dashboard/subscription' else '/pricing' end);
    v_expired := v_expired + 1;
  end loop;

  -- Checkouts nobody completed within 24 hours are abandoned.
  with a as (
    update payment_intents set status = 'abandoned', failure_reason = 'Checkout not completed within 24 hours', updated_at = now()
    where status = 'pending' and created_at < now() - interval '24 hours' returning reference
  )
  select count(*) into v_abandoned from a;

  -- Release unpaid booking holds.
  with b as (
    update bookings set status = 'cancelled'
    where status = 'pending_payment' and public.hold_expired(created_at)
      and not exists (select 1 from payment_intents pi where pi.booking_id = bookings.id and pi.status = 'succeeded')
    returning id
  )
  select count(*) into v_released from b;

  if v_expired + v_reminded + v_abandoned + v_released > 0 then
    perform public.log_payment_event(null, 'maintenance.run', 'maintenance', null, 'ok', null,
      json_build_object('expired', v_expired, 'reminded', v_reminded, 'abandoned', v_abandoned, 'released', v_released)::jsonb);
  end if;
  return json_build_object('expired', v_expired, 'reminded', v_reminded, 'abandoned', v_abandoned, 'released', v_released);
end;
$$;

-- Run every 15 minutes with pg_cron when available (Supabase: Database → Extensions → pg_cron).
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('tutorhaven-maintenance', '*/15 * * * *', 'select public.run_maintenance()');
exception when others then
  raise notice 'pg_cron not available (%). Enable it in Supabase, then run: select cron.schedule(''tutorhaven-maintenance'', ''*/15 * * * *'', ''select public.run_maintenance()'');', sqlerrm;
end $$;

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
    updated_at = now()
  where id = 1 returning * into v;
  return v;
end;
$$;

create or replace function public.admin_upsert_plan(p jsonb)
returns public.subscription_plans
language plpgsql security definer set search_path = public as $$
declare v subscription_plans;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p ? 'id' and nullif(p ->> 'id', '') is not null then
    update subscription_plans set
      name = coalesce(p ->> 'name', name),
      description = coalesce(p ->> 'description', description),
      price = coalesce((p ->> 'price')::numeric, price),
      interval_months = coalesce((p ->> 'interval_months')::int, interval_months),
      session_discount = case when audience = 'learner' then coalesce((p ->> 'session_discount')::numeric, session_discount) else 0 end,
      features = coalesce(array(select jsonb_array_elements_text(p -> 'features')), features),
      is_active = coalesce((p ->> 'is_active')::boolean, is_active),
      sort_order = coalesce((p ->> 'sort_order')::int, sort_order),
      updated_at = now()
    where id = (p ->> 'id')::uuid returning * into v;
    if not found then raise exception 'Plan not found'; end if;
  else
    insert into subscription_plans (code, audience, name, description, price, interval_months, session_discount, features, is_active, sort_order)
    values (p ->> 'code', p ->> 'audience', p ->> 'name', coalesce(p ->> 'description', ''), (p ->> 'price')::numeric,
            coalesce((p ->> 'interval_months')::int, 1),
            case when p ->> 'audience' = 'learner' then coalesce((p ->> 'session_discount')::numeric, 0) else 0 end,
            coalesce(array(select jsonb_array_elements_text(p -> 'features')), '{}'), coalesce((p ->> 'is_active')::boolean, true),
            coalesce((p ->> 'sort_order')::int, 0))
    returning * into v;
  end if;
  perform public.log_payment_event(null, 'plan.saved', 'admin', null, v.code, null, to_jsonb(v));
  return v;
end;
$$;

create or replace function public.admin_list_subscriptions(p_status text default '', p_audience text default '')
returns table (id uuid, user_id uuid, full_name text, email text, audience text, plan_name text, status public.subscription_status,
               current_period_start timestamptz, current_period_end timestamptz, cancelled_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select s.id, s.user_id, pr.full_name, u.email::text, s.audience, pl.name, s.status, s.current_period_start, s.current_period_end, s.cancelled_at, s.created_at
    from subscriptions s join profiles pr on pr.id = s.user_id join auth.users u on u.id = s.user_id join subscription_plans pl on pl.id = s.plan_id
    where (coalesce(p_status, '') = '' or s.status::text = p_status) and (coalesce(p_audience, '') = '' or s.audience = p_audience)
    order by s.updated_at desc limit 500;
end;
$$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspend boolean, p_reason text default '')
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v profiles;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_user = auth.uid() then raise exception 'You cannot suspend your own account'; end if;
  update profiles set suspended_at = case when p_suspend then now() else null end,
    suspended_reason = case when p_suspend then coalesce(p_reason, '') else '' end
  where id = p_user returning * into v;
  if not found then raise exception 'User not found'; end if;
  if p_suspend then
    -- Release their unpaid holds so slots free up.
    update bookings set status = 'cancelled' where (booked_by = p_user or tutor_id = p_user) and status = 'pending_payment';
  end if;
  return v;
end;
$$;

create or replace function public.admin_list_qualifications(p_status text default 'pending')
returns table (id uuid, tutor_id uuid, tutor_name text, title text, institution text, year int, document_path text, status text, review_note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select q.id, q.tutor_id, p.full_name, q.title, q.institution, q.year, q.document_path, q.status, q.review_note, q.created_at
    from tutor_qualifications q join profiles p on p.id = q.tutor_id
    where coalesce(p_status, '') = '' or q.status = p_status
    order by q.created_at;
end;
$$;

create or replace function public.admin_review_qualification(p_id uuid, p_status text, p_note text default '')
returns public.tutor_qualifications
language plpgsql security definer set search_path = public as $$
declare v tutor_qualifications;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('verified', 'rejected') then raise exception 'Invalid status'; end if;
  update tutor_qualifications set status = p_status, review_note = coalesce(p_note, ''), reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id returning * into v;
  if not found then raise exception 'Qualification not found'; end if;
  perform public.notify(v.tutor_id, 'qualification_' || p_status,
    case when p_status = 'verified' then 'Qualification verified' else 'Qualification not verified' end,
    v.title || case when coalesce(p_note, '') <> '' then ' — ' || p_note else '' end, '/dashboard/listing');
  return v;
end;
$$;

create or replace function public.admin_payment_events(p_reference text default '', p_limit int default 200)
returns setof public.payment_events
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query select * from payment_events
    where coalesce(p_reference, '') = '' or reference = p_reference
    order by created_at desc limit least(p_limit, 1000);
end;
$$;

-- Every checkout attempt (pending, succeeded, failed, abandoned) for troubleshooting.
create or replace function public.admin_list_payment_intents(p_status text default '', p_search text default '', p_limit int default 200)
returns table (reference text, user_id uuid, full_name text, email text, kind text, amount numeric, status text,
               paystack_status text, failure_reason text, booking_id uuid, plan_name text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select i.reference, i.user_id, pr.full_name, u.email::text, i.kind, i.amount, i.status, i.paystack_status, i.failure_reason,
           i.booking_id, pl.name, i.created_at, i.updated_at
    from payment_intents i
    join profiles pr on pr.id = i.user_id
    join auth.users u on u.id = i.user_id
    left join subscription_plans pl on pl.id = i.plan_id
    where (coalesce(p_status, '') = '' or i.status = p_status)
      and (coalesce(p_search, '') = '' or i.reference ilike '%' || p_search || '%'
           or pr.full_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%')
    order by i.created_at desc
    limit least(p_limit, 500);
end;
$$;

create or replace function public.admin_run_maintenance()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.run_maintenance();
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
    'bookings_by_status', (select coalesce(json_object_agg(status, n), '{}') from (select status, count(*) n from bookings group by status) x),
    'revenue_total', (select coalesce(sum(amount), 0) from payments where status = 'succeeded'),
    'revenue_sessions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'session'),
    'revenue_tutor_subscriptions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'subscription' and audience = 'tutor'),
    'revenue_learner_subscriptions', (select coalesce(sum(amount), 0) from payments where status = 'succeeded' and kind = 'subscription' and coalesce(audience, 'learner') = 'learner'),
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

drop function if exists public.admin_list_users(text, int);
create or replace function public.admin_list_users(p_search text default '', p_limit int default 100)
returns table (id uuid, email text, full_name text, role public.user_role, created_at timestamptz, tutor_status public.tutor_status,
               suspended_at timestamptz, suspended_reason text, subscription_status public.subscription_status, subscription_end timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at, t.status, p.suspended_at, p.suspended_reason, s.status, s.current_period_end
    from profiles p
    join auth.users u on u.id = p.id
    left join tutors t on t.id = p.id
    left join subscriptions s on s.user_id = p.id and s.audience = case when p.role = 'tutor' then 'tutor' else 'learner' end
    where coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(p_limit, 500);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
-- Internal helpers: used inside other functions, never called directly by apps.
revoke execute on function public.has_active_subscription(uuid, text), public.is_suspended(uuid) from public, anon, authenticated;

revoke execute on function
  public.fulfill_payment(text, bigint, text, jsonb),
  public.mark_payment_unsuccessful(text, text, text, text, jsonb),
  public.record_refund(uuid, text, text),
  public.apply_refund_webhook(text, boolean, text),
  public.log_payment_event(text, text, text, text, text, text, jsonb),
  public.payment_event_seen(text),
  public.pending_payment_references(int),
  public.notify(uuid, text, text, text, text),
  public.run_maintenance()
from public, anon, authenticated;
grant execute on function
  public.fulfill_payment(text, bigint, text, jsonb),
  public.mark_payment_unsuccessful(text, text, text, text, jsonb),
  public.record_refund(uuid, text, text),
  public.apply_refund_webhook(text, boolean, text),
  public.log_payment_event(text, text, text, text, text, text, jsonb),
  public.payment_event_seen(text),
  public.pending_payment_references(int),
  public.run_maintenance()
to service_role;

revoke execute on function
  public.start_checkout(text, uuid, uuid),
  public.payment_status(text),
  public.cancel_subscription(text),
  public.send_message(uuid, text),
  public.mark_conversation_read(uuid),
  public.my_conversations(),
  public.conversation_messages(uuid, int),
  public.my_unread_counts(),
  public.conversation_partner(uuid),
  public.mark_notifications_read(uuid[]),
  public.admin_update_settings(jsonb),
  public.admin_upsert_plan(jsonb),
  public.admin_list_subscriptions(text, text),
  public.admin_set_suspended(uuid, boolean, text),
  public.admin_list_qualifications(text),
  public.admin_review_qualification(uuid, text, text),
  public.admin_payment_events(text, int),
  public.admin_list_payment_intents(text, text, int),
  public.admin_run_maintenance(),
  public.admin_mark_refunded(uuid, text),
  public.admin_list_users(text, int)
from public, anon;
grant execute on function
  public.start_checkout(text, uuid, uuid),
  public.payment_status(text),
  public.cancel_subscription(text),
  public.send_message(uuid, text),
  public.mark_conversation_read(uuid),
  public.my_conversations(),
  public.conversation_messages(uuid, int),
  public.my_unread_counts(),
  public.conversation_partner(uuid),
  public.mark_notifications_read(uuid[]),
  public.admin_update_settings(jsonb),
  public.admin_upsert_plan(jsonb),
  public.admin_list_subscriptions(text, text),
  public.admin_set_suspended(uuid, boolean, text),
  public.admin_list_qualifications(text),
  public.admin_review_qualification(uuid, text, text),
  public.admin_payment_events(text, int),
  public.admin_list_payment_intents(text, text, int),
  public.admin_run_maintenance(),
  public.admin_mark_refunded(uuid, text),
  public.admin_list_users(text, int)
to authenticated;
