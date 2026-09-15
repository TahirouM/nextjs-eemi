"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/routing";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Sélecteur de langue.
 *
 * Client Component : il doit connaître le chemin actuellement affiché
 * (`usePathname`) pour renvoyer vers LA MÊME page dans l'autre langue, plutôt
 * que de ramener systématiquement à l'accueil.
 *
 * `usePathname` vient de `@/i18n/routing`, pas de `next/navigation` : cette
 * version renvoie le chemin SANS le préfixe de langue, ce qui permet de le
 * réutiliser tel quel pour l'autre locale.
 *
 * Deux langues seulement : on affiche les deux côte à côte plutôt qu'un menu
 * déroulant. Un clic suffit, et la langue disponible est visible sans
 * interaction préalable.
 *
 * `useTransition` garde la page courante lisible pendant le changement, au
 * lieu de la vider.
 */
export function LanguageSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      // `scroll: false` : on reste au même endroit de la page, changer de
      // langue n'est pas une navigation vers un nouveau contenu.
      router.replace(pathname, { locale: next, scroll: false });
    });
  }

  return (
    <div
      className="flex items-center"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <span className="sr-only" id="language-label">
        {t("label")}
      </span>

      <div
        role="group"
        aria-labelledby="language-label"
        className={`flex items-center gap-0.5 rounded-sm border p-0.5 ${
          tone === "dark" ? "border-paper/25" : "border-rule"
        }`}
      >
        {routing.locales.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              lang={code}
              onClick={() => switchTo(code)}
              aria-current={active ? "true" : undefined}
              // Le libellé complet reste accessible même si le bouton
              // n'affiche que « FR » / « EN ».
              aria-label={t("switchTo", { language: t(code) })}
              className={`rounded-[2px] px-2 py-0.5 text-xs font-medium uppercase transition-colors duration-150 ${
                active
                  ? tone === "dark"
                    ? "bg-paper text-ink"
                    : "bg-ink text-paper"
                  : tone === "dark"
                    ? "text-paper/70 hover:text-paper"
                    : "text-ink-soft hover:text-ink"
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
