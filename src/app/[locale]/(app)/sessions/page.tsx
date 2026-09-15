import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import {
  getActivities,
  getSites,
  getUpcomingSessions,
  getUserBookings,
} from "@/lib/queries";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { SessionFilters } from "@/components/session-filters";
import { BookButton } from "@/components/booking-buttons";
import { formatDate, formatTime } from "@/lib/format";
import { getTranslations } from "next-intl/server";

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
 *
 * Présentation : les séances sont groupées par jour, comme sur un planning
 * mural. La date est un intertitre, pas une répétition sur chaque ligne.
 */
export default async function SessionsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sessions">) {
  const { locale } = await params;
  const lang = locale as "fr" | "en";
  const t = await getTranslations("sessions");
  const tLevel = await getTranslations("levels");
  const user = await requireOnboardedUser();
  const query = await searchParams;

  const siteId = typeof query.siteId === "string" ? query.siteId : undefined;
  const activityId =
    typeof query.activityId === "string" ? query.activityId : undefined;
  const page = Number(query.page) || 1;

  const [{ sessions, total, pageCount }, sites, activities, myBookings] =
    await Promise.all([
      getUpcomingSessions({ siteId, activityId, page }),
      getSites(),
      getActivities(),
      getUserBookings(user.id, "upcoming"),
    ]);

  // Séances déjà réservées : évite de proposer « Réserver » sur une séance à
  // laquelle le membre est déjà inscrit.
  const booked = new Set(myBookings.map((b) => b.sessionId));

  // Regroupement par jour, en conservant l'ordre chronologique du serveur.
  const days = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = formatDate(session.startsAt, lang);
    const list = days.get(key);
    if (list) list.push(session);
    else days.set(key, [session]);
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <SessionFilters
        sites={sites}
        activities={activities.map((a) => ({ id: a.id, name: a.name }))}
      />

      {sessions.length === 0 ? (
        <EmptyState
          title={t("noMatch")}
          description={t("noMatchText")}
          action={
            <ButtonLink href="/sessions" variant="secondary">
              {t("resetFilters")}
            </ButtonLink>
          }
        />
      ) : (
        <>
          {[...days.entries()].map(([day, list]) => (
            <section key={day} className="mb-10">
              <h2 className="sticky top-0 z-10 border-b-2 border-ink bg-paper pb-1.5 font-display text-sm font-semibold capitalize tracking-wide">
                {day}
              </h2>

              <ul>
                {list.map((session) => {
                  const left = session.capacity - session._count.bookings;
                  const already = booked.has(session.id);

                  return (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-rule py-4"
                    >
                      <time
                        dateTime={session.startsAt.toISOString()}
                        className="nums w-[5.5rem] shrink-0 font-mono text-sm text-ink-soft"
                      >
                        {formatTime(session.startsAt, lang)}
                      </time>

                      <div className="min-w-0 flex-1 basis-48">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            href={`/sessions/${session.id}`}
                            className="font-display text-lg font-semibold underline-offset-4 hover:text-accent hover:underline"
                          >
                            {session.activity.name}
                          </Link>
                          <Badge>
                            {tLevel(session.activity.level as "all")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-soft">
                          {session.site.name}
                          {session.coach
                            ? ` · ${session.coach.firstName} ${session.coach.lastName}`
                            : ` · ${t("coachTbc")}`}
                          {" · "}
                          {t("until", { time: formatTime(session.endsAt, lang) })}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <span
                          className={`nums text-sm ${
                            left > 0
                              ? "text-ink-soft"
                              : "font-medium text-stop"
                          }`}
                        >
                          {left > 0
                            ? t("seats", { count: left })
                            : t("full")}
                        </span>

                        {already ? (
                          <Badge tone="go">{t("booked")}</Badge>
                        ) : (
                          <BookButton
                            sessionId={session.id}
                            disabled={left <= 0}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

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
