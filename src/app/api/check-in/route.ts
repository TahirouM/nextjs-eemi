import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/format";

/**
 * Route Handler — POST /api/check-in
 *
 * Contrat consommé par l'application React Native : le téléphone lit le code
 * de la borne affichée à l'entrée de la salle et poste son identifiant. Le
 * serveur retrouve le site correspondant, cherche la réservation du membre
 * pour une séance qui commence bientôt DANS CETTE SALLE, et valide la
 * présence.
 *
 * Pourquoi c'est robuste : le membre ne choisit pas la séance qu'il valide.
 * C'est la borne physique (donc sa présence réelle sur place) plus la fenêtre
 * horaire qui déterminent la réservation concernée. Impossible de pointer
 * depuis chez soi en devinant un identifiant.
 *
 * La version web valide la présence depuis la feuille de présence du coach
 * (`checkInMethod: "web"`) ; cette route écrit `"qr"`, ou `"simulated"` /
 * `"manual"` selon la façon dont le mobile a obtenu l'identifiant.
 *
 * Le champ reste nommé `nfcTagId` (comme la colonne `Site.nfcTagId`) alors que
 * la lecture se fait désormais par QR code. C'est assumé : renommer la colonne
 * imposerait une migration et casserait les clients déjà déployés, pour un
 * gain purement cosmétique. L'identifiant désigne LA BORNE d'une salle ; la
 * façon de le lire — puce NFC hier, QR code aujourd'hui — ne change ni sa
 * valeur ni son rôle.
 */

const bodySchema = z.object({
  nfcTagId: z.string().min(1, "Identifiant de tag requis"),
  /**
   * Position du téléphone au moment du scan. Optionnelle : si le membre a
   * refusé la géolocalisation, le pointage reste possible (le tag physique
   * prouve déjà la présence). Quand elle est fournie, elle sert de second
   * facteur et est tracée dans l'historique.
   */
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  /**
   * Comment le client a obtenu l'identifiant. Liste FERMÉE : un client ne
   * peut pas inventer une valeur ni écrire du texte libre en base.
   *
   * Pourquoi tracer ça côté serveur : le club doit pouvoir distinguer, dans
   * sa feuille de présence, un code réellement scanné sur place d'un pointage
   * obtenu en mode démonstration ou par saisie au clavier. Sans cette
   * distinction, une présence de test serait indiscernable d'une vraie.
   *
   * `"nfc"` est conservé bien que l'application soit passée au QR code : des
   * lignes `Booking` historiques portent cette valeur, et la retirer ferait
   * mentir la feuille de présence sur des présences déjà enregistrées.
   *
   * Par défaut `"qr"` : c'est le cas d'usage normal aujourd'hui.
   */
  method: z.enum(["qr", "nfc", "simulated", "manual"]).default("qr"),
});

/**
 * Rayon toléré entre la position déclarée et la salle, en kilomètres.
 * Ne s'applique qu'aux sites dont `requiresProximity` est vrai.
 */
const MAX_DISTANCE_KM = 1;

/** Fenêtre de tolérance autour de l'heure de début, en minutes. */
const WINDOW_BEFORE_MIN = 30;
const WINDOW_AFTER_MIN = 30;

export async function POST(request: NextRequest) {
  // Accepte le cookie (web) comme le Bearer token (application mobile) :
  // c'est le téléphone qui lit le tag, donc l'appel vient de React Native.
  const user = await requireApiUser(request);
  if (user instanceof NextResponse) return user;

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
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      requiresProximity: true,
    },
  });
  if (!site) {
    return NextResponse.json(
      { error: "Borne inconnue.", code: "UNKNOWN_TAG" },
      { status: 404 },
    );
  }

  /*
    Cohérence QR + GPS : un code photographié et présenté ailleurs est rejeté.
    C'est le croisement des deux signaux qui rend le pointage difficile à
    falsifier — ni le code seul, ni la position seule n'y suffisent. Le QR
    étant, par nature, plus facile à recopier qu'une puce NFC, cette
    vérification compte plus encore qu'au temps du NFC.

    Deux décisions distinctes, à ne pas confondre :

      MESURER la distance  -> dès que le téléphone envoie sa position. La
                              valeur part dans la réponse et dans le journal
                              de l'app, même quand elle ne bloque rien.
      REFUSER sur distance -> seulement si la salle l'exige
                              (`requiresProximity`).

    Une salle à `false` accepte donc un pointage de loin, mais la distance
    reste enregistrée : on renonce à refuser, pas à savoir. C'est ce qui
    permet au club de constater après coup qu'un pointage vient d'ailleurs.
  */
  const { latitude, longitude } = parsed.data;
  let measuredDistanceKm: number | null = null;
  if (latitude !== undefined && longitude !== undefined) {
    measuredDistanceKm = distanceKm({ latitude, longitude }, site);

    if (site.requiresProximity && measuredDistanceKm > MAX_DISTANCE_KM) {
      return NextResponse.json(
        {
          error: `Vous semblez à ${measuredDistanceKm.toFixed(1)} km de ${site.name}. Rapprochez-vous de la borne.`,
          code: "TOO_FAR",
          distanceKm: Number(measuredDistanceKm.toFixed(2)),
        },
        { status: 409 },
      );
    }
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
        code: "NO_BOOKING",
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
      checkInMethod: parsed.data.method,
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
    distanceKm:
      measuredDistanceKm === null
        ? null
        : Number(measuredDistanceKm.toFixed(2)),
    session: {
      id: booking.session.id,
      startsAt: booking.session.startsAt,
      activity: booking.session.activity.name,
    },
  });
}
