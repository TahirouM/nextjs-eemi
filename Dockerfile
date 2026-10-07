# syntax=docker/dockerfile:1
#
# Image de production de ClubSport (Next.js 16 + Prisma).
#
# Quatre étapes, une seule livrée : seule `runner` part en production. Les
# outils de build (TypeScript, Tailwind, le CLI Prisma, les devDependencies)
# restent dans les étapes intermédiaires et n'alourdissent pas l'image finale.
#
#   deps      npm ci                       -> node_modules complet
#   builder   prisma generate + next build -> .next/standalone
#   migrator  prisma migrate deploy / seed -> service ponctuel de compose.yaml
#   runner    node server.js               -> l'image livrée
#
# Aucun secret n'entre dans l'image : DATABASE_URL et AUTH_SECRET sont fournis
# au lancement (`docker run --env-file`, ou `environment:` dans compose.yaml).

# Image officielle Node, version majeure figée (LTS 22). Variante Alpine :
# environ 50 Mo au lieu de 400 pour l'image Debian complète, donc moins de
# paquets système et moins de vulnérabilités remontées par Docker Scout.
ARG NODE_IMAGE=node:22-alpine

# ─── base : socle commun ────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
# Le moteur de requêtes Prisma est lié à OpenSSL : sans la bibliothèque,
# PrismaClient échoue au premier appel. `apk upgrade` applique les correctifs
# de sécurité publiés depuis la construction de l'image de base.
RUN apk upgrade --no-cache && apk add --no-cache openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── deps : dépendances ─────────────────────────────────────────────────────
FROM base AS deps
# Seuls les manifestes sont copiés : tant que package*.json ne change pas, ce
# layer (le plus long) est resservi depuis le cache, même si le code change.
COPY package.json package-lock.json ./
# --ignore-scripts : le `postinstall` lancerait `prisma generate`, qui a
# besoin du schéma. Il est rejoué explicitement dans `builder`. Le cache npm
# est monté depuis BuildKit : rien n'en reste dans l'image.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# ─── builder : compilation ──────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les variables NEXT_PUBLIC_* sont inlinées dans le code au build : elles
# doivent donc être connues ICI, et non au lancement. Ce n'est pas un secret.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3005
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
# Pas de base pendant le build : voir src/lib/build.ts.
ENV BUILD_WITHOUT_DB=1
RUN npx prisma generate && npx next build

# ─── migrator : schéma et données de démonstration ──────────────────────────
# Le serveur standalone n'embarque pas le CLI Prisma : les migrations tournent
# dans ce conteneur ponctuel, lancé par compose avant l'application.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
RUN npx prisma generate
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ─── runner : l'image livrée ────────────────────────────────────────────────
FROM base AS runner
# HOSTNAME : Docker y met l'identifiant du conteneur. Sans 0.0.0.0, le serveur
# n'écouterait que sur cette interface et `-p` ne l'atteindrait pas.
ENV NODE_ENV=production PORT=3005 HOSTNAME=0.0.0.0
# L'image Node embarque npm, yarn et corepack, et Docker Scout y relevait la
# majorité des vulnérabilités (tar, brace-expansion, sigstore, pacote…). Le
# serveur se lance avec `node` seul : ces outils n'ont rien à faire en
# production, on les retire plutôt que de traîner leurs failles.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg
# Le serveur autonome produit par `output: "standalone"`, plus les fichiers
# statiques qu'il ne copie pas lui-même. `--chown` : le cache ISR écrit dans
# .next/, qui doit appartenir à l'utilisateur d'exécution.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Jamais root : `node` (uid 1000) est fourni par l'image officielle. Une
# faille dans l'application ne donnerait pas les droits root du conteneur.
USER node
# Documente le port d'écoute. C'est `-p 3005:3005` (ou `ports:`) qui le publie.
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3005/robots.txt > /dev/null || exit 1
# Le serveur de production, pas `npm run dev` : pas de recompilation à chaud,
# pas d'outils de développement, et npm n'est pas intercalé (les signaux
# d'arrêt atteignent directement Node).
CMD ["node", "server.js"]
