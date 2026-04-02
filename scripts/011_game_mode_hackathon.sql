-- Mode jeu « hackathon » (2 quiz enchaînés, même logique que prof_dual côté app).
-- Idempotent : recrée la contrainte game_mode sur public.sessions.

alter table public.sessions drop constraint if exists sessions_game_mode_check;

alter table public.sessions
  add constraint sessions_game_mode_check
  check (game_mode in ('challenge_free', 'prof_dual', 'hackathon'));

comment on column public.sessions.game_mode is
  'challenge_free | prof_dual | hackathon (hackathon = intense / 2 quiz, comme prof_dual).';
