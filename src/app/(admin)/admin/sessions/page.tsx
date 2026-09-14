import type { Metadata } from "next";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { formatShortDate, formatTime, sessionStatusLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Séances · Administration",
  robots: { index: false, follow: false },
};

export default async function AdminSessionsPage({
  searchParams,
}: PageProps<"/admin/sessions">) {
  const user = await requireStaff();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { sessions, total, pageCount } = await getAdminSessions(page);

  return (
    <>
      <PageHeader
        title="Séances"
        description="Toutes les séances du club, passées et à venir."
        action={
          user.role === "ADMIN" ? (
            <ButtonLink href="/admin/sessions/new">Créer une séance</ButtonLink>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance"
          description="Créez la première séance du planning."
          action={
            user.role === "ADMIN" ? (
              <ButtonLink href="/admin/sessions/new">Créer une séance</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-0">
          {/* Le tableau déborde sur mobile : on le laisse défiler
              horizontalement dans son propre conteneur. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="p-4">Séance</th>
                  <th scope="col" className="p-4">Date</th>
                  <th scope="col" className="p-4">Salle</th>
                  <th scope="col" className="p-4">Coach</th>
                  <th scope="col" className="p-4">Inscrits</th>
                  <th scope="col" className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-muted">
                    <td className="p-4">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {session.activity.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-4 text-muted">
                      {formatShortDate(session.startsAt)} ·{" "}
                      {formatTime(session.startsAt)}
                    </td>
                    <td className="p-4 text-muted">{session.site.name}</td>
                    <td className="p-4 text-muted">
                      {session.coach
                        ? `${session.coach.firstName} ${session.coach.lastName}`
                        : "—"}
                    </td>
                    <td className="p-4">
                      {session._count.bookings}/{session.capacity}
                    </td>
                    <td className="p-4">
                      <Badge
                        tone={
                          session.status === "CANCELLED"
                            ? "danger"
                            : session.status === "DONE"
                              ? "neutral"
                              : "success"
                        }
                      >
                        {sessionStatusLabel[session.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              basePath="/admin/sessions"
            />
          </div>
        </Card>
      )}
    </>
  );
}
