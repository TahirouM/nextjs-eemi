import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { routing } from "@/i18n/routing";

/**
 * Charge les traductions pour chaque requête serveur.
 *
 * Le fichier de messages est importé dynamiquement : seule la langue demandée
 * est envoyée au client, pas les deux.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Fuseau forcé : le rendu serveur et le rendu client doivent produire la
    // même chaîne, sinon React signale une erreur d'hydratation.
    timeZone: "Europe/Paris",
  };
});
