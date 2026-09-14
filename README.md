# ClubSport — Projet fil rouge Next.js

Application de gestion d'un **club sportif multi-sites** : les adhérents
réservent des séances encadrées, les coachs valident les présences, les
administrateurs pilotent le planning et les adhésions.

Projet M2 EEMI 2026 — Next.js 16.3.5 (App Router), React 19, Prisma, PostgreSQL.

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
npm run dev              # http://localhost:3005
```

> Le port **3005** est utilisé car 3000/3001 étaient occupés sur la machine de
> développement. Il se change dans `package.json` (`dev` / `start`).

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | Clé de signature des cookies de session — **32 caractères minimum** |
| `NEXT_PUBLIC_SITE_URL` | URL publique (metadata, sitemap). Optionnel en local |

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
│  └─ activites/[slug]/                        — route dynamique + generateStaticParams
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
| Fiche activité publique | `revalidate = 300` | Régénération en arrière-plan |
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

## 9. Continuité mobile — React Native (NFC + géolocalisation)

La future application mobile n'est pas un habillage responsive du site : elle
exploite deux capacités que le web n'a pas. **Les deux sont déjà préparées côté
données et exposées en API.**

### NFC — `POST /api/check-in`
Chaque salle a une borne à l'entrée (`Site.nfcTagId`). Le téléphone lit le tag
et le poste ; le serveur retrouve la salle, cherche une réservation du membre
pour une séance qui commence **dans une fenêtre de ±30 minutes dans cette
salle**, et valide la présence.

C'est robuste parce que **le membre ne choisit pas la séance qu'il valide** :
c'est le tag physique (donc sa présence réelle sur place) plus la fenêtre
horaire qui la déterminent. Impossible de pointer depuis chez soi.

Le champ `Booking.checkInMethod` trace la provenance : `"web"` quand le coach
pointe depuis la feuille de présence, `"nfc"` par cette route. **Testé et
vérifié en base.**

### Géolocalisation — `GET /api/sessions/nearby?lat=&lng=&radius=`
Renvoie les séances à venir triées par **distance réelle** (formule de
haversine, `src/lib/format.ts`) depuis la position du téléphone. L'application
proposera d'abord la salle où l'utilisateur se trouve, puis les plus proches.

Réponse testée : 54 séances dans un rayon de 8 km, la plus proche à 0 km de
ClubSport Bastille, avec le `nfcTagId` de la salle pour enchaîner sur le
pointage.

---

## 10. Qualité

- **TypeScript strict** : `npm run typecheck` — 0 erreur
- **ESLint** : `npm run lint` — 0 erreur
- **Build de production** : réussi, 25 routes
- **Tests de bout en bout** : `npm run test:e2e` — **14/14**, 0 erreur console

Les tests utilisent le Chrome installé sur la machine (`channel: "chrome"`) ;
sinon, `npx playwright install chromium` puis retirer l'option `channel`.

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

### États d'interface couverts
Chargement (`loading.tsx` + `<Suspense>`), liste vide (`EmptyState`), erreur
(`error.tsx`, `global-error.tsx`), ressource inexistante (`not-found.tsx`),
formulaire invalide (Zod + `role="alert"`), accès interdit (redirection serveur).

### Accessibilité
Lien d'évitement, focus visible, labels liés aux champs, `aria-invalid` /
`aria-current`, erreurs en `role="alert"`, tableaux avec `<th scope>`,
`prefers-reduced-motion`, thème clair/sombre automatique.

---

## 11. Limites connues

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
- **Déploiement non effectué** : le projet tourne en local avec PostgreSQL en
  Docker. Pour Vercel, il faudrait une base managée (Neon/Supabase) et définir
  `DATABASE_URL`, `AUTH_SECRET` et `NEXT_PUBLIC_SITE_URL` dans le dashboard.

---

## 12. Usage de l'IA

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

**Une partie du projet entièrement explicable.** La **chaîne d'authentification
et d'autorisation** (`src/lib/session.ts`, `src/lib/auth.ts`, `src/proxy.ts`) :
pourquoi le JWT ne contient qu'un identifiant de session opaque et non le rôle,
pourquoi la ligne `AuthSession` en base est nécessaire pour révoquer réellement,
pourquoi le proxy ne peut pas lire le rôle (Edge runtime, pas de Prisma) et donc
pourquoi il n'est **pas** la protection, et pourquoi chaque Server Action doit
refaire sa propre vérification.
