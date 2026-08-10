create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  cms_id text unique,
  title text not null,
  category text not null default 'civil',
  summary text,
  body text not null,
  status text not null default 'draft',
  tags text[] not null default '{}',
  hero_image_url text,
  hero_image_alt text,
  is_featured boolean not null default false,
  show_on_home boolean not null default false,
  show_on_search boolean not null default true,
  sort_order integer,
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists testimonials_title_unique_idx on public.testimonials(title);
create index if not exists testimonials_public_status_idx on public.testimonials(status, published_at);

drop trigger if exists set_testimonials_updated_at on public.testimonials;
create trigger set_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

drop policy if exists "public read published testimonials" on public.testimonials;
create policy "public read published testimonials"
  on public.testimonials for select
  using (status = 'published' and (published_at is null or published_at <= now()));

grant select, insert, update, delete on public.testimonials to service_role;
