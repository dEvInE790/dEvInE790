-- TutorHaven — business contact details and editable policy pages.
-- Run after 20261103000000_tutor_payouts.sql. Safe to run more than once.
--
-- Business details and policy text live in platform_settings (public to read,
-- admins only to change), so they can be updated from Admin → Business & policies.
-- A policy column left empty means "use the built-in default text" from the app.

alter table public.platform_settings add column if not exists business_name text not null default 'TutorHaven';
alter table public.platform_settings add column if not exists operator_name text not null default 'Ojigbani Divine';
alter table public.platform_settings add column if not exists support_email text not null default 'tutorhaven737@gmail.com';
alter table public.platform_settings add column if not exists support_phone text not null default '+2348028139086';
alter table public.platform_settings add column if not exists whatsapp_number text not null default '+2348028139086';
alter table public.platform_settings add column if not exists business_city text not null default 'Lagos';
alter table public.platform_settings add column if not exists business_state text not null default 'Lagos State';
alter table public.platform_settings add column if not exists business_country text not null default 'Nigeria';
alter table public.platform_settings add column if not exists terms_text text;
alter table public.platform_settings add column if not exists privacy_text text;
alter table public.platform_settings add column if not exists refund_text text;
alter table public.platform_settings add column if not exists policies_updated_at timestamptz not null default now();

alter table public.platform_settings drop constraint if exists platform_settings_support_email_check;
alter table public.platform_settings add constraint platform_settings_support_email_check
  check (support_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
alter table public.platform_settings drop constraint if exists platform_settings_phone_check;
alter table public.platform_settings add constraint platform_settings_phone_check
  check (support_phone ~ '^\+[1-9][0-9]{7,14}$' and whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');

-- Admins update settings, business details and policies. Unknown keys are ignored;
-- a policy sent as an empty string goes back to the built-in default text.
create or replace function public.admin_update_settings(p jsonb)
returns public.platform_settings
language plpgsql security definer set search_path = public as $$
declare
  v platform_settings;
  v_policy_changed boolean := p ? 'terms_text' or p ? 'privacy_text' or p ? 'refund_text';
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update platform_settings set
    hold_minutes = coalesce((p ->> 'hold_minutes')::int, hold_minutes),
    tutor_subscription_required = coalesce((p ->> 'tutor_subscription_required')::boolean, tutor_subscription_required),
    commission_rate = coalesce((p ->> 'commission_rate')::numeric, commission_rate),
    payout_account_required = coalesce((p ->> 'payout_account_required')::boolean, payout_account_required),
    business_name = coalesce(nullif(trim(p ->> 'business_name'), ''), business_name),
    operator_name = coalesce(nullif(trim(p ->> 'operator_name'), ''), operator_name),
    support_email = coalesce(nullif(lower(trim(p ->> 'support_email')), ''), support_email),
    support_phone = coalesce(nullif(regexp_replace(p ->> 'support_phone', '[\s()-]', '', 'g'), ''), support_phone),
    whatsapp_number = coalesce(nullif(regexp_replace(p ->> 'whatsapp_number', '[\s()-]', '', 'g'), ''), whatsapp_number),
    business_city = coalesce(nullif(trim(p ->> 'business_city'), ''), business_city),
    business_state = coalesce(nullif(trim(p ->> 'business_state'), ''), business_state),
    business_country = coalesce(nullif(trim(p ->> 'business_country'), ''), business_country),
    terms_text = case when p ? 'terms_text' then nullif(trim(p ->> 'terms_text'), '') else terms_text end,
    privacy_text = case when p ? 'privacy_text' then nullif(trim(p ->> 'privacy_text'), '') else privacy_text end,
    refund_text = case when p ? 'refund_text' then nullif(trim(p ->> 'refund_text'), '') else refund_text end,
    policies_updated_at = case when v_policy_changed then now() else policies_updated_at end,
    updated_at = now()
  where id = 1 returning * into v;
  perform public.log_payment_event(null, 'settings.saved', 'admin', null, '', null,
    (p - 'terms_text' - 'privacy_text' - 'refund_text') || jsonb_build_object('policies_changed', v_policy_changed));
  return v;
end;
$$;

revoke execute on function public.admin_update_settings(jsonb) from public, anon;
grant execute on function public.admin_update_settings(jsonb) to authenticated;
