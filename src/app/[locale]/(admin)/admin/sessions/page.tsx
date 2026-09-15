import type { Metadata } from "next";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { getAdminSessions } from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Panel,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { formatShortDate, formatTime, sessionStatusKey } from "@/lib/format";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Séances · Administration",
  robots: { index: false, follow: false },
};

export default async function AdminSessionsPage({
  searchParams,
}: PageProps<"/[locale]/admin/sessions">) {
  const t = await getTranslations("admin");
  const tStatus = await getTranslations("status");
  const user = await requireStaff();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { sessions, total, pageCount } = await getAdminSessions(page);

  return (
    <>
      <PageHeader
        title={t("sessionsTitle")}
        description={t("sessionsDescription")}
        action={
          user.role === "ADMIN" ? (
            <ButtonLink href="/admin/sessions/new">{t("createSession")}</ButtonLink>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title={t("noSession")}
          description={t("noSessionText")}
          action={
            user.role === "ADMIN" ? (
              <ButtonLink href="/admin/sessions/new">{t("createSession")}</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <Panel className="p-0">
          {/* Le tableau déborde sur mobile : on le laisse défiler
              horizontalement dans son propre conteneur. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th scope="col" className="p-4">{t("colSession")}</th>
                  <th scope="col" className="p-4">{t("colDate")}</th>
                  <th scope="col" className="p-4">{t("colRoom")}</th>
                  <th scope="col" className="p-4">{t("colCoach")}</th>
                  <th scope="col" className="p-4">{t("colBooked")}</th>
                  <th scope="col" className="p-4">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-sunk">
                    <td className="p-4">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {session.activity.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-4 text-ink-soft">
                      {formatShortDate(session.startsAt)} ·{" "}
                      {formatTime(session.startsAt)}
                    </td>
                    <td className="p-4 text-ink-soft">{session.site.name}</td>
                    <td className="p-4 text-ink-soft">
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
                            ? "stop" : session.status === "DONE"
                              ? "neutral"
                              : "go"
                        }
                      >
                        {tStatus(sessionStatusKey[session.status])}
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
        </Panel>
      )}
    </>
  );
}
