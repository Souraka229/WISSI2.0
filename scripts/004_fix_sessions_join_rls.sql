-- Si /join affiche toujours « code invalide » alors que le PIN est bon :
-- la politique RLS qui autorise la lecture publique des sessions a peut‑être été supprimée.
-- Exécuter ce script dans Supabase SQL Editor (idempotent).

drop policy if exists "sessions_select_by_pin" on public.sessions;

create policy "sessions_select_by_pin"
  on public.sessions
  for select
  using (true);
