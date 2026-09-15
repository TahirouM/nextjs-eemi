"use client";

import { usePathname } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import type { Role } from "@prisma/client";

/**
 * Onglets de l'espace membre.
 *
 * Client Component parce qu'ils dépendent de `usePathname()` : marquer
 * l'onglet courant demande de connaître l'URL affichée, ce qu'un Server
 * Component ne peut pas savoir après une navigation côté client.
 *
 * Les libellés sont passés en props par le layout (Server Component) : les
 * traductions sont ainsi résolues côté serveur, et ce composant n'embarque
 * aucun dictionnaire.
 *
 * `usePathname` vient de `@/i18n/routing` : il renvoie le chemin SANS le
 * préfixe de langue, donc la comparaison avec `/dashboard` fonctionne dans les
 * deux langues sans code supplémentaire.
 *
 * L'onglet actif est signalé par un trait épais ET par `aria-current` :
 * l'information ne repose pas uniquement sur la couleur.
 *
 * Le lien « Administration » est masqué pour les membres, mais c'est un
 * confort visuel : la vraie protection est dans le layout du groupe (admin),
 * côté serveur.
 */
export function AppNav({
  role,
  labels,
}: {
  role: Role;
  labels: {
    home: string;
    book: string;
    mySessions: string;
    settings: string;
    admin: string;
    ariaLabel: string;
  };
}) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: labels.home },
    { href: "/sessions", label: labels.book },
    { href: "/bookings", label: labels.mySessions },
    { href: "/settings", label: labels.settings },
    ...(role === "ADMIN" || role === "COACH"
      ? [{ href: "/admin", label: labels.admin }]
      : []),
  ] as const;

  return (
    <nav
      aria-label={labels.ariaLabel}
      className="mx-auto -mb-px max-w-6xl overflow-x-auto px-4"
    >
      <ul className="flex gap-6">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent text-ink-soft hover:border-rule-strong hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
