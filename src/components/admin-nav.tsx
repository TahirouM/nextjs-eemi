"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets du back-office. Client Component pour signaler l'onglet actif. */
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Vue d’ensemble", exact: true },
    { href: "/admin/sessions", label: "Séances" },
    // La gestion des membres est réservée aux administrateurs : un coach anime
    // des séances, il n'administre pas les adhésions.
    ...(isAdmin ? [{ href: "/admin/members", label: "Membres" }] : []),
  ];

  return (
    <nav
      aria-label="Navigation de l'administration"
      className="mx-auto max-w-6xl overflow-x-auto px-4"
    >
      <ul className="flex gap-6">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "border-accent font-semibold text-paper"
                    : "border-transparent text-paper/65 hover:border-paper/40 hover:text-paper"
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
