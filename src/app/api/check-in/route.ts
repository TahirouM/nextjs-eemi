import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Route Handler — POST /api/check-in
 *
 * Contrat destiné à la future application React Native : le téléphone lit le
 * tag NFC posé à l'entrée de la salle et poste son identifiant. Le serveur
 * retrouve le site correspondant, cherche la réservation du membre pour une
 * séance qui commence bientôt DANS CETTE SALLE, et valide la présence.
 *
 * Pourquoi c'est robuste : le membre ne choisit pas la séance qu'il valide.
 * C'est le tag physique (donc sa présence réelle sur place) plus la fenêtre
 * horaire qui déterminent la réservation concernée. Impossible de pointer
 * depuis chez soi en devinant un identifiant.
 *
 * La version web valide la présence depuis la feuille de présence du coach
 * (`checkInMethod: "web"`) ; cette route écrira `"nfc"`.
 */

const bodySchema = z.object({
  nfcTagId: z.string().min(1, "Identifiant de tag requis"),
});

/** Fenêtre de tolérance autour de l'heure de début, en minutes. */
const WINDOW_BEFORE_MIN = 30;
const WINDOW_AFTER_MIN = 30;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }

  const site = await prisma.site.findUnique({
    where: { nfcTagId: parsed.data.nfcTagId },
    select: { id: true, name: true },
  });
  if (!site) {
    return NextResponse.json({ error: "Borne inconnue." }, { status: 404 });
  }

  const now = new Date();
  const booking = await prisma.booking.findFirst({
    where: {
      userId: user.id,
      status: { in: ["BOOKED", "CONFIRMED"] },
      session: {
        siteId: site.id,
        status: "SCHEDULED",
        startsAt: {
          gte: new Date(now.getTime() - WINDOW_AFTER_MIN * 60_000),
          lte: new Date(now.getTime() + WINDOW_BEFORE_MIN * 60_000),
        },
      },
    },
    orderBy: { session: { startsAt: "asc" } },
    include: {
      session: { include: { activity: { select: { name: true } } } },
    },
  });

  if (!booking) {
    return NextResponse.json(
      {
        error:
          "Aucune réservation à valider dans cette salle en ce moment.",
        site: site.name,
      },
      { status: 404 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "ATTENDED",
      checkedInAt: now,
      checkInMethod: "nfc",
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Présence validée pour ${booking.session.activity.name}.`,
    booking: {
      id: updated.id,
      status: updated.status,
      checkedInAt: updated.checkedInAt,
      checkInMethod: updated.checkInMethod,
    },
    site: site.name,
  });
}
