import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminStats } from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Panel,
  PanelTitle,
  Stat,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/**
 * Vue d'ensemble du back-office : des chiffres qui servent à décider
 * (remplissage faible, absentéisme) plutôt qu'un dashboard décoratif.
 */
export default async function AdminHomePage() {
  const t = await getTranslations("admin");
  const user = await requireStaff();

  return (
    <>
      <PageHeader
        title={t("overview")}
        description={t("overviewDescription")}
        action={
          user.role === "ADMIN" ? (
            <ButtonLink href="/admin/sessions/new">
              {t("createSession")}
            </ButtonLink>
          ) : undefined
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <AdminStats />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Panel><PanelTitle>{t("nextSessions")}</PanelTitle><Skeleton className="h-32" /></Panel>}>
          <NextSessions />
        </Suspense>

        <Suspense fallback={<Panel><PanelTitle>{t("lowAttendance")}</PanelTitle><Skeleton className="h-32" /></Panel>}>
          <LowAttendance />
        </Suspense>
      </div>
    </>
  );
}

async function AdminStats() {
  const t = await getTranslations("admin");
  const stats = await getAdminStats();

  const cards = [
    { label: t("statAccounts"), value: stats.members },
    { label: t("statActiveMemberships"), value: stats.activeMemberships },
    { label: t("statUpcoming"), value: stats.upcomingSessions },
    { label: t("statWeekBookings"), value: stats.weekBookings },
    { label: t("statNoShows"), value: stats.noShows },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Stat key={card.label} value={card.value} label={card.label} />
      ))}
    </div>
  );
}

async function NextSessions() {
  const t = await getTranslations("admin");
  const sessions = await prisma.session.findMany({
    where: { startsAt: { gte: new Date() }, status: "SCHEDULED" },
    orderBy: { startsAt: "asc" },
    take: 6,
    include: {
      activity: { select: { name: true } },
      site: { select: { name: true } },
      _count: {
        select: { bookings: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  return (
    <Panel>
      <PanelTitle
        action={
          <Link href="/admin/sessions" className="text-sm font-medium text-accent">
            {t("seeAll")}
          </Link>
        }
      >
        {t("nextSessions")}
      </PanelTitle>

      {sessions.length === 0 ? (
        <EmptyState
          title={t("noSessionScheduled")}
          description={t("noSessionScheduledText")}
        />
      ) : (
        <ul className="divide-y divide-rule">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/sessions/${session.id}`}
                  className="truncate font-medium hover:text-accent"
                >
                  {session.activity.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  <span className="capitalize">
                    {formatDate(session.startsAt)}
                  </span>{" "}
                  · {formatTime(session.startsAt)} · {session.site.name}
                </p>
              </div>
              <Badge>
                {session._count.bookings}/{session.capacity}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Séances à venir dont le remplissage est inférieur à 40 % : c'est
 * l'information qui déclenche une action (relancer, regrouper, annuler).
 */
async function LowAttendance() {
  const t = await getTranslations("admin");
  const sessions = await prisma.session.findMany({
    where: { startsAt: { gte: new Date() }, status: "SCHEDULED" },
    orderBy: { startsAt: "asc" },
    take: 20,
    include: {
      activity: { select: { name: true } },
      site: { select: { name: true } },
      _count: {
        select: { bookings: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  // Le ratio se calcule ligne par ligne : Prisma ne sait pas comparer deux
  // colonnes dans un `where` ici, donc on filtre après lecture d'un lot borné.
  const low = sessions
    .filter((s) => s._count.bookings / s.capacity < 0.4)
    .slice(0, 6);

  return (
    <Panel>
      <PanelTitle>{t("lowAttendance")}</PanelTitle>

      {low.length === 0 ? (
        <EmptyState
          title={t("allGood")}
          description={t("allGoodText")}
        />
      ) : (
        <ul className="divide-y divide-rule">
          {low.map((session) => {
            const ratio = Math.round(
              (session._count.bookings / session.capacity) * 100,
            );
            return (
              <li key={session.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/sessions/${session.id}`}
                    className="truncate font-medium hover:text-accent"
                  >
                    {session.activity.name}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    <span className="capitalize">
                      {formatDate(session.startsAt)}
                    </span>{" "}
                    · {session.site.name}
                  </p>
                </div>
                <Badge tone={ratio === 0 ? "stop" : "warn"}>{ratio} %</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-l-2 border-rule pl-4">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="mt-2.5 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
