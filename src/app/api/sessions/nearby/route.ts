import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/format";

/**
 * Route Handler — GET /api/sessions/nearby?lat=..&lng=..&radius=..
 *
 * Pourquoi une route API ici alors que tout le reste passe par des Server
 * Components ? Parce que ce point d'entrée n'a pas vocation à rendre du HTML :
 * c'est le contrat que consommera la future application React Native, qui
 * enverra la position GPS du téléphone et attendra du JSON.
 *
 * Il est authentifié comme le reste de l'application, avec le même cookie de
 * session relu par `getCurrentUser()`. Une route sous /api n'est pas publique
 * par défaut : elle doit vérifier la session elle-même, le proxy ne la couvre
 * pas (il exclut /api de son matcher).
 */
export async function GET(request: NextRequest) {
  // On n'utilise PAS `requireOnboardedUser()` ici : cette fonction fait un
  // `redirect()`, ce qui renverrait une 307 vers /login. Un client mobile
  // attend un code d'erreur exploitable, pas une page HTML de connexion.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }
  if (!user.onboarded) {
    return NextResponse.json(
      { error: "Onboarding non terminé." },
      { status: 403 },
    );
  }

  const { searchParams } = request.nextUrl;
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius")) || 10;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Paramètres 'lat' et 'lng' requis et numériques." },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Coordonnées hors des bornes valides." },
      { status: 400 },
    );
  }

  const sessions = await prisma.session.findMany({
    where: { startsAt: { gte: new Date() }, status: "SCHEDULED" },
    orderBy: { startsAt: "asc" },
    take: 100,
    include: {
      activity: { select: { name: true, slug: true, level: true } },
      site: true,
      _count: {
        select: { bookings: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  const position = { latitude: lat, longitude: lng };

  const nearby = sessions
    .map((session) => ({
      id: session.id,
      activity: session.activity.name,
      level: session.activity.level,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      remainingSeats: session.capacity - session._count.bookings,
      site: {
        name: session.site.name,
        city: session.site.city,
        latitude: session.site.latitude,
        longitude: session.site.longitude,
        // Identifiant du tag NFC posé à l'entrée : l'app mobile s'en servira
        // pour valider que le membre est physiquement sur place.
        nfcTagId: session.site.nfcTagId,
      },
      distanceKm: Number(distanceKm(position, session.site).toFixed(2)),
    }))
    .filter((s) => s.distanceKm <= radius)
    // Tri par distance puis par heure : l'app mobile propose d'abord la salle
    // où l'utilisateur se trouve réellement.
    .sort((a, b) => a.distanceKm - b.distanceKm || +a.startsAt - +b.startsAt);

  return NextResponse.json(
    {
      position,
      radiusKm: radius,
      count: nearby.length,
      sessions: nearby,
    },
    {
      // Données dépendantes de l'utilisateur et de sa position : elles ne
      // doivent jamais être mises en cache par un intermédiaire.
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
