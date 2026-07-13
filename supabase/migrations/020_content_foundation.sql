create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cases add column if not exists slug text;
alter table public.cases add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.cases add column if not exists published_at timestamptz;

alter table public.legal_guides add column if not exists slug text;
alter table public.legal_guides add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.legal_guides add column if not exists published_at timestamptz;

alter table public.faqs add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.faqs add column if not exists published_at timestamptz;

alter table public.consultations add column if not exists privacy_agreed boolean not null default false;

update public.cases
set slug = page_address
where slug is null and page_address is not null;

update public.legal_guides
set slug = page_address
where slug is null and page_address is not null;

update public.cases
set published_at = created_at
where published_at is null and status = 'published';

update public.legal_guides
set published_at = created_at
where published_at is null and status = 'published';

update public.faqs
set published_at = created_at
where published_at is null and status = 'published';

create unique index if not exists cases_slug_unique_idx on public.cases(slug) where slug is not null;
create unique index if not exists legal_guides_slug_unique_idx on public.legal_guides(slug) where slug is not null;
create unique index if not exists faqs_question_unique_idx on public.faqs(question);
create index if not exists cases_public_status_idx on public.cases(status, published_at);
create index if not exists legal_guides_public_status_idx on public.legal_guides(status, published_at);
create index if not exists faqs_public_status_idx on public.faqs(status, published_at);
create index if not exists categories_active_sort_idx on public.categories(active, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cases_updated_at on public.cases;
create trigger set_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

drop trigger if exists set_legal_guides_updated_at on public.legal_guides;
create trigger set_legal_guides_updated_at
  before update on public.legal_guides
  for each row execute function public.set_updated_at();

drop trigger if exists set_faqs_updated_at on public.faqs;
create trigger set_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

drop trigger if exists set_consultations_updated_at on public.consultations;
create trigger set_consultations_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.cases enable row level security;
alter table public.legal_guides enable row level security;
alter table public.faqs enable row level security;
alter table public.consultations enable row level security;

drop policy if exists "public read published cases" on public.cases;
create policy "public read published cases"
  on public.cases for select
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

drop policy if exists "public read published guides" on public.legal_guides;
create policy "public read published guides"
  on public.legal_guides for select
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

drop policy if exists "public read published faqs" on public.faqs;
create policy "public read published faqs"
  on public.faqs for select
  using (
    status = 'published'
    and (published_at is null or published_at <= now())
  );

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories"
  on public.categories for select
  using (active = true);

drop policy if exists "anonymous create consultations" on public.consultations;
create policy "anonymous create consultations"
  on public.consultations for insert
  with check (
    privacy_agreed = true
    and name <> ''
    and phone <> ''
    and message <> ''
  );

drop policy if exists "active admins manage cases" on public.cases;
drop policy if exists "active admins manage guides" on public.legal_guides;
drop policy if exists "active admins manage faqs" on public.faqs;

insert into public.categories (slug, label, description, sort_order, active)
values
  ('civil', '민사', '금전, 계약, 손해배상, 부동산 등 민사 사건', 10, true),
  ('criminal', '형사', '경찰 조사, 고소, 음주운전, 사기 등 형사 사건', 20, true),
  ('divorce', '이혼·가사', '이혼, 재산분할, 양육권, 상간 등 가사 사건', 30, true),
  ('inheritance', '상속', '상속포기, 한정승인, 유류분, 상속재산분할', 40, true),
  ('administrative', '행정', '영업정지, 면허취소, 행정처분 등 행정 사건', 50, true)
on conflict (slug) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = excluded.active;
