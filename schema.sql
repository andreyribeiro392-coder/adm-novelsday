create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  synopsis text,
  cover_url text,
  hero_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  number integer not null check (number > 0),
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  access text not null default 'free' check (access in ('free','premium')),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, number)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  provider_subscription_id text unique,
  status text not null default 'inactive' check (status in ('inactive','active','past_due','cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  provider_payment_id text unique,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  status text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
alter table public.series enable row level security;
alter table public.episodes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

drop policy if exists "admin can read own admin record" on public.admin_users;
create policy "admin can read own admin record" on public.admin_users
for select using (user_id = auth.uid());

drop policy if exists "published series are public" on public.series;
create policy "published series are public" on public.series
for select using (status = 'published' or public.is_admin());

drop policy if exists "admins manage series" on public.series;
create policy "admins manage series" on public.series
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published episodes are public" on public.episodes;
create policy "published episodes are public" on public.episodes
for select using (status = 'published' or public.is_admin());

drop policy if exists "admins manage episodes" on public.episodes;
create policy "admins manage episodes" on public.episodes
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own subscriptions" on public.subscriptions;
create policy "users read own subscriptions" on public.subscriptions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage subscriptions" on public.subscriptions;
create policy "admins manage subscriptions" on public.subscriptions
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments" on public.payments
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage payments" on public.payments;
create policy "admins manage payments" on public.payments
for all using (public.is_admin()) with check (public.is_admin());

create index if not exists series_status_idx on public.series(status);
create index if not exists episodes_series_idx on public.episodes(series_id, number);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id, status);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);
