"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOnboardedUser, requireStaff } from "@/lib/auth";

/**
 * Flux métier principal : réserver une séance.
 *
 * Toutes les règles sont vérifiées ICI, côté serveur, et jamais seulement en
 * masquant un bouton : une Server Action est une route HTTP publique, elle peut
 * être appelée sans jamais afficher la page.
 *
 * Règles appliquées :
 *   1. session valide, programmée et à venir
 *   2. adhésion ACTIVE (une adhésion suspendue ne réserve pas)
 *   3. pas de double réservation (contrainte unique en base)
 *   4. capacité non dépassée — comptée dans une transaction pour éviter que
 *      deux requêtes simultanées prennent la même dernière place
 */

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
} | null;

export async function bookSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const sessionId = formData.get("sessionId");

  if (typeof sessionId !== "string" || !sessionId) {
    return { error: "Séance introuvable." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: { id: true, capacity: true, startsAt: true, status: true },
      });

      if (!session) throw new Error("NOT_FOUND");
      if (session.status !== "SCHEDULED") throw new Error("NOT_BOOKABLE");
      if (session.startsAt <= new Date()) throw new Error("PAST");

      const membership = await tx.membership.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
      });
      if (!membership) throw new Error("NO_MEMBERSHIP");

      const existing = await tx.booking.findUnique({
        where: { userId_sessionId: { userId: user.id, sessionId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new Error("ALREADY_BOOKED");
      }

      const taken = await tx.booking.count({
        where: { sessionId, status: { not: "CANCELLED" } },
      });
      if (taken >= session.capacity) throw new Error("FULL");

      // Une réservation annulée est réactivée plutôt que recréée :
      // la contrainte unique (userId, sessionId) interdit un second insert.
      if (existing) {
        await tx.booking.update({
          where: { id: existing.id },
          data: { status: "BOOKED", cancelledAt: null },
        });
      } else {
        await tx.booking.create({
          data: { userId: user.id, sessionId, status: "BOOKED" },
        });
      }
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = {
      NOT_FOUND: "Cette séance n'existe plus.",
      NOT_BOOKABLE: "Cette séance a été annulée.",
      PAST: "Cette séance est déjà passée.",
      NO_MEMBERSHIP:
        "Votre adhésion n'est pas active. Contactez l'accueil du club.",
      ALREADY_BOOKED: "Vous êtes déjà inscrit à cette séance.",
      FULL: "Cette séance est complète.",
    };
    return { error: messages[code] ?? "La réservation a échoué. Réessayez." };
  }

  // Rafraîchit les écrans qui affichent cette donnée (places restantes,
  // listes de réservations, compteurs du dashboard).
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/bookings");
  revalidatePath("/dashboard");

  return { ok: true, message: "Réservation confirmée." };
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireOnboardedUser();
  const bookingId = formData.get("bookingId");

  if (typeof bookingId !== "string" || !bookingId) {
    return { error: "Réservation introuvable." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { session: { select: { startsAt: true, id: true } } },
  });

  // On vérifie la propriété de la ressource : sans ce test, n'importe quel
  // membre connecté pourrait annuler la réservation d'un autre en envoyant
  // un identifiant deviné.
  if (!booking || booking.userId !== user.id) {
    return { error: "Réservation introuvable." };
  }
  if (booking.status === "CANCELLED") {
    return { error: "Cette réservation est déjà annulée." };
  }
  if (booking.status === "ATTENDED") {
    return { error: "Une séance déjà pointée ne peut plus être annulée." };
  }
  if (booking.session.startsAt <= new Date()) {
    return { error: "Trop tard : la séance a commencé." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${booking.session.id}`);

  return { ok: true, message: "Réservation annulée." };
}

/**
 * Pointage de présence par un coach ou un admin.
 * `checkInMethod: "web"` trace la provenance : la future application React
 * Native écrira "nfc" ici après lecture du tag posé à l'entrée du site.
 */
export async function checkInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const bookingId = formData.get("bookingId");
  const present = formData.get("present") === "true";

  if (typeof bookingId !== "string" || !bookingId) {
    return { error: "Réservation introuvable." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, sessionId: true },
  });
  if (!booking) return { error: "Réservation introuvable." };

  await prisma.booking.update({
    where: { id: bookingId },
    data: present
      ? { status: "ATTENDED", checkedInAt: new Date(), checkInMethod: "web" }
      : { status: "NO_SHOW", checkedInAt: null, checkInMethod: null },
  });

  revalidatePath(`/admin/sessions/${booking.sessionId}`);
  revalidatePath("/admin");

  return {
    ok: true,
    message: present ? "Présence enregistrée." : "Absence enregistrée.",
  };
}
