alter table public.consultations
  add column if not exists preferred_date date,
  add column if not exists preferred_time time;

comment on column public.consultations.preferred_date is '상담신청인이 선택한 상담 희망일';
comment on column public.consultations.preferred_time is '상담신청인이 선택한 상담 희망시간';
