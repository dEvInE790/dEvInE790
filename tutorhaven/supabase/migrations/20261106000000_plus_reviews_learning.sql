-- TutorHaven Plus, verified reviews, tutor recommendations and learning data.
-- Run after 20261104000000_business_info.sql. Safe to run more than once.
--
--  * Plus = an active learner subscription (own, or a linked parent's). Prices stay
--    in subscription_plans and are set by admins; new plans start unpriced and off sale.
--  * Reviews: one per completed, Paystack-paid booking; four category scores;
--    tutor responses; reports; admin moderation with an audit log.
--  * Recommendations: a balanced quality score per tutor (tutor_scores) plus
--    personal relevance for Plus members.
--  * Learning data: lesson feedback from tutors, goals, an activity log and
--    monthly reports for families.
--  * AI assistant usage (the AI call itself happens in the ai-assistant Edge Function).
--  * Priority support requests for Plus members.

-- ===========================================================================
-- 1. Plans: annual billing, AI allowance, unpriced drafts
-- ===========================================================================
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'subscription_plans' and column_name = 'ai_monthly_limit') then
    alter table public.subscription_plans add column ai_monthly_limit int not null default 0 check (ai_monthly_limit between 0 and 10000);
    -- Existing learner plans become Plus plans with a starting allowance admins can change.
    update public.subscription_plans set ai_monthly_limit = 100 where audience = 'learner';
  end if;
end $$;

-- A plan may exist without a price, but it can't be on sale until it has one.
alter table public.subscription_plans alter column price drop not null;
alter table public.subscription_plans drop constraint if exists subscription_plans_price_check;
alter table public.subscription_plans add constraint subscription_plans_price_check check (price is null or price >= 100);
alter table public.subscription_plans drop constraint if exists subscription_plans_priced_when_active;
alter table public.subscription_plans add constraint subscription_plans_priced_when_active check (price is not null or not is_active);

-- Annual Plus: created off sale and without a price. Set the price in Admin → Plans & prices.
insert into public.subscription_plans (code, audience, name, description, price, interval_months, session_discount, features, is_active, sort_order, ai_monthly_limit)
select 'plus_annual', 'learner', 'Plus Annual', 'TutorHaven Plus for a full year.', null, 12,
       coalesce((select session_discount from public.subscription_plans where code = 'plus'), 0),
       coalesce((select features from public.subscription_plans where code = 'plus'), '{}'),
       false, 3, coalesce((select ai_monthly_limit from public.subscription_plans where code = 'plus'), 100)
where not exists (select 1 from public.subscription_plans where code = 'plus_annual');

-- Plus membership: an active learner subscription of your own, or of a linked parent.
create or replace function public.plus_subscription(p_user uuid)
returns public.subscriptions language sql stable security definer set search_path = public as $$
  select s.* from subscriptions s
  where s.audience = 'learner' and s.status in ('active', 'cancelled') and s.current_period_end > now()
    and (s.user_id = p_user or s.user_id in (select parent_id from parent_links where student_id = p_user))
  order by (s.user_id = p_user) desc, s.current_period_end desc
  limit 1;
$$;

create or replace function public.is_plus(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (public.plus_subscription(p_user)).id is not null;
$$;

-- Can the signed-in user act for this learner? (themselves, or a parent of the learner)
create or replace function public.can_manage_learner(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (p_student = auth.uid() or public.is_parent_of(p_student));
$$;

create or replace function public.require_plus(p_user uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_plus(p_user) then
    raise exception 'This is a TutorHaven Plus feature. Upgrade to Plus to use it.' using errcode = 'P0001';
  end if;
end;
$$;

-- ===========================================================================
-- 2. AI assistant: conversations and usage
-- ===========================================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  mode text not null default 'explain' check (mode in ('explain', 'simplify', 'steps', 'practice', 'revise')),
  subject text not null default '',
  content text not null check (length(content) between 1 and 20000),
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index if not exists ai_messages_user_month_idx on public.ai_messages (user_id, role, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
drop policy if exists "ai conversations: own" on public.ai_conversations;
create policy "ai conversations: own" on public.ai_conversations for select using (user_id = auth.uid());
drop policy if exists "ai messages: own" on public.ai_messages;
create policy "ai messages: own" on public.ai_messages for select using (user_id = auth.uid());
revoke insert, update, delete on public.ai_conversations, public.ai_messages from anon, authenticated;
grant select on public.ai_conversations, public.ai_messages to authenticated;

-- AI questions asked this calendar month (Lagos time).
create or replace function public.ai_questions_this_month(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from ai_messages
  where user_id = p_user and role = 'user'
    and created_at >= (date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos');
$$;

-- Membership and AI allowance for the signed-in user.
create or replace function public.my_membership()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sub subscriptions;
  v_plan subscription_plans;
  v_payer text;
begin
  if v_uid is null then return json_build_object('tier', 'standard'); end if;
  v_sub := public.plus_subscription(v_uid);
  if v_sub.id is null then
    return json_build_object('tier', 'standard', 'ai_limit', 0, 'ai_used', public.ai_questions_this_month(v_uid));
  end if;
  select * into v_plan from subscription_plans where id = v_sub.plan_id;
  if v_sub.user_id <> v_uid then select full_name into v_payer from profiles where id = v_sub.user_id; end if;
  return json_build_object(
    'tier', 'plus', 'source', case when v_sub.user_id = v_uid then 'own' else 'parent' end, 'paid_by', v_payer,
    'plan_id', v_plan.id, 'plan_name', v_plan.name, 'interval_months', v_plan.interval_months,
    'status', v_sub.status, 'current_period_end', v_sub.current_period_end,
    'ai_limit', v_plan.ai_monthly_limit, 'ai_used', public.ai_questions_this_month(v_uid));
end;
$$;

-- Backend only: checks Plus and the monthly allowance, then records the question.
-- Returns the conversation history the AI needs. Raises when not allowed.
create or replace function public.ai_begin(p_user uuid, p_conversation uuid, p_mode text, p_subject text, p_question text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
  v_sub subscriptions;
  v_limit int;
  v_used int;
  v_conv ai_conversations;
  v_msg ai_messages;
  v_history json;
begin
  select * into v_profile from profiles where id = p_user;
  if not found then raise exception 'Account not found'; end if;
  if v_profile.suspended_at is not null then raise exception 'Your account is suspended. Please contact support.'; end if;
  if v_profile.role not in ('student', 'parent') then raise exception 'The learning assistant is for students and parents'; end if;
  v_sub := public.plus_subscription(p_user);
  if v_sub.id is null then raise exception 'The AI Learning Assistant is a TutorHaven Plus feature. Upgrade to Plus to use it.'; end if;
  select ai_monthly_limit into v_limit from subscription_plans where id = v_sub.plan_id;
  -- Serialise requests per user so two tabs can't both use the last question.
  perform pg_advisory_xact_lock(hashtext('ai:' || p_user::text));
  v_used := public.ai_questions_this_month(p_user);
  if v_used >= coalesce(v_limit, 0) then
    raise exception 'You have used all % AI questions included in your plan this month. Your allowance resets on the 1st.', coalesce(v_limit, 0);
  end if;
  if length(trim(coalesce(p_question, ''))) < 2 then raise exception 'Please type a question'; end if;
  if length(p_question) > 4000 then raise exception 'Please keep questions under 4,000 characters'; end if;

  if p_conversation is null then
    insert into ai_conversations (user_id, title) values (p_user, left(regexp_replace(trim(p_question), '\s+', ' ', 'g'), 80)) returning * into v_conv;
  else
    select * into v_conv from ai_conversations where id = p_conversation and user_id = p_user for update;
    if not found then raise exception 'Conversation not found'; end if;
    update ai_conversations set updated_at = now() where id = v_conv.id;
  end if;

  select coalesce(json_agg(json_build_object('role', role, 'content', content) order by created_at), '[]') into v_history
  from (select role, content, created_at from ai_messages where conversation_id = v_conv.id order by created_at desc limit 20) h;

  insert into ai_messages (conversation_id, user_id, role, mode, subject, content)
  values (v_conv.id, p_user, 'user', coalesce(nullif(p_mode, ''), 'explain'), left(coalesce(p_subject, ''), 60), trim(p_question))
  returning * into v_msg;

  return json_build_object('conversation_id', v_conv.id, 'message_id', v_msg.id, 'history', v_history,
    'used', v_used + 1, 'limit', v_limit, 'grade_level', v_profile.grade_level, 'role', v_profile.role);
end;
$$;

-- Backend only: stores the AI's answer.
create or replace function public.ai_finish(p_message uuid, p_answer text, p_input_tokens int, p_output_tokens int)
returns json language plpgsql security definer set search_path = public as $$
declare v_q ai_messages; v_a ai_messages;
begin
  select * into v_q from ai_messages where id = p_message and role = 'user';
  if not found then raise exception 'Question not found'; end if;
  insert into ai_messages (conversation_id, user_id, role, mode, subject, content, input_tokens, output_tokens)
  values (v_q.conversation_id, v_q.user_id, 'assistant', v_q.mode, v_q.subject, p_answer, p_input_tokens, p_output_tokens)
  returning * into v_a;
  update ai_conversations set updated_at = now() where id = v_q.conversation_id;
  return json_build_object('id', v_a.id, 'conversation_id', v_a.conversation_id, 'content', v_a.content, 'created_at', v_a.created_at);
end;
$$;

-- Backend only: the AI call failed, so the question doesn't count against the allowance.
create or replace function public.ai_abort(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  delete from ai_messages where id = p_message and role = 'user' returning conversation_id into v_conv;
  delete from ai_conversations c where c.id = v_conv and not exists (select 1 from ai_messages m where m.conversation_id = c.id);
end;
$$;

create or replace function public.delete_ai_conversation(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from ai_conversations where id = p_id and user_id = auth.uid();
$$;

-- ===========================================================================
-- 3. Who cancelled, and when tutors were approved (for scores and sections)
-- ===========================================================================
alter table public.bookings add column if not exists cancelled_by uuid references public.profiles (id) on delete set null;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.tutors add column if not exists approved_at timestamptz;
update public.tutors set approved_at = created_at where status = 'approved' and approved_at is null;

create or replace function public.track_booking_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_by := auth.uid();
  end if;
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists track_booking_changes on public.bookings;
create trigger track_booking_changes before update on public.bookings
for each row execute function public.track_booking_changes();

create or replace function public.track_tutor_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists track_tutor_approval on public.tutors;
create trigger track_tutor_approval before update on public.tutors
for each row execute function public.track_tutor_approval();

-- Tutors may edit their listing; status, stats and approval date are system-managed.
create or replace function public.protect_tutor_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status := old.status;
    new.rating := old.rating;
    new.review_count := old.review_count;
    new.sessions_completed := old.sessions_completed;
    new.created_at := old.created_at;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- 4. Reviews: verified, one per booking, four categories, moderation
-- ===========================================================================
alter table public.reviews add column if not exists teaching smallint check (teaching between 1 and 5);
alter table public.reviews add column if not exists communication smallint check (communication between 1 and 5);
alter table public.reviews add column if not exists punctuality smallint check (punctuality between 1 and 5);
alter table public.reviews add column if not exists knowledge smallint check (knowledge between 1 and 5);
alter table public.reviews add column if not exists status text not null default 'published' check (status in ('published', 'hidden'));
alter table public.reviews add column if not exists hidden_reason text not null default '';
alter table public.reviews add column if not exists hidden_at timestamptz;
alter table public.reviews add column if not exists hidden_by uuid references public.profiles (id) on delete set null;
create index if not exists reviews_author_idx on public.reviews (author_id, created_at desc);

-- A review counts as verified when its session was completed and paid through Paystack.
create or replace function public.is_verified_review_booking(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b
    where b.id = p_booking and b.status = 'completed'
      and exists (select 1 from payments p where p.booking_id = b.id and p.kind = 'session' and p.provider = 'paystack' and p.status = 'succeeded')
  );
$$;

-- Reviews are read through the functions below; the table itself is private.
drop policy if exists "reviews: public read" on public.reviews;
drop policy if exists "reviews: author, tutor or admin" on public.reviews;
create policy "reviews: author, tutor or admin" on public.reviews for select
using (author_id = auth.uid() or tutor_id = auth.uid() or public.is_admin()
       or exists (select 1 from bookings b where b.id = booking_id and (b.student_id = auth.uid() or b.booked_by = auth.uid())));
revoke insert, update, delete on public.reviews from anon, authenticated;

-- Ratings: every reviewer counts once (the average of their own reviews), so
-- booking many sessions can't swing a tutor's average.
create or replace function public.refresh_tutor_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tutor uuid := coalesce(new.tutor_id, old.tutor_id);
begin
  update tutors t set
    rating = coalesce((
      select round(avg(a.avg_rating), 2) from (
        select avg(rating)::numeric as avg_rating from reviews where tutor_id = v_tutor and status = 'published' group by author_id
      ) a), 0),
    review_count = (select count(*) from reviews where tutor_id = v_tutor and status = 'published')
  where t.id = v_tutor;
  perform public.refresh_tutor_scores(v_tutor);
  return null;
end;
$$;

drop function if exists public.submit_review(uuid, int, text);
create or replace function public.submit_review(
  p_booking uuid, p_rating int, p_teaching int, p_communication int, p_punctuality int, p_knowledge int, p_comment text default ''
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking bookings;
  v_review reviews;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  if public.is_suspended(v_uid) then raise exception 'Your account is suspended. Please contact support.'; end if;
  select * into v_booking from bookings where id = p_booking for update;
  if not found or not (v_booking.student_id = v_uid or v_booking.booked_by = v_uid) then
    raise exception 'Only the learner or the parent who booked this session can review it';
  end if;
  if v_booking.tutor_id = v_uid then raise exception 'Tutors can''t review themselves'; end if;
  if v_booking.status <> 'completed' then raise exception 'You can review a session once it is completed'; end if;
  if not public.is_verified_review_booking(p_booking) then raise exception 'Only paid, completed sessions can be reviewed'; end if;
  if coalesce(v_booking.completed_at, v_booking.ends_at) < now() - interval '60 days' then
    raise exception 'Reviews can be left up to 60 days after a session';
  end if;
  if exists (select 1 from reviews where booking_id = p_booking) then
    raise exception 'This session has already been reviewed';
  end if;
  if p_rating is null or p_rating not between 1 and 5
     or p_teaching is null or p_teaching not between 1 and 5
     or p_communication is null or p_communication not between 1 and 5
     or p_punctuality is null or p_punctuality not between 1 and 5
     or p_knowledge is null or p_knowledge not between 1 and 5 then
    raise exception 'Please give every rating from 1 to 5 stars';
  end if;
  if length(coalesce(p_comment, '')) > 2000 then raise exception 'Please keep your review under 2,000 characters'; end if;

  insert into reviews (booking_id, tutor_id, author_id, rating, teaching, communication, punctuality, knowledge, comment)
  values (p_booking, v_booking.tutor_id, v_uid, p_rating, p_teaching, p_communication, p_punctuality, p_knowledge, trim(coalesce(p_comment, '')))
  returning * into v_review;
  perform public.notify(v_booking.tutor_id, 'new_review', 'New ' || p_rating || '-star review',
    v_booking.subject || ': you can reply to it from Reviews.', '/dashboard/reviews');
  return v_review;
end;
$$;

-- Tutor responses (one per review; the tutor can edit or remove their own).
create table if not exists public.review_responses (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  body text not null check (length(trim(body)) between 2 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.review_responses enable row level security;
drop policy if exists "review responses: tutor or admin" on public.review_responses;
create policy "review responses: tutor or admin" on public.review_responses for select
using (tutor_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.review_responses from anon, authenticated;
grant select on public.review_responses to authenticated;

create or replace function public.respond_to_review(p_review uuid, p_body text)
returns public.review_responses language plpgsql security definer set search_path = public as $$
declare v_review reviews; v_resp review_responses;
begin
  select * into v_review from reviews where id = p_review;
  if not found or v_review.tutor_id <> auth.uid() then raise exception 'Only the reviewed tutor can respond'; end if;
  if public.is_suspended(auth.uid()) then raise exception 'Your account is suspended. Please contact support.'; end if;
  if length(trim(coalesce(p_body, ''))) not between 2 and 1500 then raise exception 'Responses must be 2–1,500 characters'; end if;
  insert into review_responses (review_id, tutor_id, body) values (p_review, v_review.tutor_id, trim(p_body))
  on conflict (review_id) do update set body = excluded.body, updated_at = now()
  returning * into v_resp;
  if v_review.status = 'published' then
    perform public.notify(v_review.author_id, 'review_response', 'Your tutor replied to your review', left(trim(p_body), 140), '/dashboard/sessions');
  end if;
  return v_resp;
end;
$$;

create or replace function public.delete_review_response(p_review uuid)
returns void language sql security definer set search_path = public as $$
  delete from review_responses where review_id = p_review and tutor_id = auth.uid();
$$;

-- Reports from tutors, learners or anyone signed in.
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake', 'offensive', 'personal_info', 'not_about_tutor', 'conflict_of_interest', 'other')),
  details text not null default '' check (length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
drop policy if exists "review reports: reporter or admin" on public.review_reports;
create policy "review reports: reporter or admin" on public.review_reports for select
using (reporter_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.review_reports from anon, authenticated;
grant select on public.review_reports to authenticated;

create or replace function public.report_review(p_review uuid, p_reason text, p_details text default '')
returns public.review_reports language plpgsql security definer set search_path = public as $$
declare v_review reviews; v_rep review_reports;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into v_review from reviews where id = p_review;
  if not found or (v_review.status <> 'published' and v_review.tutor_id <> auth.uid()) then raise exception 'Review not found'; end if;
  if v_review.author_id = auth.uid() then raise exception 'You can''t report your own review'; end if;
  insert into review_reports (review_id, reporter_id, reason, details)
  values (p_review, auth.uid(), p_reason, left(trim(coalesce(p_details, '')), 1000))
  on conflict (review_id, reporter_id) do update set reason = excluded.reason, details = excluded.details, status = 'open', resolved_at = null, resolved_by = null
  returning * into v_rep;
  return v_rep;
end;
$$;

-- Moderation audit log.
create table if not exists public.review_moderation_log (
  id bigint generated always as identity primary key,
  review_id uuid references public.reviews (id) on delete set null,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('hide', 'restore', 'dismiss_reports', 'remove_response')),
  reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.review_moderation_log enable row level security;
drop policy if exists "review moderation log: admin" on public.review_moderation_log;
create policy "review moderation log: admin" on public.review_moderation_log for select using (public.is_admin());
revoke insert, update, delete on public.review_moderation_log from anon, authenticated;
grant select on public.review_moderation_log to authenticated;

create or replace function public.admin_moderate_review(p_review uuid, p_action text, p_reason text default '')
returns public.reviews language plpgsql security definer set search_path = public as $$
declare v reviews;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_action not in ('hide', 'restore', 'dismiss_reports', 'remove_response') then raise exception 'Unknown action'; end if;
  if p_action = 'hide' and length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Please give a reason for hiding this review'; end if;
  select * into v from reviews where id = p_review for update;
  if not found then raise exception 'Review not found'; end if;
  if p_action = 'hide' then
    update reviews set status = 'hidden', hidden_reason = trim(p_reason), hidden_at = now(), hidden_by = auth.uid() where id = p_review returning * into v;
    update review_reports set status = 'actioned', resolved_by = auth.uid(), resolved_at = now() where review_id = p_review and status = 'open';
  elsif p_action = 'restore' then
    update reviews set status = 'published', hidden_reason = '', hidden_at = null, hidden_by = null where id = p_review returning * into v;
  elsif p_action = 'dismiss_reports' then
    update review_reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now() where review_id = p_review and status = 'open';
  else
    delete from review_responses where review_id = p_review;
  end if;
  insert into review_moderation_log (review_id, admin_id, action, reason) values (p_review, auth.uid(), p_action, trim(coalesce(p_reason, '')));
  return v;
end;
$$;

-- Patterns worth a closer look. Each row is one signal on one review.
create or replace function public.review_signals()
returns table (review_id uuid, signal text, detail text)
language sql stable security definer set search_path = public as $$
  -- Several reviews for the same tutor within 24 hours.
  select r.id, 'burst', 'This tutor received ' || n.c || ' reviews within 24 hours'
  from reviews r
  cross join lateral (select count(*) c from reviews r2 where r2.tutor_id = r.tutor_id and abs(extract(epoch from r2.created_at - r.created_at)) <= 86400) n
  where n.c >= 3
  union all
  -- The same reviewer reviewing the same tutor 3+ times in 30 days.
  select r.id, 'repeat_reviewer', 'Same reviewer left ' || n.c || ' reviews for this tutor in 30 days'
  from reviews r
  cross join lateral (select count(*) c from reviews r2 where r2.tutor_id = r.tutor_id and r2.author_id = r.author_id and abs(extract(epoch from r2.created_at - r.created_at)) <= 30 * 86400) n
  where n.c >= 3
  union all
  -- An extreme rating from an account less than 7 days old.
  select r.id, 'new_account', 'Extreme rating from an account created ' || to_char(p.created_at at time zone 'Africa/Lagos', 'DD Mon') || ''
  from reviews r join profiles p on p.id = r.author_id
  where r.rating in (1, 5) and r.created_at - p.created_at < interval '7 days'
  union all
  -- Overall stars far from the category scores.
  select r.id, 'inconsistent', 'Overall ' || r.rating || '★ but categories average ' || round((r.teaching + r.communication + r.punctuality + r.knowledge) / 4.0, 1) || '★'
  from reviews r
  where r.teaching is not null and abs(r.rating - (r.teaching + r.communication + r.punctuality + r.knowledge) / 4.0) >= 2.5
  union all
  -- Several open reports.
  select r.id, 'reported', n.c || ' open report' || case when n.c > 1 then 's' else '' end
  from reviews r cross join lateral (select count(*) c from review_reports rr where rr.review_id = r.id and rr.status = 'open') n
  where n.c >= 1;
$$;

create or replace function public.admin_list_reviews(p_filter text default 'all', p_search text default '', p_limit int default 200)
returns table (
  id uuid, created_at timestamptz, status text, hidden_reason text, rating int, teaching smallint, communication smallint,
  punctuality smallint, knowledge smallint, comment text, subject text, tutor_id uuid, tutor_name text, author_id uuid,
  author_name text, verified boolean, open_reports int, report_reasons text[], signals text[], response text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  with sig as (select s.review_id, array_agg(distinct s.signal || ': ' || s.detail) sigs from public.review_signals() s group by s.review_id)
  select r.id, r.created_at, r.status, r.hidden_reason, r.rating, r.teaching, r.communication, r.punctuality, r.knowledge, r.comment,
         b.subject, r.tutor_id, tp.full_name, r.author_id, ap.full_name, public.is_verified_review_booking(r.booking_id),
         (select count(*)::int from review_reports rr where rr.review_id = r.id and rr.status = 'open'),
         (select coalesce(array_agg(rr.reason || coalesce(nullif(': ' || rr.details, ': '), '')), '{}') from review_reports rr where rr.review_id = r.id and rr.status = 'open'),
         coalesce(sig.sigs, '{}'), resp.body
  from reviews r
  join bookings b on b.id = r.booking_id
  join profiles tp on tp.id = r.tutor_id
  join profiles ap on ap.id = r.author_id
  left join sig on sig.review_id = r.id
  left join review_responses resp on resp.review_id = r.id
  where (p_filter = 'all'
      or (p_filter = 'reported' and exists (select 1 from review_reports rr where rr.review_id = r.id and rr.status = 'open'))
      or (p_filter = 'hidden' and r.status = 'hidden')
      or (p_filter = 'flagged' and sig.sigs is not null))
    and (coalesce(p_search, '') = '' or tp.full_name ilike '%' || p_search || '%' or ap.full_name ilike '%' || p_search || '%' or r.comment ilike '%' || p_search || '%')
  order by r.created_at desc
  limit least(p_limit, 500);
end;
$$;

create or replace function public.admin_review_log(p_review uuid default null, p_limit int default 200)
returns table (id bigint, review_id uuid, admin_name text, action text, reason text, created_at timestamptz, tutor_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select l.id, l.review_id, coalesce(a.full_name, 'Removed admin'), l.action, l.reason, l.created_at, tp.full_name
  from review_moderation_log l
  left join profiles a on a.id = l.admin_id
  left join reviews r on r.id = l.review_id
  left join profiles tp on tp.id = r.tutor_id
  where p_review is null or l.review_id = p_review
  order by l.created_at desc
  limit least(p_limit, 500);
end;
$$;

-- Public review list for a tutor profile (first names only; hidden reviews excluded).
drop function if exists public.tutor_reviews(uuid);
create or replace function public.tutor_reviews(p_tutor uuid, p_limit int default 50)
returns table (
  id uuid, rating int, teaching smallint, communication smallint, punctuality smallint, knowledge smallint, comment text,
  author_name text, subject text, created_at timestamptz, verified boolean, response text, response_at timestamptz
) language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.teaching, r.communication, r.punctuality, r.knowledge, r.comment, split_part(a.full_name, ' ', 1), b.subject,
         r.created_at, public.is_verified_review_booking(r.booking_id), resp.body, resp.updated_at
  from reviews r
  join profiles a on a.id = r.author_id
  join bookings b on b.id = r.booking_id
  left join review_responses resp on resp.review_id = r.id
  where r.tutor_id = p_tutor and r.status = 'published' and (public.is_public_tutor(p_tutor) or public.is_learner_of(p_tutor) or p_tutor = auth.uid() or public.is_admin())
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.tutor_review_summary(p_tutor uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'average', (select rating from tutors where id = p_tutor),
    'count', count(*),
    'verified', count(*) filter (where public.is_verified_review_booking(r.booking_id)),
    'reviewers', count(distinct r.author_id),
    'teaching', round(avg(r.teaching), 1),
    'communication', round(avg(r.communication), 1),
    'punctuality', round(avg(r.punctuality), 1),
    'knowledge', round(avg(r.knowledge), 1),
    'distribution', json_build_object(
      '5', count(*) filter (where r.rating = 5), '4', count(*) filter (where r.rating = 4), '3', count(*) filter (where r.rating = 3),
      '2', count(*) filter (where r.rating = 2), '1', count(*) filter (where r.rating = 1)))
  from reviews r
  where r.tutor_id = p_tutor and r.status = 'published'
    and (public.is_public_tutor(p_tutor) or public.is_learner_of(p_tutor) or p_tutor = auth.uid() or public.is_admin());
$$;

-- Reviews about the signed-in tutor, including hidden ones (with the reason), for replying.
create or replace function public.my_tutor_reviews()
returns table (
  id uuid, rating int, teaching smallint, communication smallint, punctuality smallint, knowledge smallint, comment text,
  author_name text, subject text, created_at timestamptz, verified boolean, status text, hidden_reason text, response text, reported boolean
) language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.teaching, r.communication, r.punctuality, r.knowledge, r.comment, split_part(a.full_name, ' ', 1), b.subject,
         r.created_at, public.is_verified_review_booking(r.booking_id), r.status, r.hidden_reason, resp.body,
         exists (select 1 from review_reports rr where rr.review_id = r.id and rr.reporter_id = auth.uid() and rr.status = 'open')
  from reviews r
  join profiles a on a.id = r.author_id
  join bookings b on b.id = r.booking_id
  left join review_responses resp on resp.review_id = r.id
  where r.tutor_id = auth.uid()
  order by r.created_at desc;
$$;

create or replace function public.featured_reviews(p_limit int default 6)
returns table (id uuid, rating int, comment text, author_name text, tutor_name text, tutor_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, split_part(a.full_name, ' ', 1), tp.full_name, r.tutor_id, r.created_at
  from reviews r
  join profiles a on a.id = r.author_id
  join profiles tp on tp.id = r.tutor_id
  where r.status = 'published' and r.rating >= 4 and length(r.comment) >= 20 and public.is_public_tutor(r.tutor_id)
    and public.is_verified_review_booking(r.booking_id)
  order by r.created_at desc
  limit least(p_limit, 20);
$$;

create or replace function public.public_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tutors', (select count(*) from tutors t where public.is_public_tutor(t.id)),
    'subjects', (select count(distinct s) from tutors t, unnest(t.subjects) s where public.is_public_tutor(t.id)),
    'avg_rating', (select round(avg(rating)::numeric, 1) from reviews where status = 'published'),
    'reviews', (select count(*) from reviews where status = 'published'),
    'sessions', (select count(*) from bookings where status = 'completed')
  );
$$;

-- ===========================================================================
-- 5. Lesson feedback from tutors
-- ===========================================================================
create table if not exists public.lesson_feedback (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default '',
  summary text not null check (length(trim(summary)) between 10 and 2000),
  strengths text not null default '' check (length(strengths) <= 1000),
  improvements text not null default '' check (length(improvements) <= 1000),
  next_steps text not null default '' check (length(next_steps) <= 1000),
  progress smallint check (progress between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_feedback_student_idx on public.lesson_feedback (student_id, created_at desc);
alter table public.lesson_feedback enable row level security;
drop policy if exists "lesson feedback: tutor, learner, parents, admin" on public.lesson_feedback;
create policy "lesson feedback: tutor, learner, parents, admin" on public.lesson_feedback for select
using (tutor_id = auth.uid() or student_id = auth.uid() or public.is_parent_of(student_id) or public.is_admin());
revoke insert, update, delete on public.lesson_feedback from anon, authenticated;
grant select on public.lesson_feedback to authenticated;

create or replace function public.save_lesson_feedback(
  p_booking uuid, p_summary text, p_strengths text default '', p_improvements text default '', p_next_steps text default '', p_progress int default null
) returns public.lesson_feedback language plpgsql security definer set search_path = public as $$
declare v_booking bookings; v lesson_feedback; v_new boolean;
begin
  select * into v_booking from bookings where id = p_booking;
  if not found or v_booking.tutor_id <> auth.uid() then raise exception 'Only the session''s tutor can add feedback'; end if;
  if v_booking.status <> 'completed' then raise exception 'Mark the session as completed first'; end if;
  if length(trim(coalesce(p_summary, ''))) < 10 then raise exception 'Please write a short summary of the lesson (at least 10 characters)'; end if;
  if p_progress is not null and p_progress not between 1 and 5 then raise exception 'Progress must be 1–5'; end if;
  v_new := not exists (select 1 from lesson_feedback where booking_id = p_booking);
  insert into lesson_feedback (booking_id, tutor_id, student_id, subject, summary, strengths, improvements, next_steps, progress)
  values (p_booking, v_booking.tutor_id, v_booking.student_id, v_booking.subject, trim(p_summary), trim(coalesce(p_strengths, '')),
          trim(coalesce(p_improvements, '')), trim(coalesce(p_next_steps, '')), p_progress)
  on conflict (booking_id) do update set summary = excluded.summary, strengths = excluded.strengths, improvements = excluded.improvements,
    next_steps = excluded.next_steps, progress = excluded.progress, updated_at = now()
  returning * into v;
  if v_new then
    perform public.notify(v_booking.student_id, 'lesson_feedback', 'New feedback from your tutor', v_booking.subject || ': ' || left(trim(p_summary), 120), '/dashboard/sessions');
    if v_booking.booked_by <> v_booking.student_id then
      perform public.notify(v_booking.booked_by, 'lesson_feedback', 'New lesson feedback', v_booking.subject || ': ' || left(trim(p_summary), 120), '/dashboard/sessions');
    end if;
  end if;
  return v;
end;
$$;

-- ===========================================================================
-- 6. Learning goals
-- ===========================================================================
create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null check (length(trim(title)) between 3 and 120),
  subject text not null default '',
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learning_goals_student_idx on public.learning_goals (student_id, status);
alter table public.learning_goals enable row level security;
drop policy if exists "learning goals: learner, parents, tutors, admin" on public.learning_goals;
create policy "learning goals: learner, parents, tutors, admin" on public.learning_goals for select
using (student_id = auth.uid() or public.is_parent_of(student_id) or public.is_tutor_of(student_id) or public.is_admin());
revoke insert, update, delete on public.learning_goals from anon, authenticated;
grant select on public.learning_goals to authenticated;

create or replace function public.save_learning_goal(p jsonb)
returns public.learning_goals language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := coalesce(nullif(p ->> 'student_id', '')::uuid, auth.uid());
  v learning_goals;
  v_status text := coalesce(nullif(p ->> 'status', ''), 'active');
begin
  if not public.can_manage_learner(v_student) then raise exception 'You can only manage goals for yourself or your linked children'; end if;
  perform public.require_plus(v_student);
  if v_status not in ('active', 'achieved', 'dropped') then raise exception 'Unknown goal status'; end if;
  if nullif(p ->> 'id', '') is null then
    if (select count(*) from learning_goals where student_id = v_student and status = 'active') >= 20 then raise exception 'You can track up to 20 active goals'; end if;
    insert into learning_goals (student_id, created_by, title, subject, target_date, progress)
    values (v_student, auth.uid(), trim(p ->> 'title'), left(coalesce(p ->> 'subject', ''), 60), nullif(p ->> 'target_date', '')::date,
            least(greatest(coalesce((p ->> 'progress')::int, 0), 0), 100))
    returning * into v;
  else
    update learning_goals set
      title = coalesce(nullif(trim(p ->> 'title'), ''), title),
      subject = coalesce(p ->> 'subject', subject),
      target_date = case when p ? 'target_date' then nullif(p ->> 'target_date', '')::date else target_date end,
      progress = case when v_status = 'achieved' then 100 else least(greatest(coalesce((p ->> 'progress')::int, progress), 0), 100) end,
      status = v_status,
      achieved_at = case when v_status = 'achieved' then coalesce(achieved_at, now()) else null end,
      updated_at = now()
    where id = (p ->> 'id')::uuid and student_id = v_student
    returning * into v;
    if not found then raise exception 'Goal not found'; end if;
  end if;
  return v;
end;
$$;

create or replace function public.delete_learning_goal(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from learning_goals where id = p_id and public.can_manage_learner(student_id);
  if not found then raise exception 'Goal not found'; end if;
end;
$$;

-- ===========================================================================
-- 7. Learning activity log (written by triggers, never by users)
-- ===========================================================================
create table if not exists public.learning_activity (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson_completed', 'feedback_received', 'goal_created', 'goal_achieved', 'ai_question', 'review_written')),
  subject text not null default '',
  detail text not null default '',
  minutes int not null default 0,
  ref_id uuid,
  occurred_at timestamptz not null default now(),
  unique (kind, ref_id)
);
create index if not exists learning_activity_student_idx on public.learning_activity (student_id, occurred_at desc);
alter table public.learning_activity enable row level security;
drop policy if exists "learning activity: learner, parents, admin" on public.learning_activity;
create policy "learning activity: learner, parents, admin" on public.learning_activity for select
using (student_id = auth.uid() or public.is_parent_of(student_id) or public.is_admin());
revoke insert, update, delete on public.learning_activity from anon, authenticated;
grant select on public.learning_activity to authenticated;

create or replace function public.log_learning_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'bookings' then
    if new.status = 'completed' and old.status is distinct from 'completed' then
      insert into learning_activity (student_id, kind, subject, detail, minutes, ref_id, occurred_at)
      values (new.student_id, 'lesson_completed', new.subject, '', new.duration_minutes, new.id, coalesce(new.completed_at, now()))
      on conflict (kind, ref_id) do nothing;
    end if;
  elsif tg_table_name = 'lesson_feedback' then
    insert into learning_activity (student_id, kind, subject, detail, ref_id)
    values (new.student_id, 'feedback_received', new.subject, left(new.summary, 200), new.booking_id)
    on conflict (kind, ref_id) do update set detail = excluded.detail;
  elsif tg_table_name = 'learning_goals' then
    if tg_op = 'INSERT' then
      insert into learning_activity (student_id, kind, subject, detail, ref_id) values (new.student_id, 'goal_created', new.subject, new.title, new.id)
      on conflict (kind, ref_id) do nothing;
    elsif new.status = 'achieved' and old.status is distinct from 'achieved' then
      insert into learning_activity (student_id, kind, subject, detail, ref_id) values (new.student_id, 'goal_achieved', new.subject, new.title, new.id)
      on conflict (kind, ref_id) do nothing;
    end if;
  elsif tg_table_name = 'ai_messages' then
    if new.role = 'user' and exists (select 1 from profiles where id = new.user_id and role = 'student') then
      insert into learning_activity (student_id, kind, subject, detail, ref_id, occurred_at)
      values (new.user_id, 'ai_question', new.subject, new.mode, new.id, new.created_at)
      on conflict (kind, ref_id) do nothing;
    end if;
  elsif tg_table_name = 'reviews' then
    insert into learning_activity (student_id, kind, subject, detail, ref_id)
    select b.student_id, 'review_written', b.subject, new.rating || '★', new.id from bookings b where b.id = new.booking_id
    on conflict (kind, ref_id) do nothing;
  end if;
  return null;
end;
$$;

drop trigger if exists log_learning_activity on public.bookings;
create trigger log_learning_activity after update on public.bookings for each row execute function public.log_learning_activity();
drop trigger if exists log_learning_activity on public.lesson_feedback;
create trigger log_learning_activity after insert or update on public.lesson_feedback for each row execute function public.log_learning_activity();
drop trigger if exists log_learning_activity on public.learning_goals;
create trigger log_learning_activity after insert or update on public.learning_goals for each row execute function public.log_learning_activity();
drop trigger if exists log_learning_activity on public.ai_messages;
create trigger log_learning_activity after insert on public.ai_messages for each row execute function public.log_learning_activity();
drop trigger if exists log_learning_activity on public.reviews;
create trigger log_learning_activity after insert on public.reviews for each row execute function public.log_learning_activity();

-- An AI question that is refunded (the AI call failed) leaves no activity behind.
create or replace function public.forget_ai_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from learning_activity where kind = 'ai_question' and ref_id = old.id;
  return null;
end;
$$;
drop trigger if exists forget_ai_activity on public.ai_messages;
create trigger forget_ai_activity after delete on public.ai_messages for each row execute function public.forget_ai_activity();

-- ===========================================================================
-- 8. Analytics, monthly reports and the family dashboard (Plus)
-- ===========================================================================
create or replace function public.learning_snapshot(p_student uuid, p_from timestamptz, p_to timestamptz)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'lessons_completed', (select count(*) from bookings where student_id = p_student and status = 'completed' and starts_at >= p_from and starts_at < p_to),
    'minutes', (select coalesce(sum(duration_minutes), 0) from bookings where student_id = p_student and status = 'completed' and starts_at >= p_from and starts_at < p_to),
    'lessons_cancelled', (select count(*) from bookings where student_id = p_student and status = 'cancelled' and amount_paid is not null and starts_at >= p_from and starts_at < p_to),
    'upcoming', (select count(*) from bookings where student_id = p_student and status = 'confirmed' and starts_at >= greatest(now(), p_from) and starts_at < p_to),
    'subjects', (select coalesce(json_agg(json_build_object('subject', subject, 'lessons', n, 'minutes', m) order by m desc), '[]') from (
        select subject, count(*) n, sum(duration_minutes) m from bookings
        where student_id = p_student and status = 'completed' and starts_at >= p_from and starts_at < p_to group by subject) s),
    'tutors', (select coalesce(json_agg(json_build_object('id', t.tutor_id, 'name', p.full_name, 'lessons', t.n) order by t.n desc), '[]') from (
        select tutor_id, count(*) n from bookings where student_id = p_student and status = 'completed' and starts_at >= p_from and starts_at < p_to group by tutor_id) t
        join profiles p on p.id = t.tutor_id),
    'feedback', (select coalesce(json_agg(json_build_object('date', b.starts_at, 'subject', f.subject, 'tutor', p.full_name, 'summary', f.summary,
          'strengths', f.strengths, 'improvements', f.improvements, 'next_steps', f.next_steps, 'progress', f.progress) order by b.starts_at desc), '[]')
        from lesson_feedback f join bookings b on b.id = f.booking_id join profiles p on p.id = f.tutor_id
        where f.student_id = p_student and b.starts_at >= p_from and b.starts_at < p_to),
    'average_progress', (select round(avg(f.progress), 1) from lesson_feedback f join bookings b on b.id = f.booking_id
        where f.student_id = p_student and b.starts_at >= p_from and b.starts_at < p_to),
    'goals', (select coalesce(json_agg(json_build_object('id', id, 'title', title, 'subject', subject, 'status', status, 'progress', progress,
          'target_date', target_date, 'achieved_at', achieved_at) order by status, created_at), '[]')
        from learning_goals where student_id = p_student and (status = 'active' or (achieved_at >= p_from and achieved_at < p_to) or (created_at >= p_from and created_at < p_to))),
    'activity', (select coalesce(json_object_agg(kind, n), '{}') from (
        select kind, count(*) n from learning_activity where student_id = p_student and occurred_at >= p_from and occurred_at < p_to group by kind) a),
    'active_days', (select count(distinct (occurred_at at time zone 'Africa/Lagos')::date) from learning_activity where student_id = p_student and occurred_at >= p_from and occurred_at < p_to)
  );
$$;

-- Plus analytics for a learner (the learner or a linked parent).
create or replace function public.learning_analytics(p_student uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_profile profiles;
  v_monthly json;
  v_weekly json;
  v_recs json;
begin
  if not public.can_manage_learner(v_student) then raise exception 'You can only see analytics for yourself or your linked children'; end if;
  perform public.require_plus(v_student);
  select * into v_profile from profiles where id = v_student;

  select coalesce(json_agg(json_build_object('month', to_char(m, 'YYYY-MM'), 'lessons', coalesce(x.n, 0), 'minutes', coalesce(x.mins, 0)) order by m), '[]')
  into v_monthly
  from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
  left join lateral (
    select count(*) n, sum(duration_minutes) mins from bookings
    where student_id = v_student and status = 'completed' and starts_at >= m and starts_at < m + interval '1 month'
  ) x on true;

  select coalesce(json_agg(json_build_object('week', to_char(w, 'YYYY-MM-DD'), 'activities', coalesce(x.n, 0)) order by w), '[]')
  into v_weekly
  from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') w
  left join lateral (select count(*) n from learning_activity where student_id = v_student and occurred_at >= w and occurred_at < w + interval '1 week') x on true;

  -- Recommendations: the latest next steps from each subject's tutor feedback.
  select coalesce(json_agg(json_build_object('subject', subject, 'tutor', tutor, 'text', next_steps, 'date', created_at) order by created_at desc), '[]')
  into v_recs
  from (
    select distinct on (f.subject) f.subject, p.full_name tutor, f.next_steps, f.created_at
    from lesson_feedback f join profiles p on p.id = f.tutor_id
    where f.student_id = v_student and f.next_steps <> ''
    order by f.subject, f.created_at desc
  ) r;

  return json_build_object(
    'student', json_build_object('id', v_profile.id, 'name', v_profile.full_name, 'grade_level', v_profile.grade_level, 'subjects', v_profile.subjects, 'goals', v_profile.goals),
    'all_time', public.learning_snapshot(v_student, '-infinity', 'infinity'),
    'this_month', public.learning_snapshot(v_student, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month'),
    'monthly', v_monthly, 'weekly', v_weekly, 'recommendations', v_recs);
end;
$$;

create table if not exists public.learning_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  data jsonb not null,
  generated_at timestamptz not null default now(),
  unique (student_id, month)
);
alter table public.learning_reports enable row level security;
drop policy if exists "learning reports: learner, parents, admin" on public.learning_reports;
create policy "learning reports: learner, parents, admin" on public.learning_reports for select
using (student_id = auth.uid() or public.is_parent_of(student_id) or public.is_admin());
revoke insert, update, delete on public.learning_reports from anon, authenticated;
grant select on public.learning_reports to authenticated;

-- Builds (or rebuilds) a learner's report for a month. Strengths and areas to work on
-- come from tutors' lesson feedback; nothing is invented.
create or replace function public.generate_learning_report(p_student uuid, p_month date)
returns public.learning_reports language plpgsql security definer set search_path = public as $$
declare
  v_from timestamptz := (date_trunc('month', p_month)::date)::timestamp at time zone 'Africa/Lagos';
  v_to timestamptz := ((date_trunc('month', p_month) + interval '1 month')::date)::timestamp at time zone 'Africa/Lagos';
  v_prev json;
  v_snap json;
  v_strengths json;
  v_improve json;
  v_name text;
  v_r learning_reports;
begin
  select full_name into v_name from profiles where id = p_student;
  v_snap := public.learning_snapshot(p_student, v_from, v_to);
  v_prev := public.learning_snapshot(p_student, v_from - interval '1 month', v_from);
  select coalesce(json_agg(json_build_object('subject', subject, 'text', strengths, 'tutor', tutor) order by created_at desc), '[]') into v_strengths
  from (select f.subject, f.strengths, p.full_name tutor, f.created_at from lesson_feedback f join bookings b on b.id = f.booking_id join profiles p on p.id = f.tutor_id
        where f.student_id = p_student and b.starts_at >= v_from and b.starts_at < v_to and f.strengths <> '') s;
  select coalesce(json_agg(json_build_object('subject', subject, 'text', improvements, 'tutor', tutor) order by created_at desc), '[]') into v_improve
  from (select f.subject, f.improvements, p.full_name tutor, f.created_at from lesson_feedback f join bookings b on b.id = f.booking_id join profiles p on p.id = f.tutor_id
        where f.student_id = p_student and b.starts_at >= v_from and b.starts_at < v_to and f.improvements <> '') s;

  insert into learning_reports (student_id, month, data)
  values (p_student, date_trunc('month', p_month)::date, jsonb_build_object(
    'student_name', v_name, 'month', to_char(p_month, 'FMMonth YYYY'), 'period', json_build_object('from', v_from, 'to', v_to),
    'summary', v_snap, 'previous', json_build_object('lessons_completed', v_prev ->> 'lessons_completed', 'minutes', v_prev ->> 'minutes'),
    'strengths', v_strengths, 'improvements', v_improve, 'complete', now() >= v_to))
  on conflict (student_id, month) do update set data = excluded.data, generated_at = now()
  returning * into v_r;
  return v_r;
end;
$$;

-- Plus families can (re)build the current or a past month's report on demand.
create or replace function public.request_learning_report(p_student uuid, p_month date default null)
returns public.learning_reports language plpgsql security definer set search_path = public as $$
declare v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Africa/Lagos')::date))::date;
begin
  if not public.can_manage_learner(p_student) then raise exception 'You can only see reports for yourself or your linked children'; end if;
  perform public.require_plus(p_student);
  if v_month > (now() at time zone 'Africa/Lagos')::date then raise exception 'That month hasn''t started yet'; end if;
  return public.generate_learning_report(p_student, v_month);
end;
$$;

create or replace function public.list_learning_reports(p_student uuid)
returns table (id uuid, month date, data jsonb, generated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_learner(p_student) then raise exception 'You can only see reports for yourself or your linked children'; end if;
  perform public.require_plus(p_student);
  return query select r.id, r.month, r.data, r.generated_at from learning_reports r where r.student_id = p_student order by r.month desc limit 24;
end;
$$;

-- Family dashboard: every linked child with their bookings, tutors and progress.
create or replace function public.family_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from profiles where id = v_uid and role = 'parent') then raise exception 'The family dashboard is for parent accounts'; end if;
  perform public.require_plus(v_uid);
  return (
    select coalesce(json_agg(json_build_object(
      'id', c.id, 'name', c.full_name, 'grade_level', c.grade_level, 'subjects', c.subjects, 'goals', c.goals,
      'this_month', public.learning_snapshot(c.id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month'),
      'all_time', json_build_object(
        'lessons_completed', (select count(*) from bookings where student_id = c.id and status = 'completed'),
        'minutes', (select coalesce(sum(duration_minutes), 0) from bookings where student_id = c.id and status = 'completed')),
      'upcoming', (select coalesce(json_agg(json_build_object('id', b.id, 'subject', b.subject, 'starts_at', b.starts_at, 'tutor', tp.full_name, 'tutor_id', b.tutor_id, 'status', b.status) order by b.starts_at), '[]')
                   from bookings b join profiles tp on tp.id = b.tutor_id
                   where b.student_id = c.id and b.status in ('confirmed', 'pending_payment') and b.starts_at > now()),
      'tutors', (select coalesce(json_agg(distinct jsonb_build_object('id', b.tutor_id, 'name', tp.full_name)), '[]')
                 from bookings b join profiles tp on tp.id = b.tutor_id where b.student_id = c.id and b.status in ('confirmed', 'completed')),
      'active_goals', (select count(*) from learning_goals where student_id = c.id and status = 'active'),
      'latest_feedback', (select json_build_object('subject', f.subject, 'summary', f.summary, 'tutor', tp.full_name, 'date', f.created_at)
                          from lesson_feedback f join profiles tp on tp.id = f.tutor_id where f.student_id = c.id order by f.created_at desc limit 1),
      'latest_report', (select json_build_object('id', r.id, 'month', r.month) from learning_reports r where r.student_id = c.id order by r.month desc limit 1)
    ) order by c.full_name), '[]')
    from parent_links pl join profiles c on c.id = pl.student_id
    where pl.parent_id = v_uid
  );
end;
$$;

-- Parents keep each child's learning profile up to date (Plus).
create or replace function public.update_child_profile(p_child uuid, p jsonb)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v profiles;
begin
  if not public.is_parent_of(p_child) then raise exception 'You can only update your linked children'; end if;
  perform public.require_plus(p_child);
  update profiles set
    grade_level = case when p ? 'grade_level' then nullif(p ->> 'grade_level', '') else grade_level end,
    subjects = case when p ? 'subjects' then array(select left(jsonb_array_elements_text(p -> 'subjects'), 60) limit 20) else subjects end,
    goals = case when p ? 'goals' then array(select left(jsonb_array_elements_text(p -> 'goals'), 60) limit 20) else goals end
  where id = p_child returning * into v;
  return v;
end;
$$;

-- ===========================================================================
-- 9. Tutor quality scores and recommendations
-- ===========================================================================
create table if not exists public.tutor_scores (
  tutor_id uuid primary key references public.tutors (id) on delete cascade,
  bayes_rating numeric(4, 3) not null default 0,
  review_count int not null default 0,
  reviewer_count int not null default 0,
  recent_rating numeric(4, 3),
  completion_rate numeric(4, 3) not null default 1,
  completed_sessions int not null default 0,
  verified_qualifications int not null default 0,
  weekly_hours numeric(6, 2) not null default 0,
  bookings_90d int not null default 0,
  learners_90d int not null default 0,
  quality numeric(6, 2) not null default 0,
  computed_at timestamptz not null default now()
);
alter table public.tutor_scores enable row level security;
drop policy if exists "tutor scores: listed tutors" on public.tutor_scores;
create policy "tutor scores: listed tutors" on public.tutor_scores for select using (public.is_public_tutor(tutor_id) or tutor_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.tutor_scores from anon, authenticated;
grant select on public.tutor_scores to anon, authenticated;

-- Quality score (0–100), balanced so new tutors aren't buried:
--   rating 35 (Bayesian: few reviews sit near the platform average), recent feedback 10,
--   review volume 10 (log scale), completion 15, verified qualifications 10,
--   availability 10, and up to 10 for tutors new to the platform.
create or replace function public.refresh_tutor_scores(p_tutor uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_prior numeric;
  v_weight constant numeric := 5;
  n int;
begin
  select coalesce(avg(a.r), 4.0) into v_prior from (
    select avg(rating)::numeric r from reviews where status = 'published' group by tutor_id, author_id) a;

  with base as (
    select t.id,
      (select count(*) from reviews r where r.tutor_id = t.id and r.status = 'published') rc,
      (select count(*) from (select 1 from reviews r where r.tutor_id = t.id and r.status = 'published' group by r.author_id) x) authors,
      (select coalesce(sum(a.r), 0) from (select avg(rating)::numeric r from reviews r where r.tutor_id = t.id and r.status = 'published' group by r.author_id) a) author_sum,
      (select avg(rating)::numeric from reviews r where r.tutor_id = t.id and r.status = 'published' and r.created_at > now() - interval '90 days') recent,
      (select count(*) from bookings b where b.tutor_id = t.id and b.status = 'completed') done,
      (select count(*) from bookings b where b.tutor_id = t.id and b.status = 'cancelled' and b.cancelled_by = t.id and b.amount_paid is not null) tutor_cancelled,
      public.verified_qualification_count(t.id) vq,
      (select coalesce(sum(end_minute - start_minute), 0) / 60.0 from availability a where a.tutor_id = t.id) hours,
      (select count(*) from bookings b where b.tutor_id = t.id and b.status in ('confirmed', 'completed') and b.starts_at > now() - interval '90 days') b90,
      (select count(distinct b.student_id) from bookings b where b.tutor_id = t.id and b.status in ('confirmed', 'completed') and b.starts_at > now() - interval '90 days') l90,
      coalesce(t.approved_at, t.created_at) approved
    from tutors t
    where (p_tutor is null or t.id = p_tutor) and t.status = 'approved'
  ), scored as (
    select b.*,
      (v_weight * v_prior + b.author_sum) / (v_weight + b.authors) bayes,
      (b.done + 2.0) / (b.done + b.tutor_cancelled + 2.0) completion
    from base b
  )
  insert into tutor_scores as s (tutor_id, bayes_rating, review_count, reviewer_count, recent_rating, completion_rate, completed_sessions,
                                 verified_qualifications, weekly_hours, bookings_90d, learners_90d, quality, computed_at)
  select id, round(bayes, 3), rc, authors, round(recent, 3), round(completion, 3), done, vq, round(hours, 2), b90, l90,
    round((
      35 * (bayes - 1) / 4
      + 10 * (coalesce(recent, bayes) - 1) / 4
      + 10 * least(ln(1 + rc)::numeric / ln(51)::numeric, 1)
      + 15 * completion
      + 10 * least(vq, 2) / 2.0
      + 10 * least(hours / 10.0, 1)
      + case when approved > now() - interval '60 days' and rc < 5 then 10 * (1 - extract(epoch from now() - approved) / (60 * 86400)) else 0 end
    )::numeric, 2),
    now()
  from scored
  on conflict (tutor_id) do update set bayes_rating = excluded.bayes_rating, review_count = excluded.review_count, reviewer_count = excluded.reviewer_count,
    recent_rating = excluded.recent_rating, completion_rate = excluded.completion_rate, completed_sessions = excluded.completed_sessions,
    verified_qualifications = excluded.verified_qualifications, weekly_hours = excluded.weekly_hours, bookings_90d = excluded.bookings_90d,
    learners_90d = excluded.learners_90d, quality = excluded.quality, computed_at = excluded.computed_at;
  get diagnostics n = row_count;
  if p_tutor is null then delete from tutor_scores where tutor_id not in (select id from tutors where status = 'approved'); end if;
  return n;
end;
$$;

-- Directory card for a tutor, with score and reasons.
create or replace function public.tutor_card(p_tutor uuid, p_score numeric default null, p_reasons text[] default '{}')
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', t.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'headline', t.headline, 'subjects', t.subjects,
    'levels', t.levels, 'hourly_rate', t.hourly_rate, 'rating', t.rating, 'review_count', t.review_count, 'sessions_completed', t.sessions_completed,
    'years_experience', t.years_experience, 'location', t.location, 'languages', t.languages,
    'verified_qualifications', public.verified_qualification_count(t.id), 'approved_at', t.approved_at,
    'score', p_score, 'reasons', to_jsonb(p_reasons))
  from tutors t join profiles p on p.id = t.id where t.id = p_tutor;
$$;

-- Public sections for discovery. Only real tutors with real numbers.
create or replace function public.tutor_sections(p_limit int default 6)
returns json language plpgsql security definer set search_path = public as $$
declare v_lim int := least(greatest(p_limit, 1), 12);
begin
  if not exists (select 1 from tutor_scores where computed_at > now() - interval '1 hour') then
    perform public.refresh_tutor_scores();
  end if;
  return json_build_object(
    'top_rated', (select coalesce(json_agg(public.tutor_card(s.tutor_id, s.bayes_rating, array['Rated ' || to_char(t.rating, 'FM0.0') || ' by ' || s.reviewer_count || ' learner' || case when s.reviewer_count = 1 then '' else 's' end]) order by s.bayes_rating desc, s.review_count desc), '[]')
      from (select * from tutor_scores where review_count >= 1 and public.is_public_tutor(tutor_id) order by bayes_rating desc, review_count desc limit v_lim) s join tutors t on t.id = s.tutor_id),
    'most_reviewed', (select coalesce(json_agg(public.tutor_card(s.tutor_id, s.review_count, array[s.review_count || ' verified review' || case when s.review_count = 1 then '' else 's' end]) order by s.review_count desc, s.bayes_rating desc), '[]')
      from (select * from tutor_scores where review_count >= 1 and public.is_public_tutor(tutor_id) order by review_count desc, bayes_rating desc limit v_lim) s),
    'newly_verified', (select coalesce(json_agg(public.tutor_card(t.id, null, array['Joined ' || to_char(coalesce(t.approved_at, t.created_at) at time zone 'Africa/Lagos', 'DD Mon')]
          || case when public.verified_qualification_count(t.id) > 0 then array['Verified qualifications'] else '{}'::text[] end) order by coalesce(t.approved_at, t.created_at) desc), '[]')
      from (select * from tutors where status = 'approved' and coalesce(approved_at, created_at) > now() - interval '60 days' and public.is_public_tutor(id)
            order by coalesce(approved_at, created_at) desc limit v_lim) t),
    'popular', (select coalesce(json_agg(public.tutor_card(s.tutor_id, s.bookings_90d, array[s.learners_90d || ' learner' || case when s.learners_90d = 1 then '' else 's' end || ' in the last 90 days']) order by s.bookings_90d desc, s.learners_90d desc), '[]')
      from (select * from tutor_scores where bookings_90d >= 1 and public.is_public_tutor(tutor_id) order by bookings_90d desc, learners_90d desc limit v_lim) s),
    'recommended', (select coalesce(json_agg(public.tutor_card(s.tutor_id, s.quality, '{}') order by s.quality desc), '[]')
      from (select * from tutor_scores where public.is_public_tutor(tutor_id) order by quality desc limit v_lim) s)
  );
end;
$$;

-- Personal matches for a Plus learner: relevance to their subjects, goals, level and
-- history (55%), blended with the tutor's quality score (45%).
create or replace function public.recommend_tutors(p_student uuid default null, p_limit int default 6)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_profile profiles;
  v_interests text[];
  v_history text[];
begin
  if not public.can_manage_learner(v_student) then raise exception 'You can only get recommendations for yourself or your linked children'; end if;
  perform public.require_plus(v_student);
  if not exists (select 1 from tutor_scores where computed_at > now() - interval '1 hour') then
    perform public.refresh_tutor_scores();
  end if;
  select * into v_profile from profiles where id = v_student;
  select array(select distinct lower(x) from unnest(
    coalesce(v_profile.subjects, '{}') || coalesce((select array_agg(subject) from learning_goals where student_id = v_student and status = 'active' and subject <> ''), '{}')
  ) x) into v_interests;
  select array(select distinct lower(subject) from bookings where student_id = v_student and status in ('confirmed', 'completed')) into v_history;

  return (
    select coalesce(json_agg(public.tutor_card(m.tutor_id, m.match, m.reasons) order by m.match desc), '[]')
    from (
      select s.tutor_id,
        round(
          55 * (
            0.7 * case when cardinality(v_interests) = 0 then 0.5
                       else (select count(*) from unnest(t.subjects) ts where lower(ts) = any (v_interests))::numeric / cardinality(v_interests) end
            + 0.2 * case when v_profile.grade_level is null then 0.5 when v_profile.grade_level = any (t.levels) then 1 else 0 end
            + 0.1 * case when exists (select 1 from unnest(t.subjects) ts where lower(ts) = any (v_history)) then 1 else 0 end
          ) + 0.45 * s.quality, 2) as match,
        array_remove(array[
          case when exists (select 1 from unnest(t.subjects) ts where lower(ts) = any (v_interests))
               then 'Teaches ' || (select string_agg(ts, ', ') from unnest(t.subjects) ts where lower(ts) = any (v_interests)) end,
          case when v_profile.grade_level = any (t.levels) then 'Teaches ' || v_profile.grade_level end,
          case when s.verified_qualifications > 0 then 'Verified qualifications' end,
          case when s.reviewer_count > 0 then 'Rated ' || to_char(t.rating, 'FM0.0') || ' by ' || s.reviewer_count || ' learner' || case when s.reviewer_count = 1 then '' else 's' end end,
          case when s.reviewer_count = 0 and coalesce(t.approved_at, t.created_at) > now() - interval '60 days' then 'New on TutorHaven' end,
          case when s.weekly_hours >= 10 then 'Plenty of weekly availability' end,
          case when s.completed_sessions >= 5 and s.completion_rate >= 0.95 then 'Reliable: ' || s.completed_sessions || ' sessions completed' end
        ], null) as reasons
      from tutor_scores s join tutors t on t.id = s.tutor_id
      where public.is_public_tutor(s.tutor_id) and s.tutor_id <> v_student and s.weekly_hours > 0
      order by match desc
      limit least(greatest(p_limit, 1), 12)
    ) m
  );
end;
$$;

-- ===========================================================================
-- 10. Priority support
-- ===========================================================================
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'other' check (category in ('booking', 'payment', 'account', 'tutor', 'technical', 'other')),
  subject text not null check (length(trim(subject)) between 3 and 120),
  message text not null check (length(trim(message)) between 10 and 4000),
  priority text not null default 'standard' check (priority in ('standard', 'priority')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_requests_queue_idx on public.support_requests (status, priority, created_at);
alter table public.support_requests enable row level security;
drop policy if exists "support: own or admin" on public.support_requests;
create policy "support: own or admin" on public.support_requests for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.support_requests from anon, authenticated;
grant select on public.support_requests to authenticated;

create or replace function public.create_support_request(p_category text, p_subject text, p_message text)
returns public.support_requests language plpgsql security definer set search_path = public as $$
declare v support_requests;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if (select count(*) from support_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent a lot of requests today. We''ll reply to those first.';
  end if;
  insert into support_requests (user_id, category, subject, message, priority)
  values (auth.uid(), coalesce(nullif(p_category, ''), 'other'), trim(p_subject), trim(p_message),
          case when public.is_plus(auth.uid()) then 'priority' else 'standard' end)
  returning * into v;
  return v;
end;
$$;

create or replace function public.admin_list_support(p_status text default 'open')
returns table (id uuid, created_at timestamptz, user_id uuid, full_name text, email text, role public.user_role, category text, subject text,
               message text, priority text, status text, admin_reply text, resolved_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select s.id, s.created_at, s.user_id, p.full_name, u.email::text, p.role, s.category, s.subject, s.message, s.priority, s.status, s.admin_reply, s.resolved_at
  from support_requests s join profiles p on p.id = s.user_id left join auth.users u on u.id = s.user_id
  where coalesce(p_status, '') = '' or (p_status = 'open' and s.status <> 'resolved') or s.status = p_status
  order by (s.status = 'resolved'), (s.priority = 'priority') desc, s.created_at
  limit 500;
end;
$$;

create or replace function public.admin_update_support(p_id uuid, p_status text, p_reply text default null)
returns public.support_requests language plpgsql security definer set search_path = public as $$
declare v support_requests;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('open', 'in_progress', 'resolved') then raise exception 'Unknown status'; end if;
  update support_requests set status = p_status, admin_reply = coalesce(p_reply, admin_reply), updated_at = now(),
    resolved_at = case when p_status = 'resolved' then now() else null end
  where id = p_id returning * into v;
  if not found then raise exception 'Request not found'; end if;
  if p_reply is not null and length(trim(p_reply)) > 0 then
    perform public.notify(v.user_id, 'support_reply', 'Support replied: ' || v.subject, left(trim(p_reply), 160), '/dashboard/support');
  end if;
  return v;
end;
$$;

-- ===========================================================================
-- 11. Plans admin: AI allowance and unpriced drafts
-- ===========================================================================
create or replace function public.admin_upsert_plan(p jsonb)
returns public.subscription_plans
language plpgsql security definer set search_path = public as $$
declare v subscription_plans; v_price numeric;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  v_price := nullif(p ->> 'price', '')::numeric;
  if p ? 'id' and nullif(p ->> 'id', '') is not null then
    select * into v from subscription_plans where id = (p ->> 'id')::uuid;
    if not found then raise exception 'Plan not found'; end if;
    if coalesce((p ->> 'is_active')::boolean, v.is_active) and (case when p ? 'price' then v_price else v.price end) is null then
      raise exception 'Set a price before putting this plan on sale';
    end if;
    update subscription_plans set
      name = coalesce(p ->> 'name', name),
      description = coalesce(p ->> 'description', description),
      price = case when p ? 'price' then v_price else price end,
      interval_months = coalesce((p ->> 'interval_months')::int, interval_months),
      session_discount = case when audience = 'learner' then coalesce((p ->> 'session_discount')::numeric, session_discount) else 0 end,
      ai_monthly_limit = case when audience = 'learner' then coalesce((p ->> 'ai_monthly_limit')::int, ai_monthly_limit) else 0 end,
      features = coalesce(array(select jsonb_array_elements_text(p -> 'features')), features),
      is_active = coalesce((p ->> 'is_active')::boolean, is_active),
      sort_order = coalesce((p ->> 'sort_order')::int, sort_order),
      updated_at = now()
    where id = (p ->> 'id')::uuid returning * into v;
  else
    if coalesce((p ->> 'is_active')::boolean, true) and v_price is null then raise exception 'Set a price before putting this plan on sale'; end if;
    insert into subscription_plans (code, audience, name, description, price, interval_months, session_discount, ai_monthly_limit, features, is_active, sort_order)
    values (p ->> 'code', p ->> 'audience', p ->> 'name', coalesce(p ->> 'description', ''), v_price,
            coalesce((p ->> 'interval_months')::int, 1),
            case when p ->> 'audience' = 'learner' then coalesce((p ->> 'session_discount')::numeric, 0) else 0 end,
            case when p ->> 'audience' = 'learner' then coalesce((p ->> 'ai_monthly_limit')::int, 0) else 0 end,
            coalesce(array(select jsonb_array_elements_text(p -> 'features')), '{}'), coalesce((p ->> 'is_active')::boolean, true),
            coalesce((p ->> 'sort_order')::int, 0))
    returning * into v;
  end if;
  perform public.log_payment_event(null, 'plan.saved', 'admin', null, v.code, null, to_jsonb(v));
  return v;
end;
$$;

-- Plus usage for the admin overview.
create or replace function public.admin_plus_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'plus_members', (select count(*) from subscriptions where audience = 'learner' and status in ('active', 'cancelled') and current_period_end > now()),
    'ai_questions_month', (select count(*) from ai_messages where role = 'user' and created_at >= date_trunc('month', now())),
    'reviews_hidden', (select count(*) from reviews where status = 'hidden'),
    'reports_open', (select count(*) from review_reports where status = 'open'),
    'support_open', (select count(*) from support_requests where status <> 'resolved'),
    'support_priority_open', (select count(*) from support_requests where status <> 'resolved' and priority = 'priority'));
end;
$$;

-- ===========================================================================
-- 12. Maintenance: also refresh tutor scores and write last month's reports
-- ===========================================================================
create or replace function public.run_maintenance()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_expired int := 0;
  v_reminded int := 0;
  v_abandoned int := 0;
  v_released int := 0;
  v_reports int := 0;
  v_last_month date := (date_trunc('month', now() at time zone 'Africa/Lagos') - interval '1 month')::date;
  r record;
begin
  for r in
    select s.*, p.name as plan_name from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.status = 'active' and s.current_period_end between now() and now() + interval '3 days' and s.reminder_sent_at is null
  loop
    perform public.notify(r.user_id, 'renewal_reminder', r.plan_name || ' ends soon',
      'Your subscription ends on ' || to_char(r.current_period_end at time zone 'Africa/Lagos', 'DD Mon YYYY') || '. Renew to keep your benefits.',
      case when r.audience = 'tutor' then '/dashboard/subscription' else '/plus' end);
    update subscriptions set reminder_sent_at = now() where id = r.id;
    v_reminded := v_reminded + 1;
  end loop;

  for r in
    select s.*, p.name as plan_name from subscriptions s join subscription_plans p on p.id = s.plan_id
    where s.status in ('active', 'cancelled') and s.current_period_end <= now()
  loop
    update subscriptions set status = 'expired', updated_at = now() where id = r.id;
    perform public.notify(r.user_id, 'subscription_expired', r.plan_name || ' has expired',
      case when r.audience = 'tutor' then 'Your profile is hidden from search until you renew.' else 'Plus features and member discounts are paused. Renew any time.' end,
      case when r.audience = 'tutor' then '/dashboard/subscription' else '/plus' end);
    v_expired := v_expired + 1;
  end loop;

  with a as (
    update payment_intents set status = 'abandoned', failure_reason = 'Checkout not completed within 24 hours', updated_at = now()
    where status = 'pending' and created_at < now() - interval '24 hours' returning reference
  )
  select count(*) into v_abandoned from a;

  with b as (
    update bookings set status = 'cancelled'
    where status = 'pending_payment' and public.hold_expired(created_at)
      and not exists (select 1 from payment_intents pi where pi.booking_id = bookings.id and pi.status = 'succeeded')
    returning id
  )
  select count(*) into v_released from b;

  -- Monthly reports for Plus learners, once last month is over.
  for r in
    select distinct p.id from profiles p
    where p.role = 'student' and public.is_plus(p.id)
      and not exists (select 1 from learning_reports lr where lr.student_id = p.id and lr.month = v_last_month and (lr.data ->> 'complete')::boolean)
      and exists (select 1 from learning_activity a where a.student_id = p.id and a.occurred_at < date_trunc('month', now()))
  loop
    perform public.generate_learning_report(r.id, v_last_month);
    perform public.notify(r.id, 'learning_report', 'Your ' || to_char(v_last_month, 'FMMonth') || ' learning report is ready', '', '/dashboard/progress');
    perform public.notify(pl.parent_id, 'learning_report', to_char(v_last_month, 'FMMonth') || ' report for ' || split_part(p.full_name, ' ', 1) || ' is ready', '', '/dashboard/family')
    from parent_links pl join profiles p on p.id = pl.student_id where pl.student_id = r.id;
    v_reports := v_reports + 1;
  end loop;

  perform public.refresh_tutor_scores();

  if v_expired + v_reminded + v_abandoned + v_released + v_reports > 0 then
    perform public.log_payment_event(null, 'maintenance.run', 'maintenance', null, 'ok', null,
      json_build_object('expired', v_expired, 'reminded', v_reminded, 'abandoned', v_abandoned, 'released', v_released, 'reports', v_reports)::jsonb);
  end if;
  return json_build_object('expired', v_expired, 'reminded', v_reminded, 'abandoned', v_abandoned, 'released', v_released, 'reports', v_reports);
end;
$$;

-- ===========================================================================
-- 13. Permissions
-- ===========================================================================
revoke execute on function
  public.plus_subscription(uuid), public.is_plus(uuid), public.require_plus(uuid), public.ai_questions_this_month(uuid),
  public.ai_begin(uuid, uuid, text, text, text), public.ai_finish(uuid, text, int, int), public.ai_abort(uuid),
  public.generate_learning_report(uuid, date), public.learning_snapshot(uuid, timestamptz, timestamptz),
  public.refresh_tutor_scores(uuid), public.review_signals(), public.tutor_card(uuid, numeric, text[])
from public, anon, authenticated;
grant execute on function
  public.ai_begin(uuid, uuid, text, text, text), public.ai_finish(uuid, text, int, int), public.ai_abort(uuid),
  public.generate_learning_report(uuid, date), public.refresh_tutor_scores(uuid)
to service_role;

revoke execute on function
  public.my_membership(), public.delete_ai_conversation(uuid),
  public.submit_review(uuid, int, int, int, int, int, text), public.respond_to_review(uuid, text), public.delete_review_response(uuid),
  public.report_review(uuid, text, text), public.admin_moderate_review(uuid, text, text), public.admin_list_reviews(text, text, int),
  public.admin_review_log(uuid, int), public.my_tutor_reviews(), public.save_lesson_feedback(uuid, text, text, text, text, int),
  public.save_learning_goal(jsonb), public.delete_learning_goal(uuid), public.learning_analytics(uuid),
  public.request_learning_report(uuid, date), public.list_learning_reports(uuid), public.family_overview(),
  public.update_child_profile(uuid, jsonb), public.recommend_tutors(uuid, int), public.create_support_request(text, text, text),
  public.admin_list_support(text), public.admin_update_support(uuid, text, text), public.admin_plus_overview(), public.can_manage_learner(uuid)
from public, anon;
grant execute on function
  public.my_membership(), public.delete_ai_conversation(uuid),
  public.submit_review(uuid, int, int, int, int, int, text), public.respond_to_review(uuid, text), public.delete_review_response(uuid),
  public.report_review(uuid, text, text), public.admin_moderate_review(uuid, text, text), public.admin_list_reviews(text, text, int),
  public.admin_review_log(uuid, int), public.my_tutor_reviews(), public.save_lesson_feedback(uuid, text, text, text, text, int),
  public.save_learning_goal(jsonb), public.delete_learning_goal(uuid), public.learning_analytics(uuid),
  public.request_learning_report(uuid, date), public.list_learning_reports(uuid), public.family_overview(),
  public.update_child_profile(uuid, jsonb), public.recommend_tutors(uuid, int), public.create_support_request(text, text, text),
  public.admin_list_support(text), public.admin_update_support(uuid, text, text), public.admin_plus_overview(), public.can_manage_learner(uuid)
to authenticated;

grant execute on function public.tutor_reviews(uuid, int), public.tutor_review_summary(uuid), public.tutor_sections(int),
  public.featured_reviews(int), public.public_stats(), public.is_verified_review_booking(uuid)
to anon, authenticated;

-- Fill the score table now so the sections work straight away.
select public.refresh_tutor_scores();
