create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  path text not null default '/',
  user_agent text not null default 'unknown',
  visited_at timestamptz not null default now()
);

create index if not exists analytics_visits_visited_at_idx
  on public.analytics_visits(visited_at desc);

create index if not exists analytics_visits_ip_idx
  on public.analytics_visits(ip);

create table if not exists public.analytics_blocked_ips (
  ip text primary key,
  reason text,
  blocked_at timestamptz not null default now()
);

alter table public.analytics_visits enable row level security;
alter table public.analytics_blocked_ips enable row level security;

drop policy if exists "service role manages analytics visits" on public.analytics_visits;
create policy "service role manages analytics visits"
  on public.analytics_visits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages analytics blocked ips" on public.analytics_blocked_ips;
create policy "service role manages analytics blocked ips"
  on public.analytics_blocked_ips for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant select, insert, update, delete on public.analytics_visits to service_role;
grant select, insert, update, delete on public.analytics_blocked_ips to service_role;
