import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

/**
 * Route Handlers — /api/bookings
 *
 *   GET  → historique des réservations du membre (trace des pointages incluse)
 *   POST → réservation d'une séance (la mutation principale du produit)
 *
 * Les règles métier sont RÉPLIQUÉES depuis `actions/bookings.ts` et exécutées
 * dans une transaction côté serveur. Le mobile ne décide rien : il poste un
 * `sessionId`, le serveur vérifie l'adhésion, la capacité et les doublons.
 * Un client modifié ne peut donc pas contourner ces règles.
 */

const createSchema = z.object({
  sessionId: z.string().min(1, "Séance requise."),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  // Pagination : l'historique d'un membre fidèle peut être long, et l'énoncé
  // interdit de tout charger d'un coup sur mobile.
  const take = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const cursor = searchParams.get("cursor");
  // `scope=upcoming` alimente l'écran d'accueil, `past` l'historique.
  const scope = searchParams.get("scope");

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      userId: auth.id,
      ...(scope === "upcoming"
        ? { status: { in: ["BOOKED", "CONFIRMED"] }, session: { startsAt: { gte: now } } }
        : {}),
      ...(scope === "past"
        ? { OR: [{ session: { startsAt: { lt: now } } }, { status: { in: ["ATTENDED", "NO_SHOW"] } }] }
        : {}),
    },
    orderBy: scope === "upcoming" ? { session: { startsAt: "asc" } } : { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      session: {
        include: {
          activity: { select: { name: true, slug: true, level: true } },
          site: {
            select: {
              id: true, name: true, city: true, address: true,
              latitude: true, longitude: true, nfcTagId: true,
            },
          },
          coach: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // On demande un élément de plus que la page : sa présence indique qu'une
  // page suivante existe, sans second COUNT(*).
  const hasMore = bookings.length > take;
  const page = hasMore ? bookings.slice(0, take) : bookings;

  return NextResponse.json(
    {
      bookings: page.map((b) => ({
        id: b.id,
        status: b.status,
        checkedInAt: b.checkedInAt,
        checkInMethod: b.checkInMethod,
        createdAt: b.createdAt,
        session: {
          id: b.session.id,
          startsAt: b.session.startsAt,
          endsAt: b.session.endsAt,
          status: b.session.status,
          activity: b.session.activity,
          site: b.session.site,
          coach: b.session.coach
            ? `${b.session.coach.firstName} ${b.session.coach.lastName}`
            : null,
        },
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request);
  if (auth instanceof NextResponse) return auth;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }

  const { sessionId } = parsed.data;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: { id: true, capacity: true, startsAt: true, status: true },
      });

      if (!session) throw new Error("NOT_FOUND");
      if (session.status !== "SCHEDULED") throw new Error("NOT_BOOKABLE");
      if (session.startsAt <= new Date()) throw new Error("PAST");

      const membership = await tx.membership.findFirst({
        where: { userId: auth.id, status: "ACTIVE" },
      });
      if (!membership) throw new Error("NO_MEMBERSHIP");

      const existing = await tx.booking.findUnique({
        where: { userId_sessionId: { userId: auth.id, sessionId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new Error("ALREADY_BOOKED");
      }

      const taken = await tx.booking.count({
        where: { sessionId, status: { not: "CANCELLED" } },
      });
      if (taken >= session.capacity) throw new Error("FULL");

      // Contrainte unique (userId, sessionId) : on réactive au lieu de recréer.
      if (existing) {
        return tx.booking.update({
          where: { id: existing.id },
          data: { status: "BOOKED", cancelledAt: null },
        });
      }
      return tx.booking.create({
        data: { userId: auth.id, sessionId, status: "BOOKED" },
      });
    });

    return NextResponse.json({ ok: true, booking }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    // Chaque refus porte un message ET un code : le mobile affiche le texte,
    // et peut réagir différemment selon le code (ex. proposer l'adhésion).
    const messages: Record<string, { message: string; status: number }> = {
      NOT_FOUND: { message: "Cette séance n'existe plus.", status: 404 },
      NOT_BOOKABLE: { message: "Cette séance a été annulée.", status: 409 },
      PAST: { message: "Cette séance est déjà passée.", status: 409 },
      NO_MEMBERSHIP: {
        message: "Votre adhésion doit être active pour réserver.",
        status: 403,
      },
      ALREADY_BOOKED: { message: "Vous êtes déjà inscrit à cette séance.", status: 409 },
      FULL: { message: "Cette séance est complète.", status: 409 },
    };
    const known = messages[code];
    return NextResponse.json(
      { error: known?.message ?? "Réservation impossible.", code },
      { status: known?.status ?? 500 },
    );
  }
}
