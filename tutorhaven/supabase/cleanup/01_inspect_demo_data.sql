-- TutorHaven — inspect demo and simulated data (READ ONLY: changes nothing).
--
-- Run in Supabase → SQL editor after the 20261102000000 migration.
-- One row per category. Review it before running 02_remove_demo_data.sql.
--
-- What counts as demo data (and nothing else):
--   * the six seeded tutors from the old supabase/seed.sql: ids a1000000-0000-4000-8000-00000000000N
--     with @demo.tutorhaven.app emails, plus any other @demo.tutorhaven.app account
--   * payments recorded by the removed "test mode" (provider = 'test'): no money moved
--   * memberships from test mode (kept aside in subscriptions_legacy by the migration)
-- Everything else is treated as real and is never deleted.
with demo_users as (
  select u.id, u.email from auth.users u
  where u.email ilike '%@demo.tutorhaven.app'
     or (u.id::text like 'a1000000-0000-4000-8000-%' and u.email ilike '%demo%')
)
select 1 as step, 'Demo accounts (will be deleted)' as category, count(*)::int as count,
       coalesce(string_agg(email, ', ' order by email), '') as details
from demo_users
union all
select 2, 'Bookings with a demo tutor or demo learner (deleted with the accounts)', count(*)::int,
       coalesce(string_agg(distinct b.status::text, ', '), '')
from public.bookings b where b.tutor_id in (select id from demo_users) or b.student_id in (select id from demo_users) or b.booked_by in (select id from demo_users)
union all
select 3, 'Reviews of or by demo accounts (deleted with the accounts)', count(*)::int, ''
from public.reviews r where r.tutor_id in (select id from demo_users) or r.author_id in (select id from demo_users)
union all
select 4, 'REAL Paystack payments to demo tutors (kept; queued for refund)', count(*)::int,
       coalesce(string_agg(p.provider_ref || ' ₦' || p.amount, ', '), '')
from public.payments p join public.bookings b on b.id = p.booking_id
where p.provider = 'paystack' and b.tutor_id in (select id from demo_users)
union all
select 5, 'Simulated test-mode payments (fake transactions, will be deleted)', count(*)::int,
       coalesce('₦' || to_char(sum(amount), 'FM999,999,990') || ' that never moved', '')
from public.payments where provider = 'test'
union all
select 6, 'Upcoming bookings confirmed only by a simulated payment (will be cancelled)', count(*)::int, ''
from public.bookings b
where b.status = 'confirmed' and b.starts_at > now()
  and exists (select 1 from public.payments p where p.booking_id = b.id and p.provider = 'test')
  and not exists (select 1 from public.payments p where p.booking_id = b.id and p.provider = 'paystack')
  and b.tutor_id not in (select id from demo_users)
union all
select 7, 'Test-mode memberships set aside by the migration (will be cleared)', count(*)::int, ''
from public.subscriptions_legacy
union all
select 8, 'Real accounts (kept)', count(*)::int, '' from auth.users where id not in (select id from demo_users)
union all
select 9, 'Real Paystack payments (kept)', count(*)::int,
       coalesce('₦' || to_char(sum(amount), 'FM999,999,990'), '') from public.payments where provider = 'paystack'
order by step;
