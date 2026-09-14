import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { roleLabel } from "@/lib/format";
import { Badge } from "@/components/ui";
import { AppNav } from "@/components/app-nav";

/**
 * Layout du groupe (app) : navigation persistante de l'espace membre.
 *
 * La garde est placée ICI plutôt que dans chaque page : toutes les routes du
 * groupe en héritent, impossible d'en oublier une. Le layout étant un Server
 * Component, cette vérification s'exécute sur le serveur à chaque navigation.
 *
 * Autre bénéfice du layout partagé : lors d'une navigation entre deux pages du
 * groupe, il n'est pas re-rendu — seule la page change.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireOnboardedUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Club<span className="text-accent">Sport</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            {user.role !== "MEMBER" && (
              <Badge tone="accent">{roleLabel[user.role]}</Badge>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-muted hover:text-foreground"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Navigation : Client Component, car elle met en évidence l'onglet actif. */}
        <AppNav role={user.role} />
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
