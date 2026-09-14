"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  requireOnboardedUser,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import {
  fieldErrors,
  onboardingSchema,
  passwordSchema,
  preferencesSchema,
  profileSchema,
} from "@/lib/validation";

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
} | null;

/**
 * Onboarding : c'est l'étape qui transforme un compte en utilisateur du produit.
 * Elle rattache le membre à un site (sa salle par défaut) et crée son adhésion.
 * Tant que `onboarded` est false, le middleware et `requireOnboardedUser`
 * ramènent l'utilisateur ici.
 */
export async function completeOnboardingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    preferredSiteId: formData.get("preferredSiteId"),
    phone: formData.get("phone") ?? "",
    birthDate: formData.get("birthDate") ?? "",
    plan: formData.get("plan"),
    reminderOptIn: formData.get("reminderOptIn") === "on",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Le site vient d'une liste déroulante, mais on revérifie son existence :
  // la valeur peut être falsifiée avant envoi.
  const site = await prisma.site.findUnique({
    where: { id: data.preferredSiteId },
    select: { id: true },
  });
  if (!site) return { errors: { preferredSiteId: "Site inconnu" } };

  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        preferredSiteId: site.id,
        phone: data.phone || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        reminderOptIn: data.reminderOptIn ?? true,
        onboarded: true,
      },
    });

    const existing = await tx.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Adhésion ACTIVE directement : le club n'encaisse pas en ligne dans cette
    // version, l'inscription vaut activation (limite assumée, cf. README).
    if (existing) {
      await tx.membership.update({
        where: { id: existing.id },
        data: { plan: data.plan, status: "ACTIVE", endsAt },
      });
    } else {
      await tx.membership.create({
        data: { userId: user.id, plan: data.plan, status: "ACTIVE", endsAt },
      });
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?welcome=1");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOnboardedUser();

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { ok: true, message: "Profil mis à jour." };
}

export async function updatePreferencesAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOnboardedUser();

  const parsed = preferencesSchema.safeParse({
    preferredSiteId: formData.get("preferredSiteId"),
    emailOptIn: formData.get("emailOptIn") === "on",
    reminderOptIn: formData.get("reminderOptIn") === "on",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const site = await prisma.site.findUnique({
    where: { id: parsed.data.preferredSiteId },
    select: { id: true },
  });
  if (!site) return { errors: { preferredSiteId: "Site inconnu" } };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      preferredSiteId: site.id,
      emailOptIn: parsed.data.emailOptIn ?? false,
      reminderOptIn: parsed.data.reminderOptIn ?? false,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/sessions");

  return { ok: true, message: "Préférences enregistrées." };
}

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOnboardedUser();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { errors: { _form: "Compte introuvable." } };

  // On exige le mot de passe actuel : un cookie volé ne doit pas suffire
  // à verrouiller le compte de la victime.
  const ok = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return { errors: { currentPassword: "Mot de passe actuel incorrect" } };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { ok: true, message: "Mot de passe modifié." };
}
