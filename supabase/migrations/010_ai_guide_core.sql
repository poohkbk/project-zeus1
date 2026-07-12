create extension if not exists "pgcrypto";

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  reception_number text not null unique,
  name text not null,
  phone text not null,
  category text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'closed')),
  memo text not null default '',
  source text not null default 'direct',
  ai_session_id uuid,
  ai_summary jsonb,
  ai_urgency_level text,
  ai_category text,
  ai_subcategory text,
  ai_transfer_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_guide_sessions (
  id uuid primary key default gen_random_uuid(),
  public_token_hash text not null,
  status text not null check (status in ('started', 'questioning', 'completed', 'abandoned', 'transferred')),
  initial_question_redacted text not null default '',
  category text not null default 'unclear',
  subcategory text,
  classification_confidence numeric,
  urgency_level text not null default 'normal',
  generated_by text not null default 'rule',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  consultation_id uuid references public.consultations(id),
  consent_to_transfer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_guide_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_guide_sessions(id) on delete cascade,
  question_id text not null,
  field_name text not null,
  answer_value jsonb,
  answer_redacted jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_guide_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.ai_guide_sessions(id) on delete cascade,
  result_data jsonb not null,
  consultation_summary jsonb not null,
  safety_flags jsonb not null default '{}'::jsonb,
  related_content jsonb not null default '{}'::jsonb,
  prompt_version text,
  model_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_guide_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.ai_guide_sessions(id) on delete set null,
  event_name text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_guide_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_guide_sessions(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  reason_code text,
  comment_redacted text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_safety_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.ai_guide_sessions(id) on delete set null,
  risk_type text not null,
  risk_level text not null,
  action_taken text not null,
  details_redacted jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_daily (
  usage_date date primary key,
  request_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost numeric not null default 0,
  failure_count integer not null default 0,
  fallback_count integer not null default 0,
  average_latency_ms integer not null default 0
);

alter table public.consultations enable row level security;
alter table public.ai_guide_sessions enable row level security;
alter table public.ai_guide_answers enable row level security;
alter table public.ai_guide_results enable row level security;
alter table public.ai_guide_events enable row level security;
alter table public.ai_guide_feedback enable row level security;
alter table public.ai_safety_events enable row level security;
alter table public.ai_usage_daily enable row level security;

create index if not exists ai_guide_sessions_expires_at_idx on public.ai_guide_sessions(expires_at);
create index if not exists ai_guide_sessions_category_idx on public.ai_guide_sessions(category);
create index if not exists ai_guide_answers_session_id_idx on public.ai_guide_answers(session_id);
create index if not exists ai_guide_events_session_id_idx on public.ai_guide_events(session_id);
create index if not exists consultations_ai_session_id_idx on public.consultations(ai_session_id);

create policy "anonymous create consultations"
  on public.consultations for insert
  with check (true);

create policy "active admins manage consultations"
  on public.consultations for all
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true))
  with check (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "anonymous create ai sessions"
  on public.ai_guide_sessions for insert
  with check (true);

create policy "anonymous create ai answers"
  on public.ai_guide_answers for insert
  with check (true);

create policy "anonymous create ai results"
  on public.ai_guide_results for insert
  with check (true);

create policy "anonymous create ai events"
  on public.ai_guide_events for insert
  with check (true);

create policy "anonymous create ai feedback"
  on public.ai_guide_feedback for insert
  with check (true);

create policy "active admins read ai sessions"
  on public.ai_guide_sessions for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins read ai answers"
  on public.ai_guide_answers for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins read ai results"
  on public.ai_guide_results for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins read ai events"
  on public.ai_guide_events for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins read ai safety events"
  on public.ai_safety_events for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));

create policy "active admins read ai usage"
  on public.ai_usage_daily for select
  using (exists (select 1 from public.profiles p where p.email = auth.email() and p.active = true));
