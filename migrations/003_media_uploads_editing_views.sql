alter table public.series add column if not exists tagline text;
alter table public.series add column if not exists category text;

alter table public.episodes add column if not exists caption text;
alter table public.episodes add column if not exists video_path text;
alter table public.episodes add column if not exists subtitle_url text;

create table if not exists public.episode_views (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.episode_views enable row level security;
create index if not exists episode_views_episode_idx on public.episode_views(episode_id, created_at desc);
create index if not exists episode_views_created_idx on public.episode_views(created_at desc);

insert into storage.buckets(id,name,public) values
('novels-images','novels-images',true),
('novels-videos','novels-videos',false),
('novels-subtitles','novels-subtitles',true)
on conflict(id) do update set public=excluded.public;

-- Em produção, as policies desses buckets permitem escrita apenas para private.is_admin().
-- O bucket novels-videos é privado; episódios gratuitos ou assinantes ativos recebem acesso conforme RLS.
