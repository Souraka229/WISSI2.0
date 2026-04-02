-- Accès complet superadmin sur les données métier (lecture + corrections).
-- À exécuter après scripts/001, 003 (current_is_superadmin), 007 si présent.
-- Les politiques s’ajoutent en OU aux politiques existantes (hôte, public, etc.).

-- ---------------------------------------------------------------------------
-- Profils : mise à jour rôle / display_name (support)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_superadmin_update_all" on public.profiles;
create policy "profiles_superadmin_update_all"
  on public.profiles for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Quiz & questions (voir tout le contenu, corriger ou supprimer)
-- ---------------------------------------------------------------------------
drop policy if exists "quizzes_superadmin_select_all" on public.quizzes;
create policy "quizzes_superadmin_select_all"
  on public.quizzes for select
  using (public.current_is_superadmin());

drop policy if exists "quizzes_superadmin_update" on public.quizzes;
create policy "quizzes_superadmin_update"
  on public.quizzes for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "quizzes_superadmin_delete" on public.quizzes;
create policy "quizzes_superadmin_delete"
  on public.quizzes for delete
  using (public.current_is_superadmin());

drop policy if exists "quizzes_superadmin_insert" on public.quizzes;
create policy "quizzes_superadmin_insert"
  on public.quizzes for insert
  with check (public.current_is_superadmin());

drop policy if exists "questions_superadmin_select_all" on public.questions;
create policy "questions_superadmin_select_all"
  on public.questions for select
  using (public.current_is_superadmin());

drop policy if exists "questions_superadmin_update" on public.questions;
create policy "questions_superadmin_update"
  on public.questions for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "questions_superadmin_delete" on public.questions;
create policy "questions_superadmin_delete"
  on public.questions for delete
  using (public.current_is_superadmin());

drop policy if exists "questions_superadmin_insert" on public.questions;
create policy "questions_superadmin_insert"
  on public.questions for insert
  with check (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Sessions (pilotage / nettoyage)
-- ---------------------------------------------------------------------------
drop policy if exists "sessions_superadmin_update" on public.sessions;
create policy "sessions_superadmin_update"
  on public.sessions for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "sessions_superadmin_delete" on public.sessions;
create policy "sessions_superadmin_delete"
  on public.sessions for delete
  using (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Participants & réponses (modération, RGPD)
-- ---------------------------------------------------------------------------
drop policy if exists "participants_superadmin_update" on public.participants;
create policy "participants_superadmin_update"
  on public.participants for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "participants_superadmin_delete" on public.participants;
create policy "participants_superadmin_delete"
  on public.participants for delete
  using (public.current_is_superadmin());

drop policy if exists "answers_superadmin_update" on public.answers;
create policy "answers_superadmin_update"
  on public.answers for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "answers_superadmin_delete" on public.answers;
create policy "answers_superadmin_delete"
  on public.answers for delete
  using (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Réactions live
-- ---------------------------------------------------------------------------
drop policy if exists "reactions_superadmin_delete" on public.reactions;
create policy "reactions_superadmin_delete"
  on public.reactions for delete
  using (public.current_is_superadmin());

-- ---------------------------------------------------------------------------
-- Analytics & cookies (purge / correction)
-- ---------------------------------------------------------------------------
drop policy if exists "analytics_events_superadmin_delete" on public.analytics_events;
create policy "analytics_events_superadmin_delete"
  on public.analytics_events for delete
  using (public.current_is_superadmin());

drop policy if exists "analytics_events_superadmin_update" on public.analytics_events;
create policy "analytics_events_superadmin_update"
  on public.analytics_events for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "cookie_consents_superadmin_update" on public.cookie_consents;
create policy "cookie_consents_superadmin_update"
  on public.cookie_consents for update
  using (public.current_is_superadmin())
  with check (public.current_is_superadmin());

drop policy if exists "cookie_consents_superadmin_delete" on public.cookie_consents;
create policy "cookie_consents_superadmin_delete"
  on public.cookie_consents for delete
  using (public.current_is_superadmin());

comment on table public.analytics_events is 'Événements analytics ; superadmin : lecture (003) + update/delete (008).';
comment on table public.cookie_consents is 'Consentements cookies ; superadmin : lecture (003) + update/delete (008).';
