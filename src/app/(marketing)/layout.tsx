import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";

const NAV = [
  { href: "/activites", label: "Disciplines" },
  { href: "/salles", label: "Salles" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/faq", label: "Questions" },
] as const;

/**
 * Layout du groupe (marketing) : en-tête et pied de page publics.
 *
 * Server Component : il lit la session pour afficher « Mon espace » plutôt que
 * « Connexion » quand l'utilisateur est déjà identifié. Aucun JavaScript n'est
 * envoyé au navigateur pour ce rendu.
 */
export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <>
      {/* Lien d'évitement : premier élément focusable de la page. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            ClubSport
          </Link>

          <nav aria-label="Navigation principale" className="hidden gap-6 md:flex">
            {NAV.map((item) => (
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
            {user ? (
              <ButtonLink href="/dashboard">Mon espace</ButtonLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline sm:inline"
                >
                  Connexion
                </Link>
                <ButtonLink href="/register">Rejoindre</ButtonLink>
              </>
            )}
          </div>
        </div>

        {/* Sur mobile, la navigation passe sur une seconde ligne défilante. */}
        <nav
          aria-label="Navigation principale (mobile)"
          className="flex gap-5 overflow-x-auto border-t border-rule px-4 py-2 md:hidden"
        >
          {NAV.map((item) => (
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

      <footer className="border-t-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display font-bold">ClubSport</p>
            <p className="mt-1 text-ink-soft">
              Paris Bastille · Paris Nation · Montreuil
            </p>
          </div>

          <nav aria-label="Pied de page" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV.map((item) => (
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
            © {new Date().getFullYear()} ClubSport — projet pédagogique EEMI.
          </p>
        </div>
      </footer>
    </>
  );
}
