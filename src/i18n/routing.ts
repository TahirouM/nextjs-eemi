import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

/**
 * Configuration des langues.
 *
 * `localePrefix: "always"` : chaque langue a ses propres URLs (/fr/…, /en/…).
 * C'est ce qui rend les deux versions indexables séparément par les moteurs de
 * recherche, et ce qui permet de partager un lien en conservant la langue.
 * Un cookie seul ne donnerait ni l'un ni l'autre.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Versions de `Link`, `redirect`, `usePathname`… conscientes de la langue :
 * elles préfixent automatiquement les URLs avec la locale courante, ce qui
 * évite d'avoir à écrire `/${locale}/sessions` partout dans le code.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
