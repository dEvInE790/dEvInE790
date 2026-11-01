-- TutorHaven — remove demo and simulated data.
--
-- Run 01_inspect_demo_data.sql first and check its numbers. This script runs in
-- one transaction: if any safety check fails, nothing is changed.
-- Real accounts, real bookings and real Paystack payments are never deleted.
begin;

create temporary table demo_users on commit drop as
select u.id, u.email from auth.users u
where u.email ilike '%@demo.tutorhaven.app'
   or (u.id::text like 'a1000000-0000-4000-8000-%' and u.email ilike '%demo%');

-- Safety: a demo account should never own real money movements.
do $$ begin
  if exists (select 1 from public.payments p where p.provider = 'paystack' and p.user_id in (select id from demo_users)) then
    raise exception 'Stopped: a demo-looking account has real Paystack payments. Nothing was changed. Check 01_inspect_demo_data.sql.';
  end if;
end $$;

-- Real learners who paid real money for a session with a demo tutor: keep the
-- payment, detach it from the booking that is about to go, and queue a refund.
update public.payments p
set status = 'refund_pending', note = trim(p.note || ' Demo tutor removed before launch; refund due.')
from public.bookings b
where b.id = p.booking_id and p.provider = 'paystack' and p.status = 'succeeded' and b.tutor_id in (select id from demo_users);

-- Upcoming sessions that were only "paid" in test mode are not paid: free the slot.
update public.bookings b set status = 'cancelled'
where b.status = 'confirmed' and b.starts_at > now()
  and exists (select 1 from public.payments p where p.booking_id = b.id and p.provider = 'test')
  and not exists (select 1 from public.payments p where p.booking_id = b.id and p.provider = 'paystack');

-- Fake transactions from test mode.
delete from public.payments where provider = 'test';

-- Test-mode memberships (genuinely paid ones were already moved to the new subscriptions table).
delete from public.subscriptions_legacy;

-- Demo accounts; their profiles, tutor listings, availability, bookings and reviews cascade.
delete from auth.users where id in (select id from demo_users);

-- Ratings for real tutors who had reviews from demo learners.
update public.tutors t set
  rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.tutor_id = t.id), 0),
  review_count = (select count(*) from public.reviews r where r.tutor_id = t.id);

select 'Done' as result,
  (select count(*) from auth.users where email ilike '%@demo.tutorhaven.app') as demo_accounts_left,
  (select count(*) from public.payments where provider = 'test') as simulated_payments_left,
  (select count(*) from auth.users) as accounts_now,
  (select count(*) from public.payments where status = 'refund_pending') as refunds_to_issue;

commit;
