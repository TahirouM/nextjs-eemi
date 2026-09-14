import { z } from "zod";

/**
 * Schémas Zod partagés. Les Server Actions valident TOUJOURS ici avant
 * d'écrire : le navigateur peut envoyer n'importe quoi, la validation HTML
 * n'est qu'un confort d'UX.
 */

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Prénom trop court").max(50),
    lastName: z.string().trim().min(2, "Nom trop court").max(50),
    email: z.string().trim().toLowerCase().email("Email invalide"),
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .max(100, "Mot de passe trop long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const onboardingSchema = z.object({
  preferredSiteId: z.string().min(1, "Choisissez un site"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s.-]{6,20}$/, "Numéro invalide")
    .optional()
    .or(z.literal("")),
  birthDate: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Date invalide")
    .optional()
    .or(z.literal("")),
  plan: z.enum(["standard", "premium"]),
  reminderOptIn: z.coerce.boolean().optional(),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom trop court").max(50),
  lastName: z.string().trim().min(2, "Nom trop court").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s.-]{6,20}$/, "Numéro invalide")
    .optional()
    .or(z.literal("")),
});

export const preferencesSchema = z.object({
  preferredSiteId: z.string().min(1, "Choisissez un site"),
  emailOptIn: z.coerce.boolean().optional(),
  reminderOptIn: z.coerce.boolean().optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "8 caractères minimum").max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const sessionFormSchema = z
  .object({
    activityId: z.string().min(1, "Activité requise"),
    siteId: z.string().min(1, "Site requis"),
    coachId: z.string().optional().or(z.literal("")),
    startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
    durationMin: z.coerce.number().int().min(15, "15 minutes minimum").max(300),
    capacity: z.coerce.number().int().min(1, "1 place minimum").max(200),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => new Date(d.startsAt) > new Date(), {
    message: "La séance doit être dans le futur",
    path: ["startsAt"],
  });

/** Transforme une erreur Zod en objet { champ: message } pour useActionState. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
