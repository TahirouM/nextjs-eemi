"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

/**
 * Onglets de l'espace membre.
 *
 * Client Component parce qu'ils dépendent de `usePathname()` : marquer
 * l'onglet courant demande de connaître l'URL affichée, ce qu'un Server
 * Component ne peut pas savoir après une navigation côté client.
 *
 * L'onglet actif est signalé par un trait épais sous le libellé ET par
 * `aria-current` : l'information ne repose pas uniquement sur la couleur.
 *
 * Le lien « Administration » est masqué pour les membres, mais c'est un
 * confort visuel : la vraie protection est dans le layout du groupe (admin),
 * côté serveur. Taper l'URL à la main ne donne aucun accès.
 */
export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Accueil" },
    { href: "/sessions", label: "Réserver" },
    { href: "/bookings", label: "Mes séances" },
    { href: "/settings", label: "Réglages" },
    ...(role === "ADMIN" || role === "COACH"
      ? [{ href: "/admin", label: "Administration" }]
      : []),
  ];

  return (
    <nav
      aria-label="Navigation de l'espace membre"
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
