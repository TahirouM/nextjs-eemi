import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { requireStaff } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { roleKey } from "@/lib/format";
import { LanguageSwitch } from "@/components/language-switch";
import { AdminNav } from "@/components/admin-nav";

/**
 * Layout du groupe (admin).
 *
 * `requireStaff()` = ADMIN ou COACH. C'est LA protection du back-office : elle
 * s'exécute côté serveur avant le rendu de n'importe quelle page du groupe. Un
 * membre qui tape /admin dans la barre d'adresse est redirigé, même si le lien
 * n'apparaît jamais dans son interface.
 *
 * Les actions destructrices (créer/annuler une séance, changer un rôle)
 * revérifient `requireAdmin()` de leur côté : un coach voit les listes mais
 * n'administre pas le club.
 *
 * Signal visuel : un bandeau d'encre pleine largeur. On ne peut pas confondre
 * le back-office avec l'espace membre, même d'un coup d'œil.
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [user, t, tStatus, tNav, tAuth] = await Promise.all([
    requireStaff(),
    getTranslations("admin"),
    getTranslations("status"),
    getTranslations("nav"),
    getTranslations("auth"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        {tNav("skipToContent")}
      </a>

      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-display text-lg font-bold tracking-tight">
            ClubSport{" "}
            <span className="font-normal opacity-60">{t("administration")}</span>
          </Link>

          <div className="ms-auto flex items-center gap-4 text-sm">
            <LanguageSwitch tone="dark" />
            <span className="opacity-70">{tStatus(roleKey[user.role])}</span>
            <Link
              href="/dashboard"
              className="underline-offset-4 opacity-80 transition-opacity duration-150 hover:underline hover:opacity-100"
            >
              {t("memberSpace")}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="underline-offset-4 opacity-80 transition-opacity duration-150 hover:underline hover:opacity-100"
              >
                {tAuth("logout")}
              </button>
            </form>
          </div>
        </div>

        <AdminNav
          isAdmin={user.role === "ADMIN"}
          labels={{
            overview: t("overview"),
            sessions: t("sessions"),
            members: t("members"),
            ariaLabel: t("adminNav"),
          }}
        />
      </header>

      <main id="contenu" className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
