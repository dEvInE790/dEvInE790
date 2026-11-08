-- TutorHaven — account deletion (required by Google Play and the App Store).
-- Run after 20261106000000_plus_reviews_learning.sql. Safe to run more than once.
--
-- Users delete their own account in the app or on the website (the delete-account
-- Edge Function). Everything linked to the account is removed by the existing
-- "on delete cascade" rules when the auth user is deleted. Payment records are
-- kept, without the person's name or email, because financial and tax rules
-- require it (as the Privacy Policy says).

create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  email_sha256 text not null,
  reason text not null default '',
  deleted_at timestamptz not null default now()
);

create table if not exists public.retained_payment_records (
  id uuid primary key default gen_random_uuid(),
  deleted_account_id uuid not null references public.deleted_accounts (id) on delete cascade,
  original_payment_id uuid not null,
  kind text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  status text not null,
  description text not null default '',
  provider text not null default '',
  provider_ref text,
  paid_at timestamptz not null,
  archived_at timestamptz not null default now()
);

alter table public.deleted_accounts enable row level security;
alter table public.retained_payment_records enable row level security;
drop policy if exists "deleted accounts: admin" on public.deleted_accounts;
create policy "deleted accounts: admin" on public.deleted_accounts for select using (public.is_admin());
drop policy if exists "retained payments: admin" on public.retained_payment_records;
create policy "retained payments: admin" on public.retained_payment_records for select using (public.is_admin());
revoke insert, update, delete on public.deleted_accounts, public.retained_payment_records from anon, authenticated;
grant select on public.deleted_accounts, public.retained_payment_records to authenticated;

-- What would block deleting this account right now (for showing in the app before asking).
create or replace function public.account_deletion_blockers(p_user uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'is_admin', exists (select 1 from profiles where id = p_user and role = 'admin'),
    'upcoming_sessions', (select count(*) from bookings b
       where b.status = 'confirmed' and b.starts_at > now()
         and (b.student_id = p_user or b.booked_by = p_user or b.tutor_id = p_user)),
    'refunds_in_progress', (select count(*) from payments p
       where p.status in ('refund_pending', 'refund_processing')
         and (p.user_id = p_user or p.booking_id in (select id from bookings where tutor_id = p_user)))
  );
$$;

create or replace function public.my_account_deletion_blockers()
returns json language sql stable security definer set search_path = public as $$
  select public.account_deletion_blockers(auth.uid());
$$;

-- Backend only: checks the account can go, records the deletion and keeps an
-- anonymous copy of its payments. The Edge Function then deletes the auth user.
create or replace function public.prepare_account_deletion(p_user uuid, p_reason text default '')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
  v_email text;
  v_block json;
  v_id uuid;
  v_kept int;
begin
  select * into v_profile from profiles where id = p_user for update;
  if not found then raise exception 'Account not found'; end if;
  v_block := public.account_deletion_blockers(p_user);
  if (v_block ->> 'is_admin')::boolean then
    raise exception 'Admin accounts can’t be deleted here. Ask another admin to change your role to a normal account first.';
  end if;
  if (v_block ->> 'upcoming_sessions')::int > 0 then
    raise exception 'You have % upcoming session(s). Cancel them first (paid sessions are refunded), then delete your account.', v_block ->> 'upcoming_sessions';
  end if;
  if (v_block ->> 'refunds_in_progress')::int > 0 then
    raise exception 'A refund linked to your account is still being processed. Please try again once it has finished.';
  end if;

  select email into v_email from auth.users where id = p_user;
  insert into deleted_accounts (role, email_sha256, reason)
  values (v_profile.role::text, encode(digest(lower(coalesce(v_email, '')), 'sha256'), 'hex'), left(coalesce(trim(p_reason), ''), 500))
  returning id into v_id;

  insert into retained_payment_records (deleted_account_id, original_payment_id, kind, amount, currency, status, description, provider, provider_ref, paid_at)
  select v_id, p.id, p.kind, p.amount, p.currency, p.status, p.description, p.provider, p.provider_ref, p.created_at
  from payments p where p.user_id = p_user;
  get diagnostics v_kept = row_count;

  perform public.log_payment_event(null, 'account.deleted', 'admin', null, v_profile.role::text, null,
    jsonb_build_object('deleted_account_id', v_id, 'payments_kept', v_kept));
  return json_build_object('ok', true, 'deleted_account_id', v_id, 'payments_kept', v_kept);
end;
$$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
-- digest() lives in the extensions schema on Supabase.
alter function public.prepare_account_deletion(uuid, text) set search_path = public, extensions;

revoke execute on function public.account_deletion_blockers(uuid), public.prepare_account_deletion(uuid, text) from public, anon, authenticated;
grant execute on function public.account_deletion_blockers(uuid), public.prepare_account_deletion(uuid, text) to service_role;
revoke execute on function public.my_account_deletion_blockers() from public, anon;
grant execute on function public.my_account_deletion_blockers() to authenticated;
