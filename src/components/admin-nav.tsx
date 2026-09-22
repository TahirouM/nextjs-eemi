"use client";

import { Link, usePathname } from "@/i18n/routing";

/** Onglets du back-office. Client Component pour signaler l'onglet actif. */
export function AdminNav({
  isAdmin,
  labels,
}: {
  isAdmin: boolean;
  labels: {
    overview: string;
    sessions: string;
    members: string;
    qr: string;
    ariaLabel: string;
  };
}) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: labels.overview, exact: true },
    { href: "/admin/sessions", label: labels.sessions, exact: false },
    // Les affiches QR sont utiles au coach comme à l'administrateur : c'est
    // le coach qui ouvre la salle et constate qu'une affiche a disparu.
    { href: "/admin/bornes", label: labels.qr, exact: false },
    // La gestion des membres est réservée aux administrateurs : un coach anime
    // des séances, il n'administre pas les adhésions.
    ...(isAdmin
      ? [{ href: "/admin/members", label: labels.members, exact: false }]
      : []),
  ] as const;

  return (
    <nav
      aria-label={labels.ariaLabel}
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
