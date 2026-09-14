import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/session";

/**
 * `proxy.ts` — le middleware de Next.js, renommé par la convention introduite
 * en Next 16 (`middleware.ts` est déprécié, l'export s'appelle désormais
 * `proxy`). Le rôle n'a pas changé.
 *
 * Il tourne sur l'Edge runtime : pas d'accès à Prisma, donc pas de lecture de
 * rôle. Il ne fait QUE de l'aiguillage rapide sur la présence d'un cookie
 * signé valide :
 *   - visiteur anonyme sur une route privée  -> /login
 *   - utilisateur connecté sur /login        -> /dashboard
 *
 * Il ne constitue PAS la protection : un cookie signé prouve seulement qu'une
 * session a existé, pas qu'elle est toujours active ni quel rôle elle porte.
 * La vérification qui fait foi est dans src/lib/auth.ts, côté serveur.
 */

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/sessions",
  "/bookings",
  "/settings",
  "/onboarding",
  "/admin",
];
const AUTH_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(sessionCookieName())?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const hasSession = payload !== null;

  const isPrivate = PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isPrivate && !hasSession) {
    const url = new URL("/login", request.url);
    // Mémorise la destination pour y revenir après connexion.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclut les assets et les routes API (elles se protègent elles-mêmes).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
