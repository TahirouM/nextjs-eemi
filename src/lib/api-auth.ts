import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

/**
 * Authentification des Route Handlers consommés par l'application mobile.
 *
 * Pourquoi un fichier séparé de `lib/auth.ts` ? Parce que le web et le mobile
 * transportent la session différemment :
 *
 *   web    → cookie httpOnly, posé par une Server Action, envoyé par le navigateur
 *   mobile → en-tête `Authorization: Bearer <jwt>`, stocké dans expo-secure-store
 *
 * Un client React Native n'a pas de « jar » de cookies fiable et ne suit pas
 * les redirections HTML : il attend un JSON et un code d'état. On accepte donc
 * les DEUX transports et on retombe sur le même modèle de session.
 *
 * Point important : le JWT ne porte qu'un `sid` opaque (voir lib/session.ts).
 * La ligne `AuthSession` est relue en base à chaque requête, donc :
 *   - un logout mobile révoque réellement le token (suppression de la ligne) ;
 *   - un changement de rôle est pris en compte immédiatement ;
 *   - un token volé cesse de fonctionner dès la déconnexion.
 * C'est la même garantie que côté web, sans dupliquer la logique.
 */

export type ApiUser = CurrentUser;

/** Extrait le token du header `Authorization: Bearer <token>`. */
function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;

  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

/**
 * Résout l'utilisateur d'une requête API : Bearer d'abord (cas mobile), puis
 * cookie (permet de tester les mêmes routes depuis le navigateur connecté).
 * Renvoie `null` plutôt que de rediriger : un client mobile veut un 401.
 */
export async function getApiUser(
  request: NextRequest,
): Promise<ApiUser | null> {
  const bearer = readBearerToken(request);

  if (bearer) {
    const payload = await verifySessionToken(bearer);
    if (!payload) return null;

    const session = await prisma.authSession.findUnique({
      where: { id: payload.sid },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            onboarded: true,
            preferredSiteId: true,
          },
        },
      },
    });

    // Session révoquée côté serveur (logout) ou expirée : le JWT ne suffit pas.
    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
  }

  return getCurrentUser();
}

/** Réponse 401 normalisée : le client mobile déclenche sa déconnexion dessus. */
export function unauthorized() {
  return NextResponse.json(
    { error: "Authentification requise.", code: "UNAUTHENTICATED" },
    { status: 401 },
  );
}

/**
 * Garde d'authentification. Renvoie soit l'utilisateur, soit la réponse
 * d'erreur à retourner telle quelle — le handler reste linéaire :
 *
 *   const auth = await requireApiUser(request);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireApiUser(
  request: NextRequest,
  options: { onboarded?: boolean; roles?: Role[] } = {},
): Promise<ApiUser | NextResponse> {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  // L'onboarding se termine sur le web : le mobile sait afficher ce cas.
  if (options.onboarded !== false && !user.onboarded) {
    return NextResponse.json(
      { error: "Onboarding non terminé.", code: "ONBOARDING_REQUIRED" },
      { status: 403 },
    );
  }

  if (options.roles && !options.roles.includes(user.role)) {
    return NextResponse.json(
      { error: "Accès refusé.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return user;
}
