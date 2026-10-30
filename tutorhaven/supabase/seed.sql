-- Optional demo data: six approved tutors with weekly availability.
-- Run after the migration if you want the directory populated while you test.
-- These accounts have no password and cannot sign in. Delete them from
-- Authentication → Users before launch (their profiles cascade away).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', t.id, 'authenticated', 'authenticated', t.email, '', now(),
  '{"provider":"email","providers":["email"]}', json_build_object('full_name', t.name, 'role', 'tutor')::jsonb,
  now(), now(), '', '', '', ''
from (values
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'amara.okafor@demo.tutorhaven.app', 'Amara Okafor'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'lucas.meyer@demo.tutorhaven.app', 'Lucas Meyer'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'priya.raman@demo.tutorhaven.app', 'Priya Raman'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'sofia.alvarez@demo.tutorhaven.app', 'Sofía Álvarez'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'daniel.kim@demo.tutorhaven.app', 'Daniel Kim'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'chloe.bennett@demo.tutorhaven.app', 'Chloé Bennett')
) as t (id, email, name)
on conflict (id) do nothing;

update public.profiles set onboarded = true where id::text like 'a1000000-%';

update public.tutors t set
  headline = d.headline, bio = d.bio, subjects = d.subjects, levels = d.levels,
  languages = d.languages, hourly_rate = d.rate, years_experience = d.years,
  location = d.location, timezone = d.tz, status = 'approved'
from (values
  ('a1000000-0000-4000-8000-000000000001'::uuid,
   'Cambridge maths graduate making calculus click',
   'I help secondary and university students turn maths anxiety into confidence. Sessions blend worked examples with exam technique, and every learner leaves with a clear plan for the week ahead.',
   '{Mathematics,Calculus,Statistics}'::text[], '{GCSE,A-Level,University}'::text[], '{English,Igbo}'::text[], 42, 8, 'London, UK', 'Europe/London'),
  ('a1000000-0000-4000-8000-000000000002'::uuid,
   'Physics PhD who teaches with experiments you can do at home',
   'Former lab researcher, now a full-time tutor. I make mechanics, electricity and modern physics intuitive through real-world demos and lots of practice questions.',
   '{Physics,Mathematics}'::text[], '{IB,A-Level,University}'::text[], '{English,German}'::text[], 55, 11, 'Berlin, Germany', 'Europe/Berlin'),
  ('a1000000-0000-4000-8000-000000000003'::uuid,
   'Software engineer teaching Python and computer science',
   'Eight years shipping production code. I teach programming fundamentals, algorithms and AP/IB Computer Science with small projects that build real portfolios.',
   '{Computer Science,Python,Mathematics}'::text[], '{Middle School,High School,University}'::text[], '{English,Tamil}'::text[], 48, 6, 'Toronto, Canada', 'America/Toronto'),
  ('a1000000-0000-4000-8000-000000000004'::uuid,
   'Native Spanish speaker focused on real conversation',
   'Conversation-first Spanish lessons for all ages. We read, listen and speak from day one, with grammar introduced exactly when you need it.',
   '{Spanish,English}'::text[], '{Primary,Middle School,High School,Adult}'::text[], '{Spanish,English}'::text[], 30, 5, 'Madrid, Spain', 'Europe/Madrid'),
  ('a1000000-0000-4000-8000-000000000005'::uuid,
   'Chemistry & biology tutor for pre-med and IB students',
   'Medical school graduate who loves explaining why reactions happen. Structured revision plans, past-paper drills and memory techniques that stick.',
   '{Chemistry,Biology}'::text[], '{IB,A-Level,University}'::text[], '{English,Korean}'::text[], 50, 7, 'Seoul, South Korea', 'Asia/Seoul'),
  ('a1000000-0000-4000-8000-000000000006'::uuid,
   'English literature & essay writing coach',
   'Former secondary English teacher. I help students find their voice in essays, analyse texts with confidence and prepare for SAT, IELTS and university applications.',
   '{English,Writing,French}'::text[], '{Middle School,High School,Adult}'::text[], '{English,French}'::text[], 38, 9, 'New York, USA', 'America/New_York')
) as d (id, headline, bio, subjects, levels, languages, rate, years, location, tz)
where t.id = d.id;

-- Monday–Friday 09:00–12:00 and 15:00–19:00, Saturday 10:00–14:00, in each tutor's timezone.
insert into public.availability (tutor_id, weekday, start_minute, end_minute)
select t.id, w.weekday, w.start_minute, w.end_minute
from public.tutors t
cross join (
  select d as weekday, 540 as start_minute, 720 as end_minute from generate_series(1, 5) d
  union all select d, 900, 1140 from generate_series(1, 5) d
  union all select 6, 600, 840
) w
where t.id::text like 'a1000000-%'
  and not exists (select 1 from public.availability a where a.tutor_id = t.id);
