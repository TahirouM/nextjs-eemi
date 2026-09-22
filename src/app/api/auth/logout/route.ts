import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session";

/**
 * Route Handler — POST /api/auth/logout
 *
 * Supprime la ligne `AuthSession` : la révocation est RÉELLE côté serveur.
 * Effacer le token du trousseau de l'appareil ne suffirait pas — un token
 * intercepté resterait valable jusqu'à son expiration naturelle (7 jours).
 *
 * Renvoie 200 même si le token est déjà invalide : la déconnexion est
 * idempotente, l'app mobile doit toujours pouvoir nettoyer son état local.
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.authSession
        .delete({ where: { id: payload.sid } })
        // Session déjà supprimée (double appel, expiration) : sans intérêt ici.
        .catch(() => null);
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
