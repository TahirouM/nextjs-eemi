import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { roleLabel } from "@/lib/format";
import { Badge } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";

/**
 * Layout du groupe (admin).
 *
 * `requireStaff()` = ADMIN ou COACH. C'est LA protection du back-office :
 * elle s'exécute côté serveur avant le rendu de n'importe quelle page du
 * groupe. Un membre qui tape /admin dans la barre d'adresse est redirigé,
 * même si le lien n'apparaît jamais dans son interface.
 *
 * Les actions destructrices (créer/annuler une séance, changer un rôle)
 * revérifient `requireAdmin()` de leur côté : un coach voit les listes mais
 * ne peut pas administrer le club.
 *
 * L'interface est volontairement distincte de l'espace membre — barre sombre,
 * navigation propre — pour qu'on ne confonde jamais les deux contextes.
 */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            ClubSport <span className="opacity-60">· Administration</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Badge tone="accent">{roleLabel[user.role]}</Badge>
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm opacity-80 transition hover:opacity-100"
            >
              Espace membre
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm opacity-80 transition hover:opacity-100"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        <AdminNav isAdmin={user.role === "ADMIN"} />
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
