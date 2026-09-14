import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import { getMemberStats, getUpcomingSessions, getUserBookings } from "@/lib/queries";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDate,
  formatTime,
  membershipStatusLabel,
  membershipStatusTone,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
};

/**
 * Tableau de bord.
 *
 * Chaque bloc lourd est enveloppé dans <Suspense> : la page (titre, structure,
 * navigation) s'affiche immédiatement, puis chaque section arrive dès que sa
 * requête SQL se termine. Sans cela, l'écran resterait blanc jusqu'à ce que la
 * plus lente des trois requêtes ait répondu.
 */
export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.firstName}`}
        description="Votre activité au club en un coup d'œil."
        action={<ButtonLink href="/sessions">Réserver une séance</ButtonLink>}
      />

      {params.welcome === "1" && (
        <div className="mb-6">
          <Alert tone="success">
            Votre inscription est finalisée. Vous pouvez réserver votre première
            séance.
          </Alert>
        </div>
      )}

      {/* Un utilisateur non autorisé renvoyé ici par requireRole(). */}
      {params.error === "forbidden" && (
        <div className="mb-6">
          <Alert tone="error">
            Vous n&apos;avez pas les droits nécessaires pour accéder à cette
            page.
          </Alert>
        </div>
      )}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection userId={user.id} />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ListSkeleton title="Mes prochaines séances" />}>
          <UpcomingBookings userId={user.id} />
        </Suspense>

        <Suspense fallback={<ListSkeleton title="À réserver prochainement" />}>
          <SuggestedSessions siteId={user.preferredSiteId} />
        </Suspense>
      </div>
    </>
  );
}

/* ------------------------------- Sections ------------------------------- */

async function StatsSection({ userId }: { userId: string }) {
  const stats = await getMemberStats(userId);

  const cards = [
    { label: "Séances à venir", value: stats.upcoming },
    { label: "Séances suivies", value: stats.attended },
    { label: "Ce mois-ci", value: stats.thisMonth },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <p className="text-xs uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p className="mt-1 text-3xl font-semibold">{card.value}</p>
        </Card>
      ))}

      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Adhésion</p>
        {stats.membership ? (
          <>
            <p className="mt-2">
              <Badge tone={membershipStatusTone[stats.membership.status]}>
                {membershipStatusLabel[stats.membership.status]}
              </Badge>
            </p>
            <p className="mt-2 text-xs capitalize text-muted">
              Formule {stats.membership.plan}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Aucune adhésion</p>
        )}
      </Card>
    </div>
  );
}

async function UpcomingBookings({ userId }: { userId: string }) {
  const bookings = await getUserBookings(userId, "upcoming");
  const next = bookings.slice(0, 4);

  return (
    <Card>
      <CardTitle
        action={
          <Link href="/bookings" className="text-sm font-medium text-accent">
            Tout voir
          </Link>
        }
      >
        Mes prochaines séances
      </CardTitle>

      {next.length === 0 ? (
        <EmptyState
          title="Aucune séance réservée"
          description="Réservez votre prochaine séance pour la voir apparaître ici."
          action={<ButtonLink href="/sessions">Voir le planning</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-border">
          {next.map((booking) => (
            <li key={booking.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {booking.session.activity.name}
                </p>
                <p className="text-sm text-muted">
                  <span className="capitalize">
                    {formatDate(booking.session.startsAt)}
                  </span>{" "}
                  · {formatTime(booking.session.startsAt)} ·{" "}
                  {booking.session.site.name}
                </p>
              </div>
              <Badge tone={bookingStatusTone[booking.status]}>
                {bookingStatusLabel[booking.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function SuggestedSessions({ siteId }: { siteId: string | null }) {
  // Filtré sur la salle préférée du membre : le réglage sert réellement à
  // quelque chose, il ne se contente pas d'être stocké.
  const { sessions } = await getUpcomingSessions({
    siteId: siteId ?? undefined,
    perPage: 4,
  });

  // Sans salle de référence, la liste porte sur toutes les salles : le titre
  // doit le dire, sinon il promet un filtre qui ne s'applique pas.
  const siteName = siteId ? sessions[0]?.site.name : null;
  const title = siteName
    ? `À réserver à ${siteName}`
    : "À réserver prochainement";

  return (
    <Card>
      <CardTitle
        action={
          <Link href="/sessions" className="text-sm font-medium text-accent">
            Tout le planning
          </Link>
        }
      >
        {title}
      </CardTitle>

      {sessions.length === 0 ? (
        <EmptyState
          title="Pas de séance programmée"
          description="Aucune séance à venir dans votre salle de référence pour l'instant."
          action={
            <ButtonLink href="/sessions" variant="secondary">
              Voir les autres salles
            </ButtonLink>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((session) => {
            const remaining = session.capacity - session._count.bookings;
            return (
              <li key={session.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sessions/${session.id}`}
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
                <Badge tone={remaining > 0 ? "success" : "danger"}>
                  {remaining > 0 ? `${remaining} pl.` : "Complet"}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------ Squelettes ------------------------------ */

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-12" />
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </Card>
  );
}
