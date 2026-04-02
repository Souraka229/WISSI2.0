-- Raccourcis « thème / niveau » personnalisables sur la page création de quiz (par enseignant).
-- Valeurs JSON : tableaux d'objets { "value": "slug", "label": "Libellé" }.
-- NULL = utiliser les défauts applicatifs.

alter table public.profiles
  add column if not exists quiz_shortcut_themes jsonb;

alter table public.profiles
  add column if not exists quiz_shortcut_levels jsonb;

comment on column public.profiles.quiz_shortcut_themes is
  'Raccourcis thème (création quiz). Ex. [{"value":"history","label":"Histoire"}]. NULL = défauts app.';
comment on column public.profiles.quiz_shortcut_levels is
  'Raccourcis niveau. Ex. [{"value":"beginner","label":"Débutant"}]. NULL = défauts app.';
