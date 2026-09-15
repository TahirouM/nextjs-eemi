import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { CancelButton } from "@/components/booking-buttons";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDate,
  formatTime,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Mes séances",
  robots: { index: false, follow: false },
};

/**
 * Historique du membre : fin du parcours métier
 * (recherche → détail → réservation → confirmation → présence → historique).
 */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";

  const bookings = await getUserBookings(user.id, tab);

  const tabs = [
    { key: "upcoming", label: "À venir" },
    { key: "past", label: "Historique" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Mes séances"
        description="Vos réservations en cours et les séances déjà suivies."
        action={<ButtonLink href="/sessions">Réserver</ButtonLink>}
      />

      {/*
        Les onglets sont des LIENS : l'état vit dans l'URL, donc il est
        partageable, survit au rechargement et respecte le bouton Retour.
      */}
      <nav aria-label="Filtrer les séances" className="mb-6 flex gap-6 border-b border-rule">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Link
              key={item.key}
              href={`/bookings?tab=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px inline-block border-b-2 py-2.5 text-sm transition-colors duration-150 ${
                active
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-ink-soft hover:border-rule-strong hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {bookings.length === 0 ? (
        <EmptyState
          title={
            tab === "upcoming"
              ? "Aucune séance à venir"
              : "Pas encore d’historique"
          }
          description={
            tab === "upcoming"
              ? "Réservez une séance pour la retrouver ici."
              : "Vos séances passées apparaîtront ici une fois votre présence validée par le coach."
          }
          action={<ButtonLink href="/sessions">Voir le planning</ButtonLink>}
        />
      ) : (
        <ul>
          {bookings.map((booking) => {
            const canCancel =
              tab === "upcoming" &&
              booking.status !== "CANCELLED" &&
              booking.status !== "ATTENDED" &&
              booking.session.startsAt > new Date();

            return (
              <li
                key={booking.id}
                className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-rule py-4"
              >
                <time
                  dateTime={booking.session.startsAt.toISOString()}
                  className="nums w-[5.5rem] shrink-0 font-mono text-sm text-ink-soft"
                >
                  {formatTime(booking.session.startsAt)}
                </time>

                <div className="min-w-0 flex-1 basis-48">
                  <Link
                    href={`/sessions/${booking.sessionId}`}
                    className="font-display text-lg font-semibold underline-offset-4 hover:text-accent hover:underline"
                  >
                    {booking.session.activity.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    <span className="capitalize">
                      {formatDate(booking.session.startsAt)}
                    </span>
                    {" · "}
                    {booking.session.site.name}
                  </p>
                  {booking.checkedInAt && (
                    <p className="mt-0.5 text-sm text-ink-soft">
                      Présence validée{" "}
                      {booking.checkInMethod === "nfc"
                        ? "par badge NFC"
                        : "sur place"}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <Badge tone={bookingStatusTone[booking.status]}>
                    {bookingStatusLabel[booking.status]}
                  </Badge>
                  {canCancel && <CancelButton bookingId={booking.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
