import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

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
  const user = await requireStaff();

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        description="L'activité du club en temps réel."
        action={
          user.role === "ADMIN" ? (
            <ButtonLink href="/admin/sessions/new">
              Créer une séance
            </ButtonLink>
          ) : undefined
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <AdminStats />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Panel><PanelTitle>Prochaines séances</PanelTitle><Skeleton className="h-32" /></Panel>}>
          <NextSessions />
        </Suspense>

        <Suspense fallback={<Panel><PanelTitle>Séances à faible remplissage</PanelTitle><Skeleton className="h-32" /></Panel>}>
          <LowAttendance />
        </Suspense>
      </div>
    </>
  );
}

async function AdminStats() {
  const stats = await getAdminStats();

  const cards = [
    { label: "comptes", value: stats.members },
    { label: "adhésions actives", value: stats.activeMemberships },
    { label: "séances à venir", value: stats.upcomingSessions },
    { label: "inscriptions sur 7 jours", value: stats.weekBookings },
    { label: "absences constatées", value: stats.noShows },
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
            Tout voir
          </Link>
        }
      >
        Prochaines séances
      </PanelTitle>

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance programmée"
          description="Créez une séance pour ouvrir les réservations."
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
      <PanelTitle>Séances à faible remplissage</PanelTitle>

      {low.length === 0 ? (
        <EmptyState
          title="Tout va bien"
          description="Aucune séance à venir sous les 40 % de remplissage."
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
