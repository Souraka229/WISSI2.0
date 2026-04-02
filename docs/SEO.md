# SEO — SCITI-Quiz

## Ce qui est en place (technique)

- **`metadataBase`** et **URL canonique** : définies via `NEXT_PUBLIC_APP_URL` (ou `VERCEL_URL` en déploiement Vercel). Sans URL publique correcte, Google indexera mal les liens absolus.
- **`sitemap.xml`** : généré par `app/sitemap.ts` (accueil, `/join`, pages d’auth publiques).
- **`robots.txt`** : `app/robots.ts` — autorise l’indexation des pages marketing ; **exclut** `/dashboard/`, `/api/`, `/student/`, etc.
- **Métadonnées** : titre, description, mots-clés, Open Graph, Twitter Card, `lang="fr"`.
- **Données structurées** : JSON-LD (`WebSite`, `Organization`, `SoftwareApplication`) dans `components/seo/organization-json-ld.tsx`.
- **Manifest PWA** : `public/manifest.webmanifest` (référencé dans les metadata).
- **Espace prof** : `app/dashboard/layout.tsx` avec `robots: noindex` pour éviter d’indexer du contenu privé / dupliqué.

## Variable d’environnement indispensable en production

```bash
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

Sans cela, le sitemap et les URLs sociales peuvent pointer vers `localhost`.

## « Être n°1 sur Google » — attentes réalistes

Personne ne peut **garantir** la 1ʳᵉ position : cela dépend du secteur, de la concurrence (Kahoot, etc.), des **backlinks**, de la **vitesse** du site, du **contenu** unique, et des mises à jour de l’algorithme.

Ce dépôt met en place les **bonnes pratiques techniques** (crawl, indexation, partage social). Pour aller plus loin :

- Publier du **contenu utile** (pages blog, tutoriels, cas d’usage SCITI).
- Obtenir des liens depuis des sites **éducation / université**.
- Surveiller **Google Search Console** (couverture, requêtes, Core Web Vitals).

## Page d’accueil

La landing (`app/page.tsx`) est en **Client Component** : les titres SEO principaux viennent du `layout` racine. Pour affiner le SEO par section, on peut extraire des blocs en Server Components ou ajouter une route marketing dédiée.
