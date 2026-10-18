-- Advanced MRI Safety Officer Academy — Supabase schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  role            text not null default 'learner' check (role in ('learner', 'admin')),
  disabled        boolean not null default false,
  certificate_revoked boolean not null default false,
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz
);

-- One row per learner holding their whole progress document (same shape as the
-- browser store in src/lib/progress.ts).
create table if not exists public.progress (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically for every new sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Learners may edit their own name/last-active time, but never their role,
-- disabled flag or certificate status. Only admins may change those.
-- Requests from the website carry a JWT role ('authenticated'/'anon'); the
-- Supabase SQL editor and service role do not, so owners can still manage roles.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role
       or new.disabled is distinct from old.disabled
       or new.certificate_revoked is distinct from old.certificate_revoked
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'Not allowed to change protected profile fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "progress: read own or admin" on public.progress;
create policy "progress: read own or admin" on public.progress
  for select using (user_id = auth.uid() or public.is_admin());

-- Learners write only their own progress, and not while disabled.
drop policy if exists "progress: insert own" on public.progress;
create policy "progress: insert own" on public.progress
  for insert with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.disabled)
  );

drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.disabled)
  );

-- Admins may reset (delete) a learner's progress.
drop policy if exists "progress: admin delete" on public.progress;
create policy "progress: admin delete" on public.progress
  for delete using (public.is_admin());

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.progress to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Make yourself an admin (run AFTER you have signed up on the site):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ─────────────────────────────────────────────────────────────
