import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

/**
 * Route Handler — DELETE /api/bookings/[id]
 *
 * Annulation d'une réservation. On ne supprime PAS la ligne : le statut passe à
 * CANCELLED et `cancelledAt` est horodaté. Le club garde ainsi la trace des
 * désinscriptions (utile pour repérer les annulations répétées), et la
 * contrainte unique (userId, sessionId) permet une réinscription propre.
 *
 * Le filtre porte sur `userId` en plus de l'`id` : un membre ne peut pas
 * annuler la réservation d'un autre en devinant un identifiant.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id, userId: auth.id },
    include: { session: { select: { startsAt: true } } },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "Réservation introuvable.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cette réservation est déjà annulée.", code: "ALREADY_CANCELLED" },
      { status: 409 },
    );
  }
  // Une présence validée est un fait constaté : l'annuler réécrirait l'histoire.
  if (booking.status === "ATTENDED") {
    return NextResponse.json(
      { error: "Votre présence a déjà été validée.", code: "ALREADY_ATTENDED" },
      { status: 409 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
