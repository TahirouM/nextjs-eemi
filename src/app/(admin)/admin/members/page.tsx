import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getAdminMembers } from "@/lib/queries";
import {
  Badge,
  Panel,
  EmptyState,
  Input,
  PageHeader,
  Button,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import {
  formatShortDate,
  membershipStatusLabel,
  membershipStatusTone,
  roleLabel,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Membres · Administration",
  robots: { index: false, follow: false },
};

/**
 * Liste des membres avec recherche.
 *
 * La recherche est un simple <form method="get"> : pas une ligne de JavaScript,
 * la requête part en GET, le serveur refiltre en SQL et l'URL reste partageable.
 * C'est le rappel que tout n'a pas besoin d'être un Client Component.
 */
export default async function AdminMembersPage({
  searchParams,
}: PageProps<"/admin/members">) {
  // Réservé aux administrateurs : un coach n'administre pas les adhésions.
  await requireAdmin();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : undefined;
  const page = Number(params.page) || 1;

  const { users, total, pageCount } = await getAdminMembers(query, page);

  return (
    <>
      <PageHeader
        title="Membres"
        description="Gérez les adhésions et les rôles des utilisateurs du club."
      />

      <form method="get" className="mb-6 flex gap-2" role="search">
        <Input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un membre"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
        {query && (
          <Link
            href="/admin/members"
            className="inline-flex items-center rounded-sm px-3 text-sm text-ink-soft hover:text-ink"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <EmptyState
          title="Aucun membre trouvé"
          description={
            query
              ? `Aucun résultat pour « ${query} ». Essayez un autre terme.`
              : "Le club n'a encore aucun membre inscrit."
          }
        />
      ) : (
        <Panel className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th scope="col" className="p-4">Membre</th>
                  <th scope="col" className="p-4">Rôle</th>
                  <th scope="col" className="p-4">Adhésion</th>
                  <th scope="col" className="p-4">Salle</th>
                  <th scope="col" className="p-4">Séances</th>
                  <th scope="col" className="p-4">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {users.map((member) => {
                  const membership = member.memberships[0];
                  return (
                    <tr key={member.id} className="hover:bg-surface-sunk">
                      <td className="p-4">
                        <Link
                          href={`/admin/members/${member.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {member.firstName} {member.lastName}
                        </Link>
                        <p className="text-xs text-ink-soft">{member.email}</p>
                      </td>
                      <td className="p-4">
                        <Badge
                          tone={member.role === "ADMIN" ? "accent" : "neutral"}
                        >
                          {roleLabel[member.role]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {membership ? (
                          <Badge tone={membershipStatusTone[membership.status]}>
                            {membershipStatusLabel[membership.status]}
                          </Badge>
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="p-4 text-ink-soft">
                        {member.preferredSite?.name ?? "—"}
                      </td>
                      <td className="p-4">{member._count.bookings}</td>
                      <td className="whitespace-nowrap p-4 text-ink-soft">
                        {formatShortDate(member.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              basePath="/admin/members"
              params={{ q: query }}
            />
          </div>
        </Panel>
      )}
    </>
  );
}
