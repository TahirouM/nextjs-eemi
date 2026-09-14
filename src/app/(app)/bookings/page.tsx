import type { Metadata } from "next";
import Link from "next/link";

import { requireOnboardedUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
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
 * (recherche → détail → réservation → confirmation → historique).
 */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";

  const bookings = await getUserBookings(user.id, tab);

  return (
    <>
      <PageHeader
        title="Mes séances"
        description="Vos réservations à venir et l'historique de votre pratique."
        action={<ButtonLink href="/sessions">Réserver</ButtonLink>}
      />

      {/* Onglets = liens : l'état est dans l'URL, donc partageable et
          restauré par le bouton Retour du navigateur. */}
      <div
        role="tablist"
        aria-label="Filtrer les séances"
        className="mb-6 flex gap-1 border-b border-border"
      >
        {[
          { key: "upcoming", label: "À venir" },
          { key: "past", label: "Historique" },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <Link
              key={item.key}
              role="tab"
              aria-selected={active}
              href={`/bookings?tab=${item.key}`}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
                active
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title={
            tab === "upcoming"
              ? "Aucune séance à venir"
              : "Pas encore d'historique"
          }
          description={
            tab === "upcoming"
              ? "Réservez une séance pour la retrouver ici."
              : "Vos séances passées apparaîtront ici une fois votre présence validée par le coach."
          }
          action={<ButtonLink href="/sessions">Voir le planning</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const canCancel =
              tab === "upcoming" &&
              booking.status !== "CANCELLED" &&
              booking.status !== "ATTENDED" &&
              booking.session.startsAt > new Date();

            return (
              <li key={booking.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/sessions/${booking.sessionId}`}
                      className="font-semibold hover:text-accent"
                    >
                      {booking.session.activity.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      <span className="capitalize">
                        {formatDate(booking.session.startsAt)}
                      </span>{" "}
                      · {formatTime(booking.session.startsAt)} ·{" "}
                      {booking.session.site.name}
                    </p>
                    {booking.checkedInAt && (
                      <p className="text-xs text-muted">
                        Présence validée ·{" "}
                        {booking.checkInMethod === "nfc"
                          ? "badge NFC"
                          : "sur place"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <Badge tone={bookingStatusTone[booking.status]}>
                      {bookingStatusLabel[booking.status]}
                    </Badge>
                    {canCancel && <CancelButton bookingId={booking.id} />}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
