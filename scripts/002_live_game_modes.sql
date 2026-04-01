-- Modes de jeu en direct, scores cumulés, lecture questions pour participants
-- Exécuter après 001_create_schema.sql dans l’éditeur SQL Supabase.
--
-- Realtime (temps quasi WebSocket) : Dashboard Supabase → Database → Publications
--   cocher les tables : public.sessions, public.participants, public.reactions
--   (sinon les écrans joueur / pupitre ne se mettent pas à jour tout seuls).

-- Idempotent : supprimer les politiques si elles existent déjà
drop policy if exists "questions_select_live_session" on public.questions;
drop policy if exists "quizzes_select_live_guest" on public.quizzes;

-- Colonnes session
alter table public.sessions
  add column if not exists game_mode text not null default 'challenge_free'
    check (game_mode in ('challenge_free', 'prof_dual'));

alter table public.sessions
  add column if not exists secondary_quiz_id uuid references public.quizzes(id) on delete set null;

-- Étendre les statuts pour la synchro animateur / joueurs
alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('waiting', 'active', 'question', 'results', 'finished'));

-- Participants : niveau + expérience ludique
alter table public.participants
  add column if not exists level integer not null default 1;

-- Les étudiants doivent pouvoir LIRE les questions des quiz liés à une session en cours
create policy "questions_select_live_session" on public.questions
for select
using (
  exists (
    select 1 from public.sessions s
    where (s.quiz_id = questions.quiz_id or s.secondary_quiz_id = questions.quiz_id)
      and s.status in ('waiting', 'active', 'question', 'results')
  )
);

-- Titre du quiz pour l’UI joueur
create policy "quizzes_select_live_guest" on public.quizzes
for select
using (
  exists (
    select 1 from public.sessions s
    where s.quiz_id = quizzes.id
      and s.status in ('waiting', 'active', 'question', 'results')
  )
  or exists (
    select 1 from public.sessions s2
    where s2.secondary_quiz_id = quizzes.id
      and s2.status in ('waiting', 'active', 'question', 'results')
  )
);
