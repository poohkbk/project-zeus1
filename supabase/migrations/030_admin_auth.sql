grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles to authenticated, service_role;
grant insert, update, delete on public.profiles to service_role;

drop policy if exists "active admins manage cms profiles" on public.profiles;
drop policy if exists "active admins read own profile" on public.profiles;

create policy "active admins read own profile"
  on public.profiles for select
  using (email = auth.email() and active = true);

insert into public.profiles (email, name, role, active)
values ('tglaw-kbk@nate.com', '강병권 변호사', 'super_admin', true)
on conflict (email) do update
set name = excluded.name,
    role = excluded.role,
    active = excluded.active;
