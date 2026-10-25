create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

create table if not exists public.viewing_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

alter table public.favorites enable row level security;
alter table public.viewing_progress enable row level security;

drop policy if exists "users manage own favorites" on public.favorites;
create policy "users manage own favorites" on public.favorites
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users manage own progress" on public.viewing_progress;
create policy "users manage own progress" on public.viewing_progress
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists favorites_user_idx on public.favorites(user_id, created_at desc);
create index if not exists progress_user_idx on public.viewing_progress(user_id, updated_at desc);
