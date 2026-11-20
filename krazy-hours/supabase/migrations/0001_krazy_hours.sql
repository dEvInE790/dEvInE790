-- ============================================================================
-- KRAZY HOURS — database schema
-- Run this once in Supabase → SQL Editor (or `supabase db push`).
-- All tables have RLS enabled with NO public policies: the browser never talks
-- to these tables directly. Every read/write goes through the Next.js server,
-- which validates input and uses the service-role key.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Event settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.event_settings (
  id              smallint primary key default 1 check (id = 1),
  capacity        integer  not null default 30 check (capacity >= 0 and capacity <= 10000),
  max_per_booking integer  not null default 5  check (max_per_booking between 1 and 50),
  bookings_open   boolean  not null default true,
  bank_name       text     not null default 'PalmPay',
  account_number  text     not null default '8141276327',
  account_name    text     not null default 'Awal Ayomide Balogun',
  updated_at      timestamptz not null default now()
);

insert into public.event_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Ticket categories
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,32}$'),
  name        text not null check (char_length(name) between 1 and 40),
  price       integer not null check (price >= 0 and price <= 10000000), -- in Naira
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.ticket_categories (slug, name, price, description, sort_order) values
  ('girls', 'Girls', 3000, 'Entry for one lady', 1),
  ('boys',  'Boys',  4000, 'Entry for one guy',  2)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  booking_code      text not null unique,                 -- shown to customer, e.g. KH-7F3K9Q
  access_token      text not null unique,                 -- secret for the customer's ticket link
  checkin_code      text not null unique,                 -- secret encoded in the QR code
  category_id       uuid not null references public.ticket_categories(id),
  category_name     text not null,                        -- snapshot at booking time
  unit_price        integer not null check (unit_price >= 0),
  quantity          integer not null check (quantity between 1 and 50),
  amount            integer not null check (amount >= 0), -- unit_price * quantity, computed in DB
  full_name         text not null check (char_length(full_name) between 2 and 80),
  phone             text not null check (char_length(phone) between 7 and 20),
  email             text not null check (char_length(email) between 5 and 120),
  payment_reference text not null check (char_length(payment_reference) between 4 and 64),
  receipt_path      text not null,
  receipt_sha256    text not null,
  status            public.booking_status not null default 'pending',
  admin_note        text,
  verified_at       timestamptz,
  verified_by       uuid,
  checked_in_at     timestamptz,
  checked_in_by     uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists bookings_status_idx  on public.bookings (status);
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists bookings_email_idx   on public.bookings (lower(email));
create index if not exists bookings_phone_idx   on public.bookings (phone);

-- The same bank transfer reference / the same receipt file can never back two
-- live bookings. (Rejected/cancelled bookings release them.)
create unique index if not exists bookings_live_reference_uniq
  on public.bookings (upper(payment_reference)) where status in ('pending', 'confirmed');
create unique index if not exists bookings_live_receipt_uniq
  on public.bookings (receipt_sha256) where status in ('pending', 'confirmed');

-- ---------------------------------------------------------------------------
-- Admins (Supabase Auth users allowed into the dashboard)
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: lock everything down. Server uses the service-role key (bypasses RLS).
-- ---------------------------------------------------------------------------
alter table public.event_settings    enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.bookings          enable row level security;
alter table public.admins            enable row level security;

revoke all on public.event_settings, public.ticket_categories, public.bookings, public.admins
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.kh_random_code(len integer)
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  result text := '';
  bytes bytea := gen_random_bytes(len);
begin
  for i in 0 .. len - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

-- Seats currently held = pending + confirmed. Pending bookings hold their seats
-- until an admin confirms or rejects them, which is what prevents overbooking.
create or replace function public.kh_reserved_seats()
returns integer language sql stable as $$
  select coalesce(sum(quantity), 0)::integer
  from public.bookings where status in ('pending', 'confirmed');
$$;

create or replace function public.kh_public_status()
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'capacity',        s.capacity,
    'reserved',        public.kh_reserved_seats(),
    'confirmed',       (select coalesce(sum(quantity),0) from public.bookings where status = 'confirmed'),
    'remaining',       greatest(s.capacity - public.kh_reserved_seats(), 0),
    'max_per_booking', s.max_per_booking,
    'bookings_open',   s.bookings_open,
    'bank_name',       s.bank_name,
    'account_number',  s.account_number,
    'account_name',    s.account_name,
    'categories', coalesce((
      select json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name,
                                        'price', c.price, 'description', c.description)
                      order by c.sort_order, c.name)
      from public.ticket_categories c where c.active), '[]'::json)
  )
  from public.event_settings s where s.id = 1;
$$;

-- ---------------------------------------------------------------------------
-- create_booking: the ONLY way a booking is created. Atomic:
--   * locks the settings row so concurrent checkouts are serialised
--   * re-reads price from the DB (client-sent prices are never trusted)
--   * enforces remaining capacity, per-booking limit, duplicate rules
-- Always inserts with status 'pending' — never 'confirmed'.
-- ---------------------------------------------------------------------------
create or replace function public.kh_create_booking(
  p_id uuid,
  p_category_id uuid,
  p_quantity integer,
  p_full_name text,
  p_phone text,
  p_email text,
  p_payment_reference text,
  p_receipt_path text,
  p_receipt_sha256 text
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  s        public.event_settings%rowtype;
  cat      public.ticket_categories%rowtype;
  reserved integer;
  remaining integer;
  b        public.bookings%rowtype;
begin
  select * into s from public.event_settings where id = 1 for update;

  if not s.bookings_open then
    raise exception 'BOOKINGS_CLOSED' using errcode = 'P0001';
  end if;

  select * into cat from public.ticket_categories where id = p_category_id and active;
  if not found then
    raise exception 'INVALID_CATEGORY' using errcode = 'P0001';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > s.max_per_booking then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  reserved  := public.kh_reserved_seats();
  remaining := s.capacity - reserved;
  if p_quantity > remaining then
    raise exception 'SOLD_OUT:%', greatest(remaining, 0) using errcode = 'P0001';
  end if;

  -- One live (pending/confirmed) booking per email and per phone number.
  if exists (select 1 from public.bookings
             where status in ('pending', 'confirmed')
               and (lower(email) = lower(p_email) or phone = p_phone)) then
    raise exception 'DUPLICATE_CUSTOMER' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.bookings
             where status in ('pending', 'confirmed')
               and upper(payment_reference) = upper(p_payment_reference)) then
    raise exception 'DUPLICATE_REFERENCE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.bookings
             where status in ('pending', 'confirmed') and receipt_sha256 = p_receipt_sha256) then
    raise exception 'DUPLICATE_RECEIPT' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    id, booking_code, access_token, checkin_code,
    category_id, category_name, unit_price, quantity, amount,
    full_name, phone, email, payment_reference, receipt_path, receipt_sha256, status
  ) values (
    p_id,
    'KH-' || public.kh_random_code(6),
    encode(gen_random_bytes(24), 'hex'),
    public.kh_random_code(10),
    cat.id, cat.name, cat.price, p_quantity, cat.price * p_quantity,
    p_full_name, p_phone, lower(p_email), p_payment_reference, p_receipt_path, p_receipt_sha256,
    'pending'
  ) returning * into b;

  return json_build_object(
    'id', b.id, 'booking_code', b.booking_code, 'access_token', b.access_token,
    'amount', b.amount, 'quantity', b.quantity, 'category_name', b.category_name,
    'status', b.status
  );
end $$;

-- ---------------------------------------------------------------------------
-- Admin status transitions (called by the server after it has verified the
-- caller is in public.admins).
-- ---------------------------------------------------------------------------
create or replace function public.kh_set_booking_status(
  p_booking_id uuid, p_status public.booking_status, p_admin uuid, p_note text default null
) returns public.bookings language plpgsql security definer set search_path = public, extensions as $$
declare
  b public.bookings%rowtype;
  s public.event_settings%rowtype;
begin
  select * into s from public.event_settings where id = 1 for update;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;

  if p_status = 'confirmed' then
    if b.status = 'confirmed' then return b; end if;
    -- Re-confirming a previously rejected booking must still respect capacity
    if b.status in ('rejected', 'cancelled') and
       public.kh_reserved_seats() + b.quantity > s.capacity then
      raise exception 'SOLD_OUT:%', greatest(s.capacity - public.kh_reserved_seats(), 0) using errcode = 'P0001';
    end if;
    update public.bookings set status = 'confirmed', verified_at = now(), verified_by = p_admin,
      admin_note = coalesce(p_note, admin_note), updated_at = now()
      where id = p_booking_id returning * into b;
  elsif p_status in ('rejected', 'cancelled') then
    update public.bookings set status = p_status, verified_at = now(), verified_by = p_admin,
      checked_in_at = null, checked_in_by = null,
      admin_note = coalesce(p_note, admin_note), updated_at = now()
      where id = p_booking_id returning * into b;
  elsif p_status = 'pending' then
    if b.status in ('rejected', 'cancelled') and
       public.kh_reserved_seats() + b.quantity > s.capacity then
      raise exception 'SOLD_OUT:%', greatest(s.capacity - public.kh_reserved_seats(), 0) using errcode = 'P0001';
    end if;
    update public.bookings set status = 'pending', verified_at = null, verified_by = null,
      checked_in_at = null, checked_in_by = null, updated_at = now()
      where id = p_booking_id returning * into b;
  end if;
  return b;
end $$;

-- Capacity can never be set below the seats already held.
create or replace function public.kh_update_settings(
  p_capacity integer, p_max_per_booking integer, p_bookings_open boolean,
  p_bank_name text, p_account_number text, p_account_name text
) returns public.event_settings language plpgsql security definer set search_path = public, extensions as $$
declare s public.event_settings%rowtype;
begin
  select * into s from public.event_settings where id = 1 for update;
  if p_capacity < public.kh_reserved_seats() then
    raise exception 'CAPACITY_BELOW_RESERVED:%', public.kh_reserved_seats() using errcode = 'P0001';
  end if;
  update public.event_settings set
    capacity = p_capacity, max_per_booking = p_max_per_booking, bookings_open = p_bookings_open,
    bank_name = p_bank_name, account_number = p_account_number, account_name = p_account_name,
    updated_at = now()
  where id = 1 returning * into s;
  return s;
end $$;

revoke execute on function public.kh_create_booking(uuid, uuid, integer, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.kh_set_booking_status(uuid, public.booking_status, uuid, text) from public, anon, authenticated;
revoke execute on function public.kh_update_settings(integer, integer, boolean, text, text, text) from public, anon, authenticated;
revoke execute on function public.kh_public_status() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for payment receipts (5 MB max, images/PDF only).
-- No storage policies are created, so only the service role can read/write;
-- admins view receipts through short-lived signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
