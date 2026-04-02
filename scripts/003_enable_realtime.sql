-- Publication Realtime Supabase pour le jeu live (host + élèves).
-- À exécuter dans Supabase → SQL Editor après 001 et 002.
--
-- Si une table est déjà dans la publication, Postgres renvoie une erreur du type
-- « already part of publication » : dans ce cas, ignorer la ligne concernée.
--
-- Équivalent manuel : Dashboard → Database → Publications → supabase_realtime
-- → cocher : sessions, participants, reactions, answers

ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
