-- Superadmin (rôle), analytics (événements) et consentement cookies.
-- Exécuter une fois sur le projet Supabase (SQL Editor ou migration).
-- Promouvoir un compte : update public.profiles set role = 'superadmin' where email = 'vous@exemple.com';
--
-- Pour accès lecture/écriture sur TOUTES les tables métier (quiz, sessions, cookies, etc.) :
-- exécuter aussi scripts/008_superadmin_full_access.sql

-- ---------------------------------------------------------------------------
-- Rôle sur les profils
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'superadmin'));

-- ---------------------------------------------------------------------------
-- Superadmin courant uniquement (sans argument = pas de fuite sur d’autres UUID)
-- ---------------------------------------------------------------------------
drop function if exists public.is_superadmin(uuid);

create or replace function public.current_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'superadmin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_is_superadmin() from public;
grant execute on function public.current_is_superadmin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Événements analytics (insert uniquement côté serveur via service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text,
  event_name text not null,
  path text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_superadmin_select" on public.analytics_events;
create policy "analytics_events_superadmin_select"
  on public.analytics_events for select
  using (public.current_is_superadmin());

-- Aucune policy INSERT/UPDATE/DELETE pour anon/authenticated : écriture via service_role (API routes).

-- ---------------------------------------------------------------------------
-- Consentements cookies (écriture serveur ; lecture superadmin)
-- ---------------------------------------------------------------------------
create table if not exists public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text not null,
  necessary boolean not null default true,
  analytics boolean not null default false,
  marketing boolean not null default false,
  consent_version text not null default '1',
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cookie_consents_anonymous_id_key
  on public.cookie_consents (anonymous_id);

create index if not exists cookie_consents_user_id_idx
  on public.cookie_consents (user_id)
  where user_id is not null;

alter table public.cookie_consents enable row level security;

drop policy if exists "cookie_consents_superadmin_select" on public.cookie_consents;
create policy "cookie_consents_superadmin_select"
  on public.cookie_consents for select
  using (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Superadmin : lecture de tous les profils
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_superadmin_select_all" on public.profiles;
create policy "profiles_superadmin_select_all"
  on public.profiles for select
  using (public.current_is_superadmin());
