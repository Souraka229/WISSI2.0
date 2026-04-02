-- Effet viralité : aperçu public d’un quiz (sans exposer les questions / réponses).
-- À exécuter une fois sur le projet Supabase (SQL Editor).
--
-- 1) Tout utilisateur (y compris anon) peut lire les lignes quizzes avec is_public = true
--    (métadonnées uniquement côté UI — ne pas afficher user_id côté client).
-- 2) RPC sécurisée : JSON titre + thème + nombre de questions, seulement si is_public.

-- ---------------------------------------------------------------------------
-- Lecture des quiz publics (complète la policy « propriétaire uniquement »)
-- ---------------------------------------------------------------------------
drop policy if exists "quizzes_select_public" on public.quizzes;

create policy "quizzes_select_public"
  on public.quizzes
  for select
  using (is_public = true);

-- ---------------------------------------------------------------------------
-- Aperçu pour la page /q/[id] — pas de fuite des contenus des questions
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_quiz_preview(uuid);

create or replace function public.get_public_quiz_preview(p_quiz_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'theme', q.theme,
    'level', q.level,
    'question_count', (
      select count(*)::int
      from public.questions qq
      where qq.quiz_id = q.id
    )
  )
  from public.quizzes q
  where q.id = p_quiz_id
    and q.is_public = true;
$$;

revoke all on function public.get_public_quiz_preview(uuid) from public;
grant execute on function public.get_public_quiz_preview(uuid) to anon, authenticated;

comment on function public.get_public_quiz_preview(uuid) is
  'Aperçu viral : métadonnées + compte de questions pour quiz public uniquement.';
