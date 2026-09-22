import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

/**
 * Route Handler — GET /api/auth/me
 *
 * Appelée au démarrage de l'app mobile pour valider le token retrouvé dans le
 * trousseau. C'est ce qui permet de « reprendre la session » sans redemander le
 * mot de passe, tout en détectant un token révoqué (401 → écran de connexion).
 *
 * Renvoie aussi l'adhésion et les compteurs : le profil mobile affiche le droit
 * de réserver, qui dépend d'une adhésion ACTIVE.
 */
export async function GET(request: NextRequest) {
  // `onboarded: false` : on veut pouvoir répondre à un compte non onboardé
  // pour que l'app affiche l'explication au lieu d'un 403 opaque.
  const auth = await requireApiUser(request, { onboarded: false });
  if (auth instanceof NextResponse) return auth;

  const [membership, bookingCount, attendedCount] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId: auth.id },
      orderBy: { createdAt: "desc" },
      select: { plan: true, status: true, startsAt: true, endsAt: true },
    }),
    prisma.booking.count({
      where: { userId: auth.id, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({ where: { userId: auth.id, status: "ATTENDED" } }),
  ]);

  const preferredSite = auth.preferredSiteId
    ? await prisma.site.findUnique({
        where: { id: auth.preferredSiteId },
        select: { id: true, name: true, city: true },
      })
    : null;

  return NextResponse.json(
    {
      user: auth,
      membership,
      preferredSite,
      stats: { bookings: bookingCount, attended: attendedCount },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
