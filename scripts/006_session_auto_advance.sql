-- Défilement automatique (pupitre) : classement puis question suivante sans clic manuel.
-- Exécuter dans Supabase SQL Editor après 005.

alter table public.sessions
  add column if not exists auto_advance boolean not null default false;

comment on column public.sessions.auto_advance is 'Si vrai : après la fin du chrono → TOP 5 puis question suivante (pupitre ouvert).';
