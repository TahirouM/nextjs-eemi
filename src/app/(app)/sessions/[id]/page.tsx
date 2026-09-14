import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { getSessionDetail, getUserBooking } from "@/lib/queries";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { BookButton, CancelButton } from "@/components/booking-buttons";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDate,
  formatTime,
  levelLabel,
  sessionStatusLabel,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Détail de la séance",
  robots: { index: false, follow: false },
};

/** Vue détail de la ressource « séance » (liste + détail exigés par le brief). */
export default async function SessionDetailPage({
  params,
}: PageProps<"/sessions/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;

  const session = await getSessionDetail(id);
  if (!session) notFound();

  const booking = await getUserBooking(user.id, session.id);
  const activeBooking = booking && booking.status !== "CANCELLED" ? booking : null;

  const remaining = session.capacity - session._count.bookings;
  const isPast = session.startsAt <= new Date();
  const isCancelled = session.status === "CANCELLED";

  return (
    <>
      <Link href="/sessions" className="text-sm text-muted hover:text-foreground">
        ← Retour au planning
      </Link>

      <div className="mt-4">
        <PageHeader
          title={session.activity.name}
          description={session.activity.description}
          action={
            <Badge tone={isCancelled ? "danger" : "accent"}>
              {sessionStatusLabel[session.status]}
            </Badge>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Date",
                  value: (
                    <span className="capitalize">
                      {formatDate(session.startsAt)}
                    </span>
                  ),
                },
                {
                  label: "Horaire",
                  value: `${formatTime(session.startsAt)} – ${formatTime(session.endsAt)}`,
                },
                { label: "Salle", value: session.site.name },
                {
                  label: "Adresse",
                  value: `${session.site.address}, ${session.site.postalCode} ${session.site.city}`,
                },
                {
                  label: "Coach",
                  value: session.coach
                    ? `${session.coach.firstName} ${session.coach.lastName}`
                    : "À confirmer",
                },
                {
                  label: "Niveau",
                  value:
                    levelLabel[session.activity.level] ?? session.activity.level,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>

            {session.notes && (
              <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
                {session.notes}
              </p>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <p className="text-xs uppercase tracking-wide text-muted">
            Disponibilité
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {Math.max(0, remaining)}
            <span className="text-base font-normal text-muted">
              {" "}
              / {session.capacity}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
          </p>

          <div className="mt-5 border-t border-border pt-5">
            {isCancelled ? (
              <Alert tone="error">
                Cette séance a été annulée par le club.
              </Alert>
            ) : isPast ? (
              <Alert tone="error">Cette séance est déjà passée.</Alert>
            ) : activeBooking ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Votre réservation :{" "}
                  <Badge tone={bookingStatusTone[activeBooking.status]}>
                    {bookingStatusLabel[activeBooking.status]}
                  </Badge>
                </p>
                {activeBooking.status !== "ATTENDED" && (
                  <CancelButton bookingId={activeBooking.id} full />
                )}
              </div>
            ) : (
              <BookButton
                sessionId={session.id}
                disabled={remaining <= 0}
                full
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
