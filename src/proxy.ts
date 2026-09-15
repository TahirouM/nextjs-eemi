import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { sessionCookieName, verifySessionToken } from "@/lib/session";

/**
 * `proxy.ts` — le middleware de Next.js, renommé par la convention introduite
 * en Next 16 (`middleware.ts` est déprécié, l'export s'appelle désormais
 * `proxy`). Il remplit ici DEUX rôles.
 *
 * 1. LANGUE. `next-intl` détecte la langue (préfixe d'URL, cookie, puis
 *    en-tête `Accept-Language`) et redirige `/dashboard` vers `/fr/dashboard`.
 *
 * 2. AIGUILLAGE D'AUTHENTIFICATION. Le proxy tourne sur l'Edge runtime : pas
 *    d'accès à Prisma, donc pas de lecture de rôle. Il ne fait que rediriger
 *    sur la présence d'un cookie signé valide :
 *      - visiteur anonyme sur une route privée -> /login
 *      - utilisateur connecté sur /login       -> /dashboard
 *
 * Il ne constitue PAS la protection : un cookie signé prouve seulement qu'une
 * session a existé, pas qu'elle est toujours active ni quel rôle elle porte.
 * La vérification qui fait foi est dans src/lib/auth.ts, côté serveur.
 */

const intlMiddleware = createIntlMiddleware(routing);

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/sessions",
  "/bookings",
  "/settings",
  "/onboarding",
  "/admin",
];
const AUTH_ROUTES = ["/login", "/register"];

/**
 * Retire le préfixe de langue pour raisonner sur des chemins stables :
 * `/en/dashboard` et `/fr/dashboard` donnent tous deux `/dashboard`.
 * Sans cela, il faudrait dupliquer chaque règle pour chaque langue.
 */
function stripLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return { locale, path: "/" };
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, path: pathname.slice(locale.length + 1) };
    }
  }
  return { locale: routing.defaultLocale, path: pathname };
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path } = stripLocale(pathname);

  const token = request.cookies.get(sessionCookieName())?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const hasSession = payload !== null;

  const isPrivate = PRIVATE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(path);

  // Les redirections d'authentification conservent la langue courante :
  // un visiteur anglophone ne doit pas basculer en français en se connectant.
  if (isPrivate && !hasSession) {
    const url = new URL(`/${locale}/login`, request.url);
    // Mémorise la destination pour y revenir après connexion.
    url.searchParams.set("next", `${path}${search}`);
    return NextResponse.redirect(url);
  }

  /*
    Renvoi des utilisateurs déjà connectés hors des pages de connexion.

    Garde-fou indispensable : le proxy ne sait PAS si la session existe encore
    en base (Edge runtime, pas d'accès Prisma). Un cookie dont la signature est
    valide mais dont la ligne AuthSession a disparu — session révoquée, base
    réinitialisée par un `db:seed` — produirait sinon une boucle :
      /dashboard -> le serveur ne trouve pas la session -> /login
      /login     -> le proxy voit un cookie signé         -> /dashboard
      … jusqu'à ERR_TOO_MANY_REDIRECTS.

    On ne fait donc ce renvoi QUE si le serveur ne vient pas lui-même de nous
    envoyer ici :
      - `?stale=1` : le serveur a refusé le cookie (session absente de la base) ;
      - `?next=`   : redirection posée par ce proxy pour une route privée.
  */
  const comingFromServer =
    request.nextUrl.searchParams.has("stale") ||
    request.nextUrl.searchParams.has("next");

  if (isAuthRoute && hasSession && !comingFromServer) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  /*
    Cookie « fantôme » : le serveur vient de refuser cette session (`?stale=1`),
    donc le cookie est signé mais ne correspond plus à rien en base. On le
    supprime ici — le proxy est, avec les Server Actions et les Route Handlers,
    l'un des rares endroits où Next.js autorise l'écriture d'un cookie ; un
    composant de page ne le peut pas.
  */
  if (isAuthRoute && hasSession && request.nextUrl.searchParams.has("stale")) {
    const response = intlMiddleware(request);
    response.cookies.delete(sessionCookieName());
    return response;
  }

  // Aucune redirection d'authentification : on laisse next-intl faire son
  // travail (ajout du préfixe de langue, pose du cookie NEXT_LOCALE).
  return intlMiddleware(request);
}

export const config = {
  // Exclut les assets et les routes API (elles se protègent elles-mêmes).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
