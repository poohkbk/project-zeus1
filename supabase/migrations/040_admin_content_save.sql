alter table public.cases add column if not exists cms_id text;
alter table public.legal_guides add column if not exists cms_id text;
alter table public.faqs add column if not exists cms_id text;

create unique index if not exists cases_cms_id_unique_idx
  on public.cases(cms_id)
  where cms_id is not null;

create unique index if not exists legal_guides_cms_id_unique_idx
  on public.legal_guides(cms_id)
  where cms_id is not null;

create unique index if not exists faqs_cms_id_unique_idx
  on public.faqs(cms_id)
  where cms_id is not null;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.cases to service_role;
grant select, insert, update, delete on public.legal_guides to service_role;
grant select, insert, update, delete on public.faqs to service_role;
grant all privileges on all sequences in schema public to service_role;
