# ClubSport — Projet fil rouge Next.js

Application de gestion d'un **club sportif multi-sites** : les adhérents
réservent des séances encadrées, les coachs valident les présences, les
administrateurs pilotent le planning et les adhésions.

Projet M2 EEMI 2026 — Next.js 16.3.5 (App Router), React 19, Prisma, PostgreSQL.

| | |
|---|---|
| **Application en ligne** | https://clubsport-seven.vercel.app |
| **Dépôt** | https://github.com/TahirouM/nextjs-eemi |
| **Langues** | Français · English |

---

## 1. Démarrage rapide

```bash
# 1. Base de données PostgreSQL (Docker)
docker run -d --name clubsport-db \
  -e POSTGRES_USER=clubsport \
  -e POSTGRES_PASSWORD=clubsport \
  -e POSTGRES_DB=clubsport \
  -p 5440:5432 postgres:16-alpine

# 2. Variables d'environnement
cp .env.example .env     # puis renseigner DATABASE_URL et AUTH_SECRET

# 3. Dépendances, schéma, données de démonstration
npm install
npm run db:migrate       # applique les migrations Prisma
npm run db:seed          # crée sites, activités, 80 séances, comptes de démo

# 4. Lancement
npm run dev              # http://localhost:3005  (redirige vers /fr)
```

> Le port **3005** est utilisé car 3000/3001 étaient occupés sur la machine de
> développement. Il se change dans `package.json` (`dev` / `start`).

**Variante Docker (image de production, sans Node installé)** — détail en
[§ 16](#16-docker--image-de-production) :

```bash
cp .env.example .env     # renseigner AUTH_SECRET et POSTGRES_PASSWORD
docker compose up --build -d                  # base + migrations + application
docker compose --profile seed run --rm seed   # données de démonstration
# -> http://localhost:3005
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | Clé de signature des cookies de session — **32 caractères minimum** |
| `NEXT_PUBLIC_SITE_URL` | URL publique (metadata, sitemap). Optionnel en local |
| `DIRECT_URL` | Connexion sans pooler, pour `prisma migrate` (en local : même valeur que `DATABASE_URL`) |
| `POSTGRES_PASSWORD` | Docker uniquement : mot de passe du service `db` de `compose.yaml` |

> **Attention à `npm start` :** en mode production, Next.js charge
> `.env.production` s'il existe. Ce fichier local sert à `npm run db:seed:prod`
> et pointe vers la base **de production** : `npm run build && npm start` sur ce
> poste se connecte donc à la prod. Pour tester le build de production contre la
> base locale, utiliser l'image Docker (§ 16).

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Tests de bout en bout Playwright (serveur lancé + Google Chrome installé) |
| `npm run db:migrate` / `db:seed` / `db:studio` / `db:reset` | Outillage Prisma |

---

## 2. Comptes de démonstration

Mot de passe commun : **`Password123!`**

| Email | Rôle | Intérêt pour la démo |
|---|---|---|
| `membre@clubsport.fr` | MEMBER | Compte rempli : historique, réservations en cours |
| `nouveau@clubsport.fr` | MEMBER | **Non onboardé** — démontre le parcours d'inscription |
| `coach@clubsport.fr` | COACH | Accède au back-office mais pas à la gestion des membres |
| `admin@clubsport.fr` | ADMIN | Accès complet |

---

## 3. Fonctionnalités

### Public (marketing)
- Page d'accueil dynamique (chiffres réels issus de la base)
- Catalogue d'activités + **fiche détaillée par activité** (route dynamique)
- Page salles avec coordonnées GPS et identifiants de bornes NFC
- Tarifs, FAQ (avec données structurées JSON-LD)
- `sitemap.xml` et `robots.txt` générés

### Authentification & onboarding
- Inscription, connexion, déconnexion (révocation réelle en base)
- **Onboarding en 3 étapes** : salle de référence, coordonnées, formule
- Tant qu'il n'est pas terminé, toute route privée y ramène

### Espace membre
- Tableau de bord : statistiques personnelles, prochaines séances, suggestions
  filtrées sur la salle de référence
- Planning **filtrable** (salle, discipline) et **paginé**
- Détail d'une séance avec places restantes en temps réel
- Réservation / annulation avec règles métier serveur
- Historique (onglets « à venir » / « passées »)
- Réglages : profil, préférences, mot de passe, fermeture de toutes les sessions

### Back-office
- Vue d'ensemble : 5 indicateurs + **séances à faible remplissage** (< 40 %)
- Liste des séances paginée, **création de séance**, annulation (libère les
  inscriptions)
- **Feuille de présence** : pointage présent / absent par séance
- Liste des membres avec **recherche**, fiche membre détaillée
- Changement de **rôle** et de **statut d'adhésion**

---

## 4. Parcours métier principal

```
recherche → détail → réservation → confirmation → présence → historique
```

Ce flux traverse plusieurs écrans et **persiste réellement en base** à chaque
étape. Les règles suivantes sont vérifiées **côté serveur**, dans une
transaction (`src/actions/bookings.ts`) :

1. la séance existe, est programmée et n'est pas passée ;
2. l'adhésion du membre est **ACTIVE** (une adhésion suspendue bloque) ;
3. pas de double réservation (contrainte d'unicité `(userId, sessionId)`) ;
4. la **capacité** n'est pas dépassée — le comptage est dans la transaction
   pour que deux requêtes simultanées ne prennent pas la même dernière place.

---

## 5. Architecture

### Route groups

```
src/app/
├─ (marketing)/       public, indexable        — /, /activites, /salles, /tarifs, /faq
│  └─ activites/[slug]/                        — route dynamique (cache porté par la donnée)
├─ (auth)/            layout épuré             — /login, /register
├─ (onboarding)/      aucune échappatoire      — /onboarding
├─ (app)/             espace membre protégé    — /dashboard, /sessions, /bookings, /settings
│  ├─ error.tsx       frontière d'erreur du groupe
│  └─ sessions/       loading.tsx + [id]/not-found.tsx
├─ (admin)/           rôle distinct, UI dédiée — /admin/**
├─ api/               contrats JSON            — /api/sessions/nearby, /api/check-in
├─ layout.tsx · not-found.tsx · global-error.tsx
└─ sitemap.ts · robots.ts
```

Chaque groupe porte **son propre layout et sa propre garde** : la protection
est déclarée une fois dans le layout, aucune page ne peut l'oublier.

### Couches

| Fichier | Responsabilité |
|---|---|
| `src/proxy.ts` | Aiguillage rapide (Edge). Convention Next 16 — ex-`middleware.ts` |
| `src/lib/auth.ts` | **Autorisation réelle** : `requireUser`, `requireOnboardedUser`, `requireRole`, `requireAdmin`, `requireStaff` |
| `src/lib/session.ts` | Cookie signé (jose), création / lecture / révocation |
| `src/lib/queries.ts` | Accès aux données + stratégie de cache |
| `src/lib/validation.ts` | Schémas Zod partagés |
| `src/actions/*.ts` | Server Actions (mutations) |
| `src/components/*` | Primitives d'interface (Server Components par défaut) |

**58 fichiers source, dont seulement 13 Client Components** : tout ce qui n'a
pas besoin d'interactivité reste rendu sur le serveur.

---

## 6. Choix de rendu (les 3 justifications demandées)

### 1. Rendu serveur — `src/app/(marketing)/page.tsx`
Page publique, identique pour tous, indexable. Le HTML complet part du serveur
avec les données déjà dedans : contenu immédiatement lisible par les moteurs de
recherche et **zéro JavaScript de rendu** envoyé au navigateur.

### 2. Rendu client — `src/app/(auth)/login/login-form.tsx`
Le formulaire a besoin d'un état que le serveur ne peut pas tenir seul :
afficher les erreurs renvoyées par la Server Action **sans recharger la page**
(`useActionState`) et désactiver le bouton pendant l'envoi (`useFormStatus`).
La frontière est placée au plus bas : **la page qui l'entoure reste un Server
Component**, seul le formulaire est hydraté.

### 3. Donnée explicitement dynamique — `src/app/(app)/sessions/page.tsx`
Cette page est volontairement **sans cache**. Elle affiche les places restantes,
qui changent à chaque réservation d'un autre membre. Un cache, même de quelques
secondes, afficherait « 2 places » sur une séance déjà complète et la
réservation échouerait au clic. À l'inverse, le catalogue (salles, disciplines)
affiché sur la même page vient du cache : il ne bouge pas.

### Stratégie de cache et invalidation

| Donnée | Régime | Invalidation |
|---|---|---|
| Sites, activités, stats publiques | `unstable_cache` + tag, **1 h en production** | `updateTag()` dans les Server Actions admin |
| Fiche activité publique | rendue à la requête (le layout lit la session) ; fiche lue via le cache catalogue, planning sans cache | `updateTag()` côté admin |
| Planning, réservations, dashboard | **aucun cache** (données utilisateur) | `revalidatePath()` après mutation |

`updateTag` (Next 16) est préféré à `revalidateTag` dans les Server Actions :
il expire le tag immédiatement, donc l'admin voit sa propre écriture
(« read-your-own-writes »).

> **Le cache catalogue est désactivé en développement** (`cachedCatalog`, voir
> `src/lib/queries.ts`). Raison : `npm run db:seed` recrée les sites avec de
> nouveaux identifiants ; un cache continuerait à servir les anciens aux listes
> déroulantes et les formulaires échoueraient sur « Site inconnu ». Le
> comportement de production reste testable via `npm run build && npm start`.

---

## 7. Sécurité et autorisation

**Trois rôles** : `MEMBER`, `COACH`, `ADMIN`.

La protection est **côté serveur**, jamais par simple masquage de boutons :

- `src/proxy.ts` ne fait que de l'**aiguillage** (Edge runtime, pas d'accès base).
  Un cookie signé prouve qu'une session a existé, pas qu'elle est encore valide.
- La vérification qui fait foi est dans `src/lib/auth.ts`, exécutée à chaque
  rendu de page, Server Action et Route Handler. Le **rôle est relu en base**
  à chaque requête (il n'est pas dans le JWT) : un utilisateur rétrogradé perd
  ses droits immédiatement.
- Chaque Server Action commence par sa propre garde — une Server Action est une
  route HTTP appelable sans jamais afficher la page correspondante.
- Les Route Handlers `/api/**` vérifient la session eux-mêmes (le proxy les
  exclut de son matcher) et renvoient **401 / 403 JSON**, pas une redirection.

Autres mesures :

- mot de passe haché avec **bcrypt** (coût 10) ;
- cookie **httpOnly**, `sameSite=lax`, `secure` en production ;
- session stockée en base → la déconnexion **révoque réellement** ;
- le JWT ne contient qu'un identifiant de session opaque, aucun rôle ;
- validation **Zod systématique** avant toute écriture ;
- le rôle n'est jamais accepté depuis un formulaire d'inscription ;
- vérification de **propriété de la ressource** avant annulation d'une
  réservation ;
- garde-fou : un admin ne peut ni se rétrograder ni modifier sa propre adhésion ;
- protection contre l'**open redirect** sur le paramètre `?next=`.

Vérifié en test : un COACH atteint `/admin` mais est **redirigé côté serveur**
sur `/admin/members` même en tapant l'URL à la main.

---

## 8. Schéma de données

```
User ──┬── AuthSession        (sessions révocables)
       ├── Membership         (PENDING | ACTIVE | SUSPENDED | EXPIRED)
       ├── Booking ───────── Session ──┬── Activity ── Site
       └── Session (coach)              └── Site
```

| Modèle | Rôle |
|---|---|
| `User` | Compte, rôle, préférences, état d'onboarding |
| `AuthSession` | Session persistée → déconnexion réelle |
| `Site` | Salle physique : adresse, **latitude/longitude**, **nfcTagId** |
| `Activity` | Discipline proposée dans une salle |
| `Session` | Séance datée : la ressource réservable (capacité, coach, statut) |
| `Booking` | Inscription — `BOOKED → CONFIRMED → ATTENDED / NO_SHOW`, ou `CANCELLED` |
| `Membership` | Adhésion annuelle : conditionne le droit de réserver |

Contraintes notables : `Booking` est unique sur `(userId, sessionId)` ;
`Site.nfcTagId` est unique ; index sur `Session.startsAt` et `(siteId, startsAt)`
pour les requêtes de planning.

---

## 9. Continuité mobile — React Native (scan QR + géolocalisation)

L'application mobile (`../ReactNative`) n'est pas un habillage responsive du
site : elle exploite deux capacités que le web n'a pas, la **caméra** et le
**GPS**. Elle consomme les Route Handlers de `src/app/api/`, authentifiés par
jeton Bearer (`src/lib/api-auth.ts`).

### Scan QR — `POST /api/check-in`
Chaque salle a une borne à l'entrée, identifiée par `Site.nfcTagId`. Le
back-office en imprime l'affiche QR (**Back-office → Bornes QR**,
`/admin/bornes`), générée côté serveur en SVG par `src/lib/qrcode.ts`, sans
dépendance ni JavaScript client. Le téléphone scanne l'affiche et poste
l'identifiant avec sa position ; le serveur retrouve la salle, cherche une
réservation du membre pour une séance qui commence **dans une fenêtre de ±30
minutes dans cette salle**, et valide la présence.

C'est robuste parce que **le membre ne choisit pas la séance qu'il valide** :
c'est la borne de la salle plus la fenêtre horaire qui la déterminent. Un QR se
photographie, donc la position est croisée : dans une salle qui l'exige
(`Site.requiresProximity`, vrai par défaut), un téléphone à plus d'un
kilomètre est refusé (`TOO_FAR`). La distance est mesurée et renvoyée même
quand elle ne bloque pas.

Réponses : `UNKNOWN_TAG` (404), `NO_BOOKING` (404), `TOO_FAR` (409),
`ONBOARDING_REQUIRED` (403), `UNAUTHENTICATED` (401), et 200 avec la
réservation passée en `ATTENDED`.

Le champ `Booking.checkInMethod` trace la provenance : `"web"` quand le coach
pointe depuis la feuille de présence, `"qr"` pour un scan, `"simulated"` /
`"manual"` pour le mode démonstration et la saisie du code, `"nfc"` pour les
pointages antérieurs au passage au QR. Liste fermée, validée par Zod.

**Salle de démonstration.** `ClubSport Lyon Démo` (`nfc-lyon-demo-entree`) a
une séance toutes les 5 minutes, réservée d’avance pour les comptes membres,
et n'exige pas la proximité : son QR fonctionne à toute heure, depuis
n'importe où — c'est celui à scanner en soutenance.

### Géolocalisation — `GET /api/sessions/nearby?lat=&lng=&radius=`
Renvoie les séances à venir triées par **distance réelle** (formule de
haversine, `src/lib/format.ts`) depuis la position du téléphone.

---

## 10. Qualité

- **TypeScript strict** : `npm run typecheck` — 0 erreur
- **ESLint** : `npm run lint` — 0 erreur
- **Build de production** : réussi, 25 routes
- **Tests de bout en bout** : `npm run test:e2e` — **16/16**, 0 erreur console

Les tests utilisent le Chrome installé sur la machine (`channel: "chrome"`) ;
sinon, `npx playwright install chromium` puis retirer l'option `channel`.

Ils visent `http://localhost:3005` lancé par **`npm run dev`** (base locale de
`.env`) et réinitialisent la base locale (`db:seed`) en démarrant. Ne pas les
lancer contre `npm start`, qui lit `.env.production` (voir § 1).

Couverture des tests (`tests/e2e.mjs`) :

| Test | Vérifie |
|---|---|
| Login non onboardé → `/onboarding` | Redirection d'onboarding |
| Onboarding 3 étapes | Écriture en base, adhésion créée |
| L'onboarding ne se rejoue pas | Idempotence |
| Réservation | **Persistance réelle** (relue depuis `/bookings`) |
| Réservation après rechargement | Rien n'est en mémoire |
| Annulation | Persistance de l'annulation après `reload()` |
| Accès back-office | Rôle admin |
| Création de séance | CRUD complet |
| Recherche de membres | Filtrage SQL |
| Statut d'adhésion | Changement d'état persistant |
| Auto-modification du rôle | Garde-fou serveur |
| Membre suspendu | **Règle métier serveur** (réservation refusée) |
| Mobile 390 px | Aucun débordement horizontal |
| Cookie signé sans session en base | Aucune boucle de redirection, cookie nettoyé |
| Reconnexion après session invalidée | L'utilisateur retrouve son espace |

### États d'interface couverts
Chargement (`loading.tsx` + `<Suspense>`), liste vide (`EmptyState`), erreur
(`error.tsx`, `global-error.tsx`), ressource inexistante (`not-found.tsx`),
formulaire invalide (Zod + `role="alert"`), accès interdit (redirection serveur).

### Accessibilité
Lien d'évitement, focus visible, labels liés aux champs, `aria-invalid` /
`aria-current`, erreurs en `role="alert"` + `aria-live`, tableaux avec
`<th scope>`, `prefers-reduced-motion`, `color-scheme` déclaré, thème
clair/sombre automatique. La couleur ne porte jamais une information seule :
chaque état est aussi nommé par un mot (« Complet », « Suspendue »).

---

## 11. Déploiement sur Vercel

**En ligne : https://clubsport-seven.vercel.app**

| | |
|---|---|
| Hébergement | Vercel, région `cdg1` (Paris) |
| Base de données | Neon PostgreSQL 18, région `eu-west-2` (Londres) |
| Migrations | appliquées automatiquement au build (`vercel-build`) |
| Données de démonstration | 6 comptes, 3 salles, 6 disciplines, 80 séances |

Les comptes de démonstration de la section 2 fonctionnent en production.

### Reproduire le déploiement

### 1. Une base PostgreSQL managée

`localhost:5440` n'existe pas sur Vercel. Créez une base gratuite sur
[Neon](https://neon.tech) ou [Supabase](https://supabase.com) et relevez **deux**
URLs :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL du **pooler** — utilisée par l'application |
| `DIRECT_URL` | URL **directe** — utilisée par `prisma migrate` |

Les deux sont nécessaires : les poolers en mode transaction ne gèrent pas les
verrous de migration. Le schéma déclare déjà `directUrl` pour cette raison.

### 2. Variables d'environnement sur Vercel

À définir dans *Project Settings → Environment Variables* :

```
DATABASE_URL         = <URL pooler de la base managée>
DIRECT_URL           = <URL directe de la base managée>
AUTH_SECRET          = <32 caractères aléatoires, voir ci-dessous>
NEXT_PUBLIC_SITE_URL = https://<votre-projet>.vercel.app
```

Générez la clé de session — **ne réutilisez pas celle de développement** :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Déploiement

```bash
# le dépôt existe déjà : https://github.com/TahirouM/nextjs-eemi
# pour repartir de zéro sur un autre compte :
gh repo create mon-clubsport --public --source=. --push

vercel login
vercel link              # rattache le dossier au projet Vercel
vercel git connect       # relie le projet AU DÉPÔT : sans ça, rien ne se déploie tout seul
```

Une fois le dépôt connecté, **tout push sur `main` déclenche un déploiement de
production**, et chaque branche ou pull request obtient sa propre URL de
prévisualisation.

`vercel git connect` est l'étape qu'on oublie, et son absence est silencieuse :
le code part bien sur GitHub, le site public reste inchangé, et rien ne le
signale. Pour vérifier que le lien tient, comparez la date du dernier
déploiement (`vercel ls`) avec celle du dernier commit.

Un déploiement manuel reste possible sans passer par Git :

```bash
vercel deploy --prod
```

Les migrations s'appliquent automatiquement dans les deux cas : Vercel préfère
le script `vercel-build` quand il existe, et celui-ci exécute
`prisma generate && prisma migrate deploy && next build`.

### 4. Comptes de démonstration en production

Le seed **n'est pas rejoué automatiquement** — il supprime tout avant d'insérer,
ce qui effacerait les données réelles à chaque déploiement. Lancez-le une fois,
depuis votre machine, contre la base distante :

```bash
# fichier local, jamais versionné (couvert par .gitignore)
echo 'DATABASE_URL="<URL pooler>"'  > .env.production
echo 'DIRECT_URL="<URL directe>"'  >> .env.production

npm run db:seed:prod
```

### Ce qui est déjà configuré

- `vercel.json` — framework et région `cdg1` (Paris : la base et les
  utilisateurs sont en France, cela évite un aller-retour transatlantique) ;
- `postinstall: prisma generate` — Vercel met `node_modules` en cache, sans
  cela le client Prisma ne serait pas régénéré après un changement de schéma ;
- `vercel-build` — applique les migrations avant le build ;
- `.env.example` — documente les quatre variables attendues.

---

## 12. Internationalisation (FR / EN)

L'application est disponible en **français** et en **anglais**, avec un
sélecteur présent dans l'en-tête de toutes les pages.

**Architecture : préfixe d'URL** (`/fr/...`, `/en/...`), via `next-intl`.

| | Préfixe d'URL (retenu) | Cookie seul (écarté) |
|---|---|---|
| Indexation | Les deux langues indexables | Une seule version indexée |
| Partage d'un lien | La langue est transmise | Le destinataire voit sa propre langue |
| `hreflang` | Possible | Impossible |

Le coût est un remaniement de l'arborescence (`app/[locale]/...`), mais c'est la
méthode recommandée par Next.js et la seule qui tienne pour le SEO.

**Ce qui est traduit :** toute l'interface — navigation, formulaires, états
vides, messages d'erreur des Server Actions, validation Zod, metadata, ainsi que
les **dates** (`Intl.DateTimeFormat` suit la langue : « mardi 15 septembre » /
« Tuesday 15 September ») et les **pluriels** (`{count, plural, ...}`).

**Points d'implémentation notables :**

- `src/i18n/routing.ts` expose des versions de `Link`, `redirect` et
  `usePathname` conscientes de la langue : elles posent le préfixe
  automatiquement, sans écrire `/${locale}/...` partout.
- Le **proxy** cumule deux rôles : détection de langue (`next-intl`) et
  aiguillage d'authentification. Les chemins sont comparés **sans** le préfixe
  (`stripLocale`), sinon chaque règle devrait être dupliquée par langue.
- Les **Server Actions** redirigent avec `redirectLocalized()` : le `redirect()`
  standard de Next.js perd le préfixe et renverrait un anglophone sur la version
  française.
- Les **schémas Zod** produisent des CLÉS (« emailInvalid »), pas du texte : Zod
  s'exécute sans connaître la locale. La traduction a lieu dans la Server
  Action, qui elle la connaît.
- Les **Client Components** reçoivent leurs libellés en props depuis les Server
  Components, ou utilisent `useTranslations()` : aucun dictionnaire complet
  n'est envoyé au navigateur.
- `sitemap.xml` et les balises `hreflang` déclarent les deux versions comme
  équivalentes, pas comme du contenu dupliqué.

**Limite assumée :** le CONTENU de la base (noms et descriptions des
disciplines, noms des salles) reste en français dans les deux langues. Traduire
ces champs demanderait une table de traductions par entité — hors périmètre
pour ce projet. Seule l'interface est bilingue.

---

## 13. Direction artistique

**Référence :** le planning imprimé punaisé dans le hall d'un gymnase, et les
lignes peintes au sol d'un terrain. Trois conséquences concrètes :

- un **rail d'heures vertical** le long duquel s'accrochent les séances
  (accueil, tableau de bord) ;
- des **filets nets** plutôt que des cartes flottantes partout — l'ombre est
  réservée aux éléments réellement superposés ;
- un **seul accent chaud** (ocre vernis de parquet, `#a8560f`) réservé à
  l'action, jamais utilisé en décoration.

**Thème clair « verre ».** Les surfaces ne sont pas des aplats opaques mais des
plaques translucides posées sur un fond légèrement teinté (deux halos radiaux
très diffus, l'un froid, l'autre chaud). Trois ingrédients indissociables, gérés
par la classe utilitaire `.glass` :

1. une couleur de surface semi-transparente (`rgb(255 255 255 / 0.62)`) ;
2. un flou d'arrière-plan (`backdrop-filter: blur(16px) saturate(1.4)`) ;
3. une bordure claire et une ombre douce, qui donnent l'épaisseur.

Enlever l'un des trois casse l'effet : sans fond teinté le flou n'a rien à
flouter, sans flou la surface paraît simplement grise.

Points d'attention :

- **Repli** : `@supports not (backdrop-filter: ...)` rend la surface opaque
  quand le navigateur ne sait pas flouter, sinon le texte deviendrait illisible.
- **Coût** : `backdrop-filter` est la partie chère du rendu. Il est réservé aux
  surfaces (en-têtes, panneaux) et n'est jamais appliqué aux éléments répétés
  d'une longue liste.
- **Contraste** : vérifié au ratio WCAG — encre sur fond 15,2:1, texte secondaire
  5,4:1, accent 5,3:1. Tous au-dessus du minimum AA de 4,5:1.
- **Le back-office reste opaque** (bandeau d'encre pleine largeur) : la
  distinction visuelle entre espace membre et administration prime sur l'effet.

**Typographie.** Une seule famille, *Archivo*, exploitée sur son **axe de
largeur** (`wdth`) : titres en large, texte courant en normal. Le lettrage
large évoque les typographies peintes des gymnases et des dossards. *IBM Plex
Mono* n'intervient que là où des caractères doivent s'aligner en colonne
(heures, identifiants de bornes NFC, coordonnées GPS).

**Choix écartés volontairement.** La première version utilisait un fond
quasi-noir avec un accent vert acide — une combinaison si courante dans les
interfaces générées qu'elle ne dit plus rien du sujet. Ont aussi été retirés :
les étiquettes en CAPITALES au-dessus de chaque bloc, et la grille de cartes
identiques à coins arrondis uniformes. Le rayon d'arrondi encode désormais la
hiérarchie plutôt que d'être constant.

**Conformité aux Web Interface Guidelines** (skill `web-design-guidelines`) :
`transition-colors` au lieu de `transition` (jamais `all`),
`font-variant-numeric: tabular-nums` sur les colonnes de chiffres,
`text-balance` / `text-pretty` sur les titres et paragraphes,
`touch-action: manipulation`, `<meta name="theme-color">` par thème,
`translate="no"` sur les identifiants techniques, et zéro débordement
horizontal de 360 px à 1440 px.

---

## 14. Limites connues

- **Pas de liste d'attente** quand une séance est complète : le bouton est
  simplement désactivé.
- **Pas de paiement réel** : l'onboarding active directement l'adhésion. Le
  choix de formule est enregistré mais rien n'est encaissé.
- **Pas d'envoi d'email** : les préférences de rappel sont persistées mais
  aucun message n'est envoyé (il faudrait un service type Resend + un cron).
- **Le back-office ne crée pas d'activités ni de sites** : ils viennent du seed.
  Seules les *séances* sont créables depuis l'interface.
- **Pas de réservation récurrente** (« tous les lundis »).
- **`npm audit` signale 3 vulnérabilités** dans la chaîne de dépendances du CLI
  Prisma (`@prisma/config` → `deepmerge-ts`). Ce sont des paquets de
  développement, non embarqués dans le bundle client.
- **Tests e2e non isolés** : ils réinitialisent la base (`db:seed`) à chaque
  exécution. À ne pas lancer sur une base contenant des données à conserver.
- **Le contenu de la base n'est pas traduit** : les noms de disciplines et de
  salles restent en français en anglais (cf. section 11).
- **Image Docker sans pré-rendu du sitemap** : construite sans base
  (`BUILD_WITHOUT_DB=1`, voir § 16), elle sert le sitemap dynamiquement, alors
  que le build Vercel le pré-rend et le revalide toutes les heures.
- **Base de production partagée avec la démonstration** : le seed y a été joué
  une fois. Le relancer effacerait les données créées depuis (c'est volontaire :
  il n'est pas rejoué automatiquement au déploiement).

---

## 15. Usage de l'IA

**Outils utilisés.** Claude (Claude Code) en assistant de développement, sur
l'ensemble du projet : cadrage, génération de code, débogage.

**Types de tâches confiées.** Mise en place du squelette (route groups, schéma
Prisma, seed), rédaction des composants d'interface répétitifs, écriture des
tests de bout en bout, et surtout **débogage assisté** — c'est là que l'IA a été
la plus utile, en instrumentant les pages pour isoler une panne.

**Une décision proposée par l'IA qui a été corrigée.** La première version
mettait en cache le catalogue (`unstable_cache`, 1 heure) **y compris en
développement**. Résultat : après chaque `npm run db:seed`, les identifiants de
sites changeaient mais les listes déroulantes servaient encore les anciens —
l'onboarding échouait sur « Site inconnu » sans explication visible, et le
diagnostic a coûté plusieurs itérations. Deux corrections ont été apportées :

1. le cache catalogue est désormais **désactivé hors production**
   (`cachedCatalog`), car il n'apporte rien en local et masque les changements
   de données ;
2. le formulaire d'onboarding **remonte les erreurs des étapes masquées**
   (« Corrigez l'étape 1 … »), au lieu d'afficher un message sur un écran que
   l'utilisateur ne voit pas — le bouton semblait ne rien faire.

Une première rédaction proposait aussi `revalidateTag` dans les Server Actions ;
la signature a changé en Next 16 et `updateTag` est le bon appel pour obtenir
l'effet voulu. Vérifié dans les types de `next/cache` plutôt que supposé.

**Refonte visuelle.** La direction artistique initiale (fond quasi-noir, accent
vert acide, grille de cartes arrondies) a été entièrement refaite après lecture
de deux guides de conception. Le point le plus instructif : la première version
était esthétiquement correcte mais **générique** — elle aurait pu habiller
n'importe quel produit. La version actuelle part du sujet lui-même (un planning
de gymnase) et en tire sa structure.

Un point a dû être corrigé deux fois : le tableau comparatif des tarifs
débordait sur mobile. Le premier réflexe — `overflow-x: hidden` sur `<html>` —
supprimait le symptôme mais **masquait la colonne Premium**, donc rendait la
page inutilisable sur téléphone. La bonne réponse était de changer de forme
sous 640 px (une liste par formule) plutôt que de faire défiler un tableau
illisible. Le test de bout en bout a détecté la régression avant la
correction.

**Un bug de conception trouvé en production locale : `ERR_TOO_MANY_REDIRECTS`.**
Symptôme : après un `npm run db:seed` effectué pendant qu'un onglet restait
ouvert, toute route privée partait en boucle infinie de redirections.

Cause réelle — un désaccord entre les deux couches de sécurité :

1. le **proxy** (Edge runtime) ne voit que la *signature* du cookie, qui reste
   valide : il laisse passer, et renvoie même `/login` vers `/dashboard` ;
2. le **serveur** interroge la base, ne trouve plus la ligne `AuthSession`
   (supprimée par le seed) et redirige vers `/login` ;
3. retour au point 1 — jusqu'à ce que le navigateur abandonne.

Ce n'est pas une erreur de frappe : c'est la conséquence logique d'un cookie
« signé mais mort », et cela se produirait aussi en production lors d'une purge
des sessions expirées ou d'une révocation depuis un autre appareil.

Correction en deux temps :
- `requireUser()` ajoute `?stale=1` quand un cookie existe mais qu'aucune
  session ne lui correspond ; le proxy cesse alors de renvoyer vers
  `/dashboard` — la boucle est rompue ;
- le proxy **supprime** ce cookie fantôme, pour que l'incohérence ne se
  reproduise pas à la visite suivante.

Une première tentative plaçait ce nettoyage dans un composant de page. Next.js
l'a refusée : *« Cookies can only be modified in a Server Action or Route
Handler »*. Le proxy est le bon endroit — c'est l'un des rares contextes où
l'écriture d'un cookie est autorisée. Deux tests de régression couvrent
désormais ce scénario.

**Une partie du projet entièrement explicable.** La **chaîne d'authentification
et d'autorisation** (`src/lib/session.ts`, `src/lib/auth.ts`, `src/proxy.ts`) :
pourquoi le JWT ne contient qu'un identifiant de session opaque et non le rôle,
pourquoi la ligne `AuthSession` en base est nécessaire pour révoquer réellement,
pourquoi le proxy ne peut pas lire le rôle (Edge runtime, pas de Prisma) et donc
pourquoi il n'est **pas** la protection, et pourquoi chaque Server Action doit
refaire sa propre vérification.

**Dockerisation : ce que l'IA a proposé, et ce qui a été vérifié.** Le
Dockerfile, le `.dockerignore` et le `compose.yaml` ont été écrits avec Claude
Code, puis chaque choix a été testé (build, lancement, parcours complet,
scan). Trois points ont été corrigés en route :

1. **Build sans base : première solution fausse, détectée au test.** Pour que
   `next build` ne touche pas la base, la première proposition faisait
   renvoyer `[]` au `generateStaticParams` du layout `[locale]`. Le build
   passait, mais **toutes les pages privées répondaient 500** : sans rien
   pré-rendre, Next ne voyait plus qu'elles lisent les cookies et les classait
   statiques. Le manifeste de pré-rendu du build normal a montré que seul le
   sitemap touche réellement la base au build ; c'est donc le seul qui bascule
   en rendu à la requête (`src/lib/build.ts`). Au passage, le
   `generateStaticParams` des fiches activité a été retiré : il ne produisait
   aucune page statique (le layout public lit la session).
2. **Scan Scout : la majorité des failles ne venait pas du projet.** Le
   premier scan (2 critiques, 14 hautes) pointait surtout `tar`,
   `brace-expansion`, `sigstore`, `pacote`… — les dépendances de **npm et
   yarn embarqués dans l'image `node`**. Le serveur se lance avec `node`
   seul : ils sont supprimés de l'étape `runner`. Les deux restantes étaient
   réelles : `next` 16.3.5 (critique, corrigée en 16.3.6 → montée en 16.3.8)
   et `sharp` 0.35.4 (forcé en 0.35.5 par `overrides`). Résultat : 0
   vulnérabilité.
3. **`HOSTNAME`** : Docker remplit cette variable avec l'identifiant du
   conteneur, et le serveur standalone l'utilise comme interface d'écoute.
   Sans `HOSTNAME=0.0.0.0`, le port publié ne répond pas.

Refusé : publier le port 5432 de la base sur l'hôte (inutile, l'application la
joint par le réseau compose) et passer `AUTH_SECRET` en `ARG` de build (il
resterait lisible dans l'historique de l'image).

---

## 16. Docker — image de production

L'application Next.js est livrée sous forme d'image Docker de production :
`Dockerfile`, `.dockerignore`, `compose.yaml` à la racine.

### Lancer

```bash
cp .env.example .env          # renseigner AUTH_SECRET (32 car. min.) et POSTGRES_PASSWORD
docker compose up --build -d  # db -> migrate -> app
docker compose --profile seed run --rm seed   # comptes et séances de démonstration
open http://localhost:3005
```

| Service | Image | Rôle |
|---|---|---|
| `db` | `postgres:16-alpine` | Base, volume `db-data`, **aucun port publié** |
| `migrate` | étape `migrator` | `prisma migrate deploy`, puis s'arrête |
| `seed` | étape `migrator` | Données de démo, **à la demande** (profil `seed`) : il vide la base |
| `app` | étape `runner` → `clubsport-web` | `node server.js`, port **3005** |

`app` attend que `migrate` se termine avec succès, qui attend que `db` soit
`healthy` (`pg_isready`). L'image `app` a son propre `HEALTHCHECK`.

Sans compose, avec une base existante :

```bash
docker build -t clubsport-web --target runner .
docker run --rm -p 3005:3005 \
  -e DATABASE_URL="postgresql://…" -e AUTH_SECRET="…" \
  clubsport-web
```

`docker compose down` arrête tout ; `docker compose down -v` supprime aussi le
volume de la base.

### Le Dockerfile, étape par étape

| Étape | Contenu | Pourquoi |
|---|---|---|
| `base` | `node:22-alpine` + `openssl` + `apk upgrade` | Version de Node figée, image légère ; OpenSSL requis par le moteur Prisma |
| `deps` | `COPY package*.json` puis `npm ci --ignore-scripts` | Layer mis en cache tant que les dépendances ne changent pas ; cache npm monté par BuildKit, absent de l'image |
| `builder` | `COPY . .`, `prisma generate`, `next build` | Compile pour Linux (les `node_modules` du Mac ont des binaires macOS) |
| `migrator` | `node_modules` complet + `prisma/` | Le CLI Prisma n'est pas dans le serveur standalone |
| `runner` | `.next/standalone`, `.next/static`, `public` | **Seule étape livrée** : ni code source, ni devDependencies, ni npm |

- **`output: "standalone"`** (`next.config.ts`) : `next build` produit un
  `server.js` autonome avec les seuls modules réellement importés (image
  `runner` ≈ 300 Mo, dont l'essentiel est Node lui-même).
- **Non-root** : `USER node` (uid 1000). Le cache ISR écrit dans `.next/`,
  d'où le `--chown=node:node` des `COPY`.
- **`EXPOSE 3005`** documente le port ; c'est `-p 3005:3005` / `ports:` qui le
  publie sur l'hôte.
- **`CMD ["node", "server.js"]`** : serveur de production, pas `npm run dev`.
  Pas de npm intercalé, donc `docker stop` (SIGTERM) atteint Node directement.

### Variables d'environnement et secrets

| Variable | Fournie | Où |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | au **lancement** | construites par `compose.yaml` (hôte `db`, pas `localhost`) |
| `AUTH_SECRET` | au **lancement** | lue dans `.env` par compose |
| `POSTGRES_PASSWORD` | au **lancement** | lue dans `.env` par compose (obligatoire : `${…:?}`) |
| `NEXT_PUBLIC_SITE_URL` | au **build** (`ARG`) | inlinée dans le code par Next ; non secrète |
| `BUILD_WITHOUT_DB=1` | au **build** | interrupteur, voir ci-dessous |

**Aucun secret n'entre dans l'image.** `.env*` est exclu par `.dockerignore`,
donc aucun `COPY` ne peut l'embarquer, et aucun secret ne passe en `ARG` (les
valeurs d'`ARG` restent lisibles avec `docker history`). Vérification :
`docker run --rm --entrypoint sh clubsport-web -c 'ls -a; env'`.

**Build sans base.** Une image se construit une fois et se lance contre
n'importe quelle base : `docker build` n'a donc pas accès à PostgreSQL. Seul le
sitemap interrogeait la base au build ; avec `BUILD_WITHOUT_DB=1`, il est rendu
à la requête (`src/lib/build.ts`). Le reste du site était déjà rendu à la
requête (le layout lit la session).

### `.dockerignore`

Exclut `node_modules` et `.next` (reconstruits pour Linux dans l'image ; les
envoyer alourdirait le contexte de plusieurs centaines de Mo et y mettrait des
binaires macOS), `.env*` (secrets), `.git`, les tests, les PDF et la doc. Le
`Dockerfile` lui-même en fait partie : le modifier n'invalide pas le cache du
`COPY . .`.

### Hôte, conteneur, téléphone

```
iPhone (Wi-Fi) ──► http://<IP du Mac>:3005 ──► Mac : port publié 3005
                                                   │  -p 3005:3005
                                                   ▼
                                    conteneur app : 0.0.0.0:3005 (node server.js)
                                                   │  réseau compose
                                                   ▼
                                    conteneur db : db:5432 (non publié)
```

`localhost` n'a pas le même sens partout : dans le conteneur `app`, c'est le
conteneur lui-même (d'où `db:5432`) ; sur l'iPhone, c'est le téléphone (d'où
l'IP du Mac, `ipconfig getifaddr en0`). L'app mobile déduit cette IP de Metro
et vise le port 3005 : elle fonctionne indifféremment contre `npm run dev` ou
contre le conteneur.

### Scan de sécurité — Docker Scout

```bash
docker scout quickview local://clubsport-web:latest
docker scout cves local://clubsport-web:latest --only-severity critical,high
```

Rapports complets : [`docs/docker/scout-avant.txt`](docs/docker/scout-avant.txt)
et [`docs/docker/scout-apres.txt`](docs/docker/scout-apres.txt).

| | Critiques | Hautes | Moyennes | Basses | Health score |
|---|---|---|---|---|---|
| Premier build | 2 | 14 | 12 | 1 | C |
| Après corrections | **0** | **0** | **0** | **0** | B |

| Vulnérabilité relevée | Origine | Correction |
|---|---|---|
| `tar` (1 C, 2 H), `brace-expansion` (5 H), `sigstore`, `pacote`, `ip-address`, `http-cache-semantics` | npm et yarn **fournis par l'image `node`**, inutiles à l'exécution | supprimés de l'étape `runner` |
| `next` 16.3.5 — GHSA-vcvr-r3jv-pc5j (critique) | dépendance du projet | montée en **16.3.8** |
| `sharp` 0.35.4 — GHSA-wq5f-xc86-pv6w | dépendance de `next` | `overrides` → **0.35.5** |
| paquets Alpine | image de base | `apk upgrade` au build |

Ce qui reste signalé, et pourquoi c'est accepté :

- **Paquets sous licence copyleft** (busybox, etc.) : composants système
  d'Alpine, utilisés sans modification. Point de conformité, pas une
  vulnérabilité.
- **Attestations de provenance absentes** : elles s'ajoutent lors d'un push
  vers un registre (`docker buildx build --provenance=mode=max --sbom=true
  --push`). L'image n'est construite qu'en local ici.
- L'image de base `node:22-alpine` publiée a elle-même des CVE ; Scout propose
  `node:24-alpine`. Le Node 22 de l'image est conservé (version LTS testée avec
  le projet) : les CVE de la base viennent de npm et yarn, absents de `runner`.

### Vérifications effectuées

- `docker compose build` : build réussi sans base, en 40 s environ (cache
  froid) ; un changement de code ne rejoue pas `npm ci`.
- Routes : `/fr`, `/en`, `/fr/salles`, `/fr/activites`, fiche activité,
  `/sitemap.xml`, `/robots.txt` → 200 ; slug inconnu → 404 ; `/fr/dashboard`
  sans session → 307 vers `/login`.
- Parcours mobile contre le conteneur : `POST /api/auth/login` → jeton ;
  `POST /api/check-in` sur la borne Lyon Démo → 200, réservation `ATTENDED`,
  `checkInMethod: "qr"` ; borne inconnue → 404 `UNKNOWN_TAG`.
- Utilisateur d'exécution : `uid=1000(node)` ; conteneur `healthy`.
