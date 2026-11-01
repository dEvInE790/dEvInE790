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
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'adaeze.okafor@demo.tutorhaven.app', 'Adaeze Okafor'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'tunde.bakare@demo.tutorhaven.app', 'Tunde Bakare'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'zainab.bello@demo.tutorhaven.app', 'Zainab Bello'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'chinedu.eze@demo.tutorhaven.app', 'Chinedu Eze'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'funmi.adeyemi@demo.tutorhaven.app', 'Funmilayo Adeyemi'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'ibrahim.musa@demo.tutorhaven.app', 'Ibrahim Musa')
) as t (id, email, name)
on conflict (id) do nothing;

update public.profiles set onboarded = true where id::text like 'a1000000-%';

update public.tutors t set
  headline = d.headline, bio = d.bio, subjects = d.subjects, levels = d.levels,
  languages = d.languages, hourly_rate = d.rate, years_experience = d.years,
  location = d.location, timezone = d.tz, status = 'approved'
from (values
  ('a1000000-0000-4000-8000-000000000001'::uuid,
   'UNILAG maths first-class graduate making WAEC & JAMB maths click',
   'I help secondary school students turn maths anxiety into confidence. Sessions blend worked examples with past questions and exam technique, and every learner leaves with a clear plan for the week.',
   '{Mathematics,Further Mathematics,Statistics}'::text[], '{JSS,SSS,WAEC,JAMB}'::text[], '{English,Igbo}'::text[], 8000, 8, 'Lagos', 'Africa/Lagos'),
  ('a1000000-0000-4000-8000-000000000002'::uuid,
   'Physics lecturer who teaches with experiments you can do at home',
   'Former university lecturer, now a full-time tutor. I make mechanics, electricity and modern physics intuitive through everyday demos and lots of practice questions for WAEC, NECO and JAMB.',
   '{Physics,Mathematics}'::text[], '{SSS,WAEC,JAMB,University}'::text[], '{English,Yoruba}'::text[], 10000, 11, 'Ibadan', 'Africa/Lagos'),
  ('a1000000-0000-4000-8000-000000000003'::uuid,
   'Software engineer teaching coding, Python and computer studies',
   'Eight years building fintech products in Lagos. I teach programming fundamentals and computer studies with small projects that build a real portfolio.',
   '{Computer Science,Python,Mathematics}'::text[], '{JSS,SSS,University,Adult}'::text[], '{English,Hausa}'::text[], 12000, 6, 'Abuja', 'Africa/Lagos'),
  ('a1000000-0000-4000-8000-000000000004'::uuid,
   'Chemistry & biology tutor for science students and pre-med',
   'Medical graduate who loves explaining why reactions happen. Structured revision plans, past-question drills and memory techniques that stick, for WAEC, NECO and JAMB.',
   '{Chemistry,Biology}'::text[], '{SSS,WAEC,JAMB,University}'::text[], '{English,Igbo}'::text[], 9000, 7, 'Enugu', 'Africa/Lagos'),
  ('a1000000-0000-4000-8000-000000000005'::uuid,
   'English language & literature coach for exams and essays',
   'Former secondary school English teacher. I help students write stronger essays, analyse literature texts with confidence and prepare for WAEC, IELTS and university applications.',
   '{English,Literature,Writing}'::text[], '{Primary,JSS,SSS,WAEC,Adult}'::text[], '{English,Yoruba}'::text[], 7000, 9, 'Lagos', 'Africa/Lagos'),
  ('a1000000-0000-4000-8000-000000000006'::uuid,
   'Economics & commerce tutor for SSS and university students',
   'Economics graduate and banker who turns graphs and theories into real-life stories. Exam-focused lessons for WAEC, NECO, JAMB and first-year university.',
   '{Economics,Commerce,Mathematics}'::text[], '{SSS,WAEC,JAMB,University}'::text[], '{English,Hausa}'::text[], 7500, 5, 'Kano', 'Africa/Lagos')
) as d (id, headline, bio, subjects, levels, languages, rate, years, location, tz)
where t.id = d.id;

-- Monday–Friday 09:00–12:00 and 15:00–19:00, Saturday 10:00–14:00, Lagos time.
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
