-- StayBuddy POS Subscription Management Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================================
-- 1. SUBSCRIPTIONS
-- One row per hotel / installation
-- ============================================================
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  hotel_name      text not null,
  ip_address      text not null,
  port            text not null,
  activation_code text unique not null,
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  is_active       boolean not null default true,
  max_devices     int not null default 4,   -- max Android devices allowed per subscription
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 2. DEVICES
-- One row per physical Android device that activated with a code
-- ============================================================
create table if not exists public.devices (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  device_id       text not null unique,
  device_name     text,
  device_model    text,
  android_version text,
  app_version     text,
  activated_at    timestamptz not null default now(),
  last_seen_at    timestamptz
);

create index if not exists devices_subscription_id_idx on public.devices(subscription_id);
create index if not exists devices_device_id_idx on public.devices(device_id);

-- ============================================================
-- 3. DEVICE_LOGINS
-- Every login event logged here (user + device + timestamp)
-- ============================================================
create table if not exists public.device_logins (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  device_id       text not null,
  device_name     text,
  user_name       text,
  app_version     text,
  login_at        timestamptz not null default now(),
  logout_at       timestamptz
);

create index if not exists device_logins_subscription_id_idx on public.device_logins(subscription_id);
create index if not exists device_logins_device_id_idx on public.device_logins(device_id);
create index if not exists device_logins_login_at_idx on public.device_logins(login_at desc);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- The API routes use the service role key so RLS is bypassed
-- for server-side calls. Enable RLS to block direct anon access.
-- ============================================================
alter table public.subscriptions enable row level security;
alter table public.devices enable row level security;
alter table public.device_logins enable row level security;

-- Only authenticated admin users (Supabase Auth) can read/write via browser
create policy "Authenticated admins full access on subscriptions"
  on public.subscriptions for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admins full access on devices"
  on public.devices for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admins full access on device_logins"
  on public.device_logins for all
  to authenticated
  using (true)
  with check (true);

-- Anon (Flutter via service-role API route) is blocked directly;
-- all Flutter calls go through the Next.js API which uses service_role.

-- Allow Flutter app (anon key) to SELECT active subscriptions
-- so Supabase Realtime works for real-time IP/port push updates.
create policy "Anon can select active subscriptions for realtime"
  on public.subscriptions for select
  to anon
  using (is_active = true);

-- ============================================================
-- REALTIME: Enable push notifications for IP/port changes
-- Run this to allow Flutter to receive instant config updates
-- when admin changes IP/port in the dashboard.
-- ============================================================
alter publication supabase_realtime add table public.subscriptions;

-- ============================================================
-- MIGRATIONS: Run these if the tables already exist
-- ============================================================
-- alter table public.subscriptions
--   add column if not exists max_devices int not null default 4;
-- alter publication supabase_realtime add table public.subscriptions;
