import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { distanceKm } from "@/lib/format";

/**
 * Route Handler — GET /api/sites?lat=..&lng=..
 *
 * Les salles du club, triées par distance quand la position est fournie.
 * Alimente la carte mobile : chaque salle porte ses coordonnées et le nombre
 * de séances à venir, pour que le membre voie où « il se passe quelque chose ».
 *
 * `nfcTagId` est exposé pour que l'app puisse indiquer, avant le scan, quelle
 * borne est attendue. Ce n'est pas un secret : le tag est physiquement collé à
 * l'entrée de la salle, et la validation reste serveur (présence + fenêtre
 * horaire + réservation existante — voir /api/check-in).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasPosition =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const now = new Date();
  const sites = await prisma.site.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          sessions: { where: { startsAt: { gte: now }, status: "SCHEDULED" } },
        },
      },
      activities: { select: { name: true, slug: true }, orderBy: { name: "asc" } },
    },
  });

  const mapped = sites.map((site) => ({
    id: site.id,
    slug: site.slug,
    name: site.name,
    address: site.address,
    city: site.city,
    postalCode: site.postalCode,
    latitude: site.latitude,
    longitude: site.longitude,
    nfcTagId: site.nfcTagId,
    upcomingSessions: site._count.sessions,
    activities: site.activities,
    distanceKm: hasPosition
      ? Number(distanceKm({ latitude: lat, longitude: lng }, site).toFixed(2))
      : null,
  }));

  if (hasPosition) {
    mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  return NextResponse.json(
    { sites: mapped, position: hasPosition ? { latitude: lat, longitude: lng } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
