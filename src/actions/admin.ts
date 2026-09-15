"use server";

import { revalidatePath, updateTag } from "next/cache";

import type { MembershipStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { redirectLocalized, translateFieldErrors, tBooking, tValidation } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/queries";
import { sessionFormSchema } from "@/lib/validation";
import type { FormState } from "@/actions/profile";
import type { ActionState } from "@/actions/bookings";

/**
 * Actions du back-office. Chacune commence par `requireAdmin()` :
 * masquer le lien dans la navigation ne protège rien, une Server Action
 * reste appelable directement.
 */

export async function createSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = sessionFormSchema.safeParse({
    activityId: formData.get("activityId"),
    siteId: formData.get("siteId"),
    coachId: formData.get("coachId") ?? "",
    startsAt: formData.get("startsAt"),
    durationMin: formData.get("durationMin"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return { errors: await translateFieldErrors(parsed.error) };
  const data = parsed.data;

  const [activity, site] = await Promise.all([
    prisma.activity.findUnique({ where: { id: data.activityId } }),
    prisma.site.findUnique({ where: { id: data.siteId } }),
  ]);
  if (!activity) return { errors: { activityId: await tValidation("unknownActivity") } };
  if (!site) return { errors: { siteId: await tValidation("unknownSite") } };

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + data.durationMin * 60_000);

  const created = await prisma.session.create({
    data: {
      activityId: activity.id,
      siteId: site.id,
      coachId: data.coachId || null,
      startsAt,
      endsAt,
      capacity: data.capacity,
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  // Le compteur "séances à venir" de la home est mis en cache par tag.
  // `updateTag` (Next 16) plutôt que `revalidateTag` : depuis une Server Action
  // il expire le tag immédiatement, donc l'admin voit sa propre écriture au
  // rechargement suivant (« read-your-own-writes »).
  updateTag(CACHE_TAGS.activities);

  return await redirectLocalized(`/admin/sessions/${created.id}?created=1`);
}

/** Annule une séance et libère toutes ses réservations. */
export async function cancelSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId) {
    return { error: await tBooking("sessionNotFound") };
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: await tBooking("sessionNotFound") };
  if (session.status === "CANCELLED") {
    return { error: await tBooking("alreadyCancelledSession") };
  }

  await prisma.$transaction([
    prisma.session.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    }),
    // Les membres inscrits ne doivent pas rester sur une séance annulée.
    prisma.booking.updateMany({
      where: { sessionId, status: { in: ["BOOKED", "CONFIRMED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/sessions");
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/bookings");
  updateTag(CACHE_TAGS.activities);

  return { ok: true, message: await tBooking("sessionCancelledFreed") };
}

/** Change le statut d'adhésion : c'est le levier de suspension d'un membre. */
export async function updateMembershipStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const userId = formData.get("userId");
  const status = formData.get("status");

  const allowed: MembershipStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED"];
  if (
    typeof userId !== "string" ||
    typeof status !== "string" ||
    !allowed.includes(status as MembershipStatus)
  ) {
    return { error: await tValidation("invalidRequest") };
  }

  if (userId === admin.id) {
    return { error: await tBooking("cannotEditOwnMembership") };
  }

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (membership) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: status as MembershipStatus },
    });
  } else {
    const endsAt = new Date();
    endsAt.setFullYear(endsAt.getFullYear() + 1);
    await prisma.membership.create({
      data: { userId, status: status as MembershipStatus, endsAt },
    });
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${userId}`);

  return { ok: true, message: await tBooking("membershipUpdated") };
}

/** Promotion / rétrogradation d'un utilisateur. */
export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const userId = formData.get("userId");
  const role = formData.get("role");
  const allowed: Role[] = ["MEMBER", "COACH", "ADMIN"];

  if (
    typeof userId !== "string" ||
    typeof role !== "string" ||
    !allowed.includes(role as Role)
  ) {
    return { error: await tValidation("invalidRequest") };
  }

  // Garde-fou : un admin qui se rétrograde lui-même perdrait l'accès au
  // back-office sans moyen de revenir en arrière depuis l'interface.
  if (userId === admin.id) {
    return { error: await tBooking("cannotEditOwnRole") };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as Role },
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${userId}`);

  return { ok: true, message: await tBooking("roleUpdated") };
}
