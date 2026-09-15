import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";
import { LanguageSwitch } from "@/components/language-switch";

/**
 * Layout du groupe (marketing) : en-tête et pied de page publics.
 *
 * Server Component : il lit la session pour afficher « Mon espace » plutôt que
 * « Connexion » quand l'utilisateur est déjà identifié. Aucun JavaScript n'est
 * envoyé au navigateur pour ce rendu, hormis le sélecteur de langue.
 *
 * `Link` vient de `@/i18n/routing` : il préfixe automatiquement les URLs avec
 * la langue courante, ce qui évite d'écrire `/${locale}/activites` partout.
 */
export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("nav"),
  ]);

  const nav = [
    { href: "/activites", label: t("disciplines") },
    { href: "/salles", label: t("rooms") },
    { href: "/tarifs", label: t("pricing") },
    { href: "/faq", label: t("faq") },
  ] as const;

  return (
    <>
      {/* Lien d'évitement : premier élément focusable de la page. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        {t("skipToContent")}
      </a>

      <header className="glass sticky top-0 z-40 border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            ClubSport
          </Link>

          <nav aria-label={t("mainNav")} className="hidden gap-6 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitch />
            {user ? (
              <ButtonLink href="/dashboard">{t("mySpace")}</ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline sm:inline"
                >
                  {t("login")}
                </Link>
                <ButtonLink href="/register">{t("join")}</ButtonLink>
              </>
            )}
          </div>
        </div>

        {/* Sur mobile, la navigation passe sur une seconde ligne défilante. */}
        <nav
          aria-label={t("mainNavMobile")}
          className="flex gap-5 overflow-x-auto border-t border-rule px-4 py-2 md:hidden"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <footer className="glass mt-8 border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display font-bold">ClubSport</p>
            <p className="mt-1 text-ink-soft">{t("locations")}</p>
          </div>

          <nav aria-label={t("footerNav")} className="flex flex-wrap gap-x-6 gap-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mx-auto max-w-6xl border-t border-rule px-4 py-4">
          <p className="text-xs text-ink-soft">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </>
  );
}
