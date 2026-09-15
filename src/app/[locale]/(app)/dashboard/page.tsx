import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth";
import {
  getMemberStats,
  getUpcomingSessions,
  getUserBookings,
} from "@/lib/queries";
import {
  Alert,
  Badge,
  ButtonLink,
  EmptyState,
  PageHeader,
  Panel,
  PanelTitle,
  Skeleton,
  Stat,
} from "@/components/ui";
import {
  bookingStatusKey,
  bookingStatusTone,
  formatDate,
  formatTime,
  membershipStatusKey,
  membershipStatusTone,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Accueil",
  robots: { index: false, follow: false },
};

/**
 * Tableau de bord.
 *
 * Chaque bloc lourd est enveloppé dans <Suspense> : la page (titre, structure,
 * navigation) s'affiche immédiatement, puis chaque section arrive dès que sa
 * requête SQL se termine. Sans cela, l'écran resterait vide jusqu'à ce que la
 * plus lente des trois requêtes ait répondu.
 */
export default async function DashboardPage({
  searchParams,
}: PageProps<"/[locale]/dashboard">) {
  const t = await getTranslations("app");
  const user = await requireOnboardedUser();
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title={t("greeting", { name: user.firstName })}
        description={t("dashboardSubtitle")}
        action={<ButtonLink href="/sessions">{t("bookSession")}</ButtonLink>}
      />

      {params.welcome === "1" && (
        <div className="mb-6">
          <Alert tone="success">
            {t("welcomeDone")}
          </Alert>
        </div>
      )}

      {/* Un utilisateur non autorisé est renvoyé ici par requireRole(). */}
      {params.error === "forbidden" && (
        <div className="mb-6">
          <Alert tone="error">
            {t("forbidden")}
          </Alert>
        </div>
      )}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection userId={user.id} />
      </Suspense>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ListSkeleton title="Mes prochaines séances" />}>
          <UpcomingBookings userId={user.id} />
        </Suspense>

        <Suspense fallback={<ListSkeleton title="À réserver" />}>
          <SuggestedSessions siteId={user.preferredSiteId} />
        </Suspense>
      </div>
    </>
  );
}

/* ------------------------------- Sections ------------------------------- */

async function StatsSection({ userId }: { userId: string }) {
  const t = await getTranslations("app");
  const tStatus = await getTranslations("status");
  const stats = await getMemberStats(userId);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      <Stat value={stats.upcoming} label={t("statBooked")} />
      <Stat value={stats.attended} label={t("statAttended")} />
      <Stat value={stats.thisMonth} label={t("statThisMonth")} />
      {/*
        L'adhésion n'est pas un nombre : la mettre au même corps que les
        chiffres voisins la ferait crier plus fort qu'eux. On garde la même
        colonne et le même filet, mais l'état s'exprime par une pastille.
      */}
      <div className="border-l-2 border-rule pl-4">
        <p className="mt-0.5">
          {stats.membership ? (
            <Badge tone={membershipStatusTone[stats.membership.status]}>
              {tStatus(membershipStatusKey[stats.membership.status])}
            </Badge>
          ) : (
            <Badge tone="warn">{t("noMembership")}</Badge>
          )}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {t("membership")}
          {stats.membership ? ` · formule ${stats.membership.plan}` : ""}
        </p>
      </div>
    </div>
  );
}

async function UpcomingBookings({ userId }: { userId: string }) {
  const t = await getTranslations("app");
  const tStatus = await getTranslations("status");
  const bookings = await getUserBookings(userId, "upcoming");
  const next = bookings.slice(0, 4);

  return (
    <Panel>
      <PanelTitle
        action={
          <Link
            href="/bookings"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            {t("seeAll")}
          </Link>
        }
      >
        {t("myNextSessions")}
      </PanelTitle>

      {next.length === 0 ? (
        <EmptyState
          title={t("noBooking")}
          description={t("noBookingText")}
          action={<ButtonLink href="/sessions">{t("seePlanning")}</ButtonLink>}
        />
      ) : (
        <ul className="rail ps-5">
          {next.map((booking) => (
            <li
              key={booking.id}
              className="relative border-b border-rule py-3 last:border-0"
            >
              <span
                aria-hidden="true"
                className="absolute -start-5 top-[1.15rem] size-2 -translate-x-[3px] rounded-full bg-rule-strong"
              />
              <div className="flex items-baseline gap-3">
                <time
                  dateTime={booking.session.startsAt.toISOString()}
                  className="nums font-mono text-sm text-ink-soft"
                >
                  {formatTime(booking.session.startsAt)}
                </time>
                <p className="min-w-0 flex-1 truncate font-medium">
                  {booking.session.activity.name}
                </p>
                <Badge tone={bookingStatusTone[booking.status]}>
                  {tStatus(bookingStatusKey[booking.status])}
                </Badge>
              </div>
              <p className="mt-0.5 ps-[3.25rem] text-sm capitalize text-ink-soft">
                {formatDate(booking.session.startsAt)} ·{" "}
                <span className="normal-case">{booking.session.site.name}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

async function SuggestedSessions({ siteId }: { siteId: string | null }) {
  const t = await getTranslations("app");
  // Filtré sur la salle de référence du membre : le réglage sert réellement à
  // quelque chose, il ne se contente pas d'être stocké.
  const { sessions } = await getUpcomingSessions({
    siteId: siteId ?? undefined,
    perPage: 4,
  });

  // Sans salle de référence, la liste porte sur toutes les salles : le titre
  // doit le dire, sinon il promet un filtre qui ne s'applique pas.
  const siteName = siteId ? sessions[0]?.site.name : null;

  return (
    <Panel>
      <PanelTitle
        action={
          <Link
            href="/sessions"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            {t("wholePlanning")}
          </Link>
        }
      >
        {siteName ? t("toBookAt", { room: siteName }) : t("toBook")}
      </PanelTitle>

      {sessions.length === 0 ? (
        <EmptyState
          title={t("noUpcoming")}
          description={t("noUpcomingText")}
          action={
            <ButtonLink href="/sessions" variant="secondary">
              {t("seeOtherRooms")}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="rail ps-5">
          {sessions.map((session) => {
            const left = session.capacity - session._count.bookings;
            return (
              <li
                key={session.id}
                className="relative border-b border-rule py-3 last:border-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute -start-5 top-[1.15rem] size-2 -translate-x-[3px] rounded-full bg-rule-strong"
                />
                <div className="flex items-baseline gap-3">
                  <time
                    dateTime={session.startsAt.toISOString()}
                    className="nums font-mono text-sm text-ink-soft"
                  >
                    {formatTime(session.startsAt)}
                  </time>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:text-accent hover:underline"
                  >
                    {session.activity.name}
                  </Link>
                  <span
                    className={`nums shrink-0 text-sm ${
                      left > 0 ? "text-ink-soft" : "font-medium text-stop"
                    }`}
                  >
                    {left > 0 ? `${left} pl.` : "complet"}
                  </span>
                </div>
                <p className="mt-0.5 ps-[3.25rem] text-sm capitalize text-ink-soft">
                  {formatDate(session.startsAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------ Squelettes ------------------------------ */

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-l-2 border-rule pl-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-2.5 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ title }: { title: string }) {
  return (
    <Panel>
      <PanelTitle>{title}</PanelTitle>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    </Panel>
  );
}
