"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

/**
 * Navigation de l'espace membre.
 *
 * Client Component parce qu'elle dépend de `usePathname()` : marquer l'onglet
 * courant demande de connaître l'URL affichée, ce qu'un Server Component ne
 * peut pas savoir après une navigation côté client.
 *
 * Le lien "Administration" est masqué pour les non-admins, mais c'est un
 * confort visuel : la vraie protection est dans le layout du groupe (admin),
 * côté serveur. Taper l'URL à la main ne donne aucun accès.
 */
export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Tableau de bord" },
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
      className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2"
    >
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
