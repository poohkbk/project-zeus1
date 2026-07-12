create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('super_admin', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  page_address text not null unique,
  category text not null,
  summary text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'private', 'scheduled', 'trash')),
  tags text[] not null default '{}',
  hero_image_url text,
  hero_image_alt text,
  is_featured boolean not null default false,
  show_on_home boolean not null default false,
  show_on_category boolean not null default false,
  show_on_practice boolean not null default false,
  show_on_search boolean not null default true,
  featured_order integer,
  featured_start_at timestamptz,
  featured_end_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  page_address text not null unique,
  category text not null,
  summary text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'private', 'scheduled', 'trash')),
  tags text[] not null default '{}',
  hero_image_url text,
  hero_image_alt text,
  is_featured boolean not null default false,
  show_on_home boolean not null default false,
  show_on_search boolean not null default true,
  featured_order integer,
  featured_start_at timestamptz,
  featured_end_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'private', 'scheduled', 'trash')),
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  show_on_home boolean not null default false,
  show_on_search boolean not null default true,
  sort_order integer,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.content_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  alt_text text not null default '',
  mime_type text not null,
  file_size integer not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  revision_data jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_draft_jobs (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid,
  status text not null,
  requested_by uuid references public.profiles(id),
  input_metadata jsonb not null default '{}'::jsonb,
  output_data jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.legal_guides enable row level security;
alter table public.faqs enable row level security;
alter table public.content_categories enable row level security;
alter table public.content_tags enable row level security;
alter table public.media_assets enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.content_revisions enable row level security;
alter table public.ai_draft_jobs enable row level security;

create policy "public read published cases"
  on public.cases for select
  using (status = 'published');

create policy "public read published guides"
  on public.legal_guides for select
  using (status = 'published');

create policy "public read published faqs"
  on public.faqs for select
  using (status = 'published');

create policy "active admins manage cms profiles"
  on public.profiles for all
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true))
  with check (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins manage cases"
  on public.cases for all
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true))
  with check (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins manage guides"
  on public.legal_guides for all
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true))
  with check (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins manage faqs"
  on public.faqs for all
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true))
  with check (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));
