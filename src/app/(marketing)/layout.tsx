import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";

/**
 * Layout du groupe (marketing) : en-tête et pied de page publics.
 *
 * Server Component : il lit la session pour afficher "Mon espace" plutôt que
 * "Connexion" quand l'utilisateur est déjà identifié. Aucun JavaScript n'est
 * envoyé au navigateur pour ce rendu.
 */
export default async function MarketingLayout({
  children,
}: LayoutProps<"/">) {
  const user = await getCurrentUser();

  const nav = [
    { href: "/activites", label: "Activités" },
    { href: "/salles", label: "Salles" },
    { href: "/tarifs", label: "Tarifs" },
    { href: "/faq", label: "FAQ" },
  ] as const;

  return (
    <>
      {/* Lien d'évitement : premier élément focusable, exigence d'accessibilité. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Club<span className="text-accent">Sport</span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden gap-5 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <ButtonLink href="/dashboard">Mon espace</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
                  Connexion
                </ButtonLink>
                <ButtonLink href="/register">Rejoindre le club</ButtonLink>
              </>
            )}
          </div>
        </div>

        {/* Navigation repliée sur mobile, affichée sous l'en-tête. */}
        <nav
          aria-label="Navigation principale mobile"
          className="flex gap-4 overflow-x-auto border-t border-border px-4 py-2 md:hidden"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm text-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ClubSport — Projet pédagogique EEMI.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/activites" className="hover:text-foreground">
              Activités
            </Link>
            <Link href="/salles" className="hover:text-foreground">
              Salles
            </Link>
            <Link href="/tarifs" className="hover:text-foreground">
              Tarifs
            </Link>
            <Link href="/faq" className="hover:text-foreground">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
