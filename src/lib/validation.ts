import { z } from "zod";

/**
 * Schémas Zod partagés.
 *
 * Les messages sont des CLÉS de traduction, pas du texte : Zod s'exécute sans
 * connaître la langue de la requête. Ce sont les Server Actions qui traduisent
 * la clé au moment de renvoyer l'erreur au formulaire.
 *
 * Les Server Actions valident TOUJOURS ici avant d'écrire : le navigateur peut
 * envoyer n'importe quoi, la validation HTML n'est qu'un confort d'UX.
 */

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "firstNameShort").max(50),
    lastName: z.string().trim().min(2, "lastNameShort").max(50),
    email: z.string().trim().toLowerCase().email("emailInvalid"),
    password: z
      .string()
      .min(8, "passwordShort")
      .max(100, "passwordLong"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export const onboardingSchema = z.object({
  preferredSiteId: z.string().min(1, "chooseSite"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s.-]{6,20}$/, "phoneInvalid")
    .optional()
    .or(z.literal("")),
  birthDate: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "dateInvalid")
    .optional()
    .or(z.literal("")),
  plan: z.enum(["standard", "premium"]),
  reminderOptIn: z.coerce.boolean().optional(),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "firstNameShort").max(50),
  lastName: z.string().trim().min(2, "lastNameShort").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s.-]{6,20}$/, "phoneInvalid")
    .optional()
    .or(z.literal("")),
});

export const preferencesSchema = z.object({
  preferredSiteId: z.string().min(1, "chooseSite"),
  emailOptIn: z.coerce.boolean().optional(),
  reminderOptIn: z.coerce.boolean().optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "currentPasswordRequired"),
    newPassword: z.string().min(8, "passwordShort").max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export const sessionFormSchema = z
  .object({
    activityId: z.string().min(1, "activityRequired"),
    siteId: z.string().min(1, "siteRequired"),
    coachId: z.string().optional().or(z.literal("")),
    startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "dateInvalid"),
    durationMin: z.coerce.number().int().min(15, "durationMin").max(300),
    capacity: z.coerce.number().int().min(1, "capacityMin").max(200),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => new Date(d.startsAt) > new Date(), {
    message: "mustBeFuture",
    path: ["startsAt"],
  });

/** Transforme une erreur Zod en objet { champ: cléDeTraduction }. */
export function fieldErrorKeys(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
