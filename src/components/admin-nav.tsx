"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Navigation du back-office. Client Component pour l'onglet actif. */
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Vue d'ensemble", exact: true },
    { href: "/admin/sessions", label: "Séances" },
    // La gestion des membres est réservée aux administrateurs : un coach
    // anime des séances, il n'administre pas les adhésions.
    ...(isAdmin ? [{ href: "/admin/members", label: "Membres" }] : []),
  ];

  return (
    <nav
      aria-label="Navigation de l'administration"
      className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
              active ? "bg-background/15 font-medium" : "opacity-70 hover:opacity-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
