-- Chrono question synchronisé (animateur peut raccourcir / couper) + calcul du temps de réponse côté élève.
-- À exécuter dans Supabase SQL Editor après 002.

alter table public.sessions
  add column if not exists question_started_at timestamptz;

alter table public.sessions
  add column if not exists question_deadline_at timestamptz;

comment on column public.sessions.question_started_at is 'Début du temps imparti pour la question affichée (index courant).';
comment on column public.sessions.question_deadline_at is 'Fin du temps : les élèves synchronisent le décompte ; l’animateur peut la rapprocher.';
