import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { roleLabel } from "@/lib/format";
import { AppNav } from "@/components/app-nav";

/**
 * Layout du groupe (app) : navigation persistante de l'espace membre.
 *
 * La garde est placée ICI plutôt que dans chaque page : toutes les routes du
 * groupe en héritent, impossible d'en oublier une. Le layout étant un Server
 * Component, la vérification s'exécute sur le serveur à chaque navigation.
 *
 * Autre bénéfice : lors d'une navigation entre deux pages du groupe, ce layout
 * n'est pas re-rendu — seule la page change.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireOnboardedUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Aller au contenu
      </a>

      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/dashboard"
            className="font-display text-lg font-bold tracking-tight"
          >
            ClubSport
          </Link>

          <div className="ms-auto flex items-center gap-4">
            <p className="hidden text-sm sm:block">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              {user.role !== "MEMBER" && (
                <span className="ms-2 text-ink-soft">
                  {roleLabel[user.role]}
                </span>
              )}
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-sm px-2 py-1 text-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Onglets de navigation : Client Component pour l'état actif. */}
        <AppNav role={user.role} />
      </header>

      <main id="contenu" className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
