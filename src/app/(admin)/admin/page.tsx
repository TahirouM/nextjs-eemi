import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminStats } from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Card,
  CardTitle,
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
        <Suspense fallback={<Card><CardTitle>Prochaines séances</CardTitle><Skeleton className="h-32" /></Card>}>
          <NextSessions />
        </Suspense>

        <Suspense fallback={<Card><CardTitle>Séances à faible remplissage</CardTitle><Skeleton className="h-32" /></Card>}>
          <LowAttendance />
        </Suspense>
      </div>
    </>
  );
}

async function AdminStats() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Comptes", value: stats.members },
    { label: "Adhésions actives", value: stats.activeMemberships },
    { label: "Séances à venir", value: stats.upcomingSessions },
    { label: "Inscriptions (7 j)", value: stats.weekBookings },
    { label: "Absences", value: stats.noShows },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-xs uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p className="mt-1 text-3xl font-semibold">{card.value}</p>
        </Card>
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
    <Card>
      <CardTitle
        action={
          <Link href="/admin/sessions" className="text-sm font-medium text-accent">
            Tout voir
          </Link>
        }
      >
        Prochaines séances
      </CardTitle>

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance programmée"
          description="Créez une séance pour ouvrir les réservations."
        />
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/sessions/${session.id}`}
                  className="truncate font-medium hover:text-accent"
                >
                  {session.activity.name}
                </Link>
                <p className="text-sm text-muted">
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
    </Card>
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
    <Card>
      <CardTitle>Séances à faible remplissage</CardTitle>

      {low.length === 0 ? (
        <EmptyState
          title="Tout va bien"
          description="Aucune séance à venir sous les 40 % de remplissage."
        />
      ) : (
        <ul className="divide-y divide-border">
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
                  <p className="text-sm text-muted">
                    <span className="capitalize">
                      {formatDate(session.startsAt)}
                    </span>{" "}
                    · {session.site.name}
                  </p>
                </div>
                <Badge tone={ratio === 0 ? "danger" : "warning"}>{ratio} %</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-12" />
        </Card>
      ))}
    </div>
  );
}
