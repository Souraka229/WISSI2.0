# Guide enseignant — SCITI-Quiz

Parcours complet du **côté professeur** : de la création du quiz à la session live.

## 0. Aide intégrée à l’app

- Page **Aide pas à pas** (accessible connecté ou non) : **`/aide`**
- Sur le tableau de bord : encart **Facilitateur prof** + lien **Aide** dans la barre du haut.

## 1. Compte et connexion

1. Créez un compte sur `/auth/sign-up` ou connectez-vous sur `/auth/login`.
2. Vous arrivez sur **Mes quiz** (`/dashboard`).

## 2. Créer un quiz

1. Cliquez **Nouveau quiz** (ou **Créer mon premier quiz** si la liste est vide).
2. Renseignez le **titre** (obligatoire) et une **description** (recommandée).
3. Utilisez les **raccourcis 1 clic** (thème / niveau) ou les listes déroulantes.
4. Validez avec **Créer et ouvrir l’éditeur** — vous êtes redirigé vers la fiche du quiz.

## 3. Ajouter des questions

Sur la page **Modifier le quiz** (`/dashboard/quiz/[id]`) :

- **Manuel** : bouton pour ajouter une question (QCM, vrai/faux, etc.).
- **SuperPrompt + ChatGPT** : copiez le prompt, collez le JSON renvoyé par ChatGPT, importez.
- **Génération serveur** : si `OPENAI_API_KEY` ou `GROQ_API_KEY` est configurée, utilisez **Générer sur le serveur**.

## 4. Lancer une session live

1. Ouvrez **Lancer** depuis la carte du quiz (`/dashboard/launch/[id]`).
2. Choisissez le **mode** (Challenge libre ou Défis du prof avec 2 quiz si besoin).
3. Cliquez **Lancer la session** — notez le **PIN** et le **QR code**.
4. Ouvrez **Ouvrir le pupitre animateur** pour piloter la partie.

## 5. Pendant la session (pupitre)

- **Démarrer la partie** : les élèves passent de la salle d’attente à la 1ʳᵉ question.
- **Montrer le TOP 5** : affichage du classement chez les joueurs.
- **Question suivante ou fin** : enchaîne ou termine la session.
- **Terminer la session** : fin immédiate.

Les élèves rejoignent via **`/join`** (code PIN ou scan QR).

## 6. Tester en tant qu’élève

Depuis le tableau de bord, **Tester /join** ouvre la page rejoindre : utile pour vérifier le flux avant un cours.

## 7. Supprimer un quiz

Sur la carte du quiz, icône **corbeille** → confirmation. **Action irréversible** (quiz + questions).

## 8. Base de données (important)

Exécutez les scripts SQL dans l’ordre sur Supabase :

1. `scripts/001_create_schema.sql`
2. `scripts/002_live_game_modes.sql`

Activez le **Realtime** sur les tables indiquées dans `002` (sessions, participants, reactions) pour la synchro live.

## Dépannage rapide

| Problème | Piste |
|----------|--------|
| Élèves ne voient pas les questions | RLS + migration `002` + Realtime |
| Pupitre affiche une erreur vague en prod | Messages d’erreur métier (voir `hostControlSession`) + logs Vercel |
| SuperPrompt / copie | Voir section SuperPrompt sur la fiche quiz |

Pour la configuration des variables d’environnement, voir `.env.example` à la racine du projet.
