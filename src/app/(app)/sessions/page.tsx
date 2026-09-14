import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import {
  getActivities,
  getSites,
  getUpcomingSessions,
  getUserBookings,
} from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { SessionFilters } from "@/components/session-filters";
import { BookButton } from "@/components/booking-buttons";
import { formatDate, formatTime, levelLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Réserver une séance",
  robots: { index: false, follow: false },
};

/**
 * Planning filtrable et paginé.
 *
 * Justification du rendu dynamique (choix n°3 du brief) : cette page est
 * volontairement SANS cache. Elle affiche les places restantes, une donnée qui
 * change à chaque réservation d'un autre membre. Un cache, même de quelques
 * secondes, afficherait « 2 places » sur une séance déjà complète — et la
 * réservation échouerait au clic. Le catalogue (salles, disciplines) est en
 * revanche lu depuis le cache : il ne bouge pas.
 */
export default async function SessionsPage({
  searchParams,
}: PageProps<"/sessions">) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  const siteId = typeof params.siteId === "string" ? params.siteId : undefined;
  const activityId =
    typeof params.activityId === "string" ? params.activityId : undefined;
  const page = Number(params.page) || 1;

  const [{ sessions, total, pageCount }, sites, activities, myBookings] =
    await Promise.all([
      getUpcomingSessions({ siteId, activityId, page }),
      getSites(),
      getActivities(),
      getUserBookings(user.id, "upcoming"),
    ]);

  // Ensemble des séances déjà réservées : évite de proposer « Réserver »
  // sur une séance à laquelle le membre est déjà inscrit.
  const bookedSessionIds = new Set(myBookings.map((b) => b.sessionId));

  return (
    <>
      <PageHeader
        title="Réserver une séance"
        description="Filtrez par salle ou par discipline. Les places restantes sont à jour à chaque chargement."
      />

      <SessionFilters
        sites={sites}
        activities={activities.map((a) => ({ id: a.id, name: a.name }))}
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune séance ne correspond"
          description="Essayez une autre salle ou une autre discipline : le planning est peut-être vide sur ce filtre."
          action={
            <ButtonLink href="/sessions" variant="secondary">
              Réinitialiser les filtres
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {sessions.map((session) => {
              const remaining = session.capacity - session._count.bookings;
              const alreadyBooked = bookedSessionIds.has(session.id);

              return (
                <li key={session.id}>
                  <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/sessions/${session.id}`}
                          className="font-semibold hover:text-accent"
                        >
                          {session.activity.name}
                        </Link>
                        <Badge>
                          {levelLabel[session.activity.level] ??
                            session.activity.level}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted">
                        <span className="capitalize">
                          {formatDate(session.startsAt)}
                        </span>{" "}
                        · {formatTime(session.startsAt)} –{" "}
                        {formatTime(session.endsAt)}
                      </p>
                      <p className="text-sm text-muted">
                        {session.site.name} ·{" "}
                        {session.coach
                          ? `${session.coach.firstName} ${session.coach.lastName}`
                          : "Coach à confirmer"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <Badge tone={remaining > 0 ? "success" : "danger"}>
                        {remaining > 0
                          ? `${remaining} place${remaining > 1 ? "s" : ""}`
                          : "Complet"}
                      </Badge>

                      {alreadyBooked ? (
                        <Badge tone="accent">Déjà inscrit</Badge>
                      ) : (
                        <BookButton
                          sessionId={session.id}
                          disabled={remaining <= 0}
                        />
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={page}
            pageCount={pageCount}
            total={total}
            basePath="/sessions"
            params={{ siteId, activityId }}
          />
        </>
      )}
    </>
  );
}
