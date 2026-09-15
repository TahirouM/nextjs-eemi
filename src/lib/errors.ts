import "server-only";

import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { fieldErrorKeys } from "@/lib/validation";

/**
 * Traduit les erreurs de validation dans la langue de la requête.
 *
 * Zod produit des CLÉS (« emailInvalid »), pas du texte : il s'exécute sans
 * connaître la locale. La traduction a lieu ici, dans la Server Action, où
 * `getTranslations()` sait quelle langue a été demandée.
 *
 * Une clé absente du dictionnaire est renvoyée telle quelle plutôt que de
 * faire échouer l'action : mieux vaut un message technique qu'un écran blanc.
 */
export async function translateFieldErrors(
  error: z.ZodError,
): Promise<Record<string, string>> {
  const t = await getTranslations("validation");
  const keys = fieldErrorKeys(error);
  const out: Record<string, string> = {};

  for (const [field, key] of Object.entries(keys)) {
    out[field] = t.has(key) ? t(key) : key;
  }
  return out;
}

/** Traduit une clé isolée (messages renvoyés hors validation Zod). */
export async function tValidation(key: string) {
  const t = await getTranslations("validation");
  return t.has(key) ? t(key) : key;
}

/** Traduit un message du domaine réservation. */
export async function tBooking(key: string) {
  const t = await getTranslations("booking");
  return t.has(key) ? t(key) : key;
}

/**
 * Redirection qui CONSERVE la langue courante.
 *
 * `redirect()` de Next.js ignore le préfixe de locale : une redirection vers
 * "/dashboard" renverrait un utilisateur anglophone sur la version française.
 * `getLocale()` lit la langue de la requête en cours, et la version next-intl
 * de `redirect` pose le bon préfixe.
 */
export async function redirectLocalized(href: string): Promise<never> {
  const { getLocale } = await import("next-intl/server");
  const { redirect } = await import("@/i18n/routing");
  const locale = await getLocale();
  // `redirect` lève une exception interne à Next.js : la ligne suivante
  // n'est jamais atteinte, elle sert uniquement à typer le retour en `never`.
  redirect({ href, locale });
  throw new Error("unreachable");
}
