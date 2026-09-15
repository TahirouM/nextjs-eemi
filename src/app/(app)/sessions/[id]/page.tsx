import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { getSessionDetail, getUserBooking } from "@/lib/queries";
import { Alert, Badge, PageHeader, Panel } from "@/components/ui";
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
  // Un identifiant inconnu doit rendre un vrai 404, pas une page vide.
  if (!session) notFound();

  const booking = await getUserBooking(user.id, session.id);
  const active = booking && booking.status !== "CANCELLED" ? booking : null;

  const left = session.capacity - session._count.bookings;
  const isPast = session.startsAt <= new Date();
  const isCancelled = session.status === "CANCELLED";

  const facts = [
    { k: "Date", v: formatDate(session.startsAt), caps: true },
    {
      k: "Horaire",
      v: `${formatTime(session.startsAt)} – ${formatTime(session.endsAt)}`,
    },
    { k: "Salle", v: session.site.name },
    {
      k: "Adresse",
      v: `${session.site.address}, ${session.site.postalCode} ${session.site.city}`,
    },
    {
      k: "Coach",
      v: session.coach
        ? `${session.coach.firstName} ${session.coach.lastName}`
        : "À confirmer",
    },
    {
      k: "Niveau",
      v: levelLabel[session.activity.level] ?? session.activity.level,
    },
  ];

  return (
    <>
      <Link
        href="/sessions"
        className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        ← Retour au planning
      </Link>

      <div className="mt-4">
        <PageHeader
          title={session.activity.name}
          description={session.activity.description}
          action={
            isCancelled ? (
              <Badge tone="stop">{sessionStatusLabel[session.status]}</Badge>
            ) : (
              <Badge tone="court">{sessionStatusLabel[session.status]}</Badge>
            )
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.k} className="border-t border-rule pt-3">
              <dt className="text-sm text-ink-soft">{f.k}</dt>
              <dd className={`mt-1 font-medium ${f.caps ? "capitalize" : ""}`}>
                {f.v}
              </dd>
            </div>
          ))}

          {session.notes && (
            <div className="border-t border-rule pt-3 sm:col-span-2">
              <dt className="text-sm text-ink-soft">Consignes</dt>
              <dd className="mt-1 text-pretty">{session.notes}</dd>
            </div>
          )}
        </dl>

        {/* Bloc d'action : la seule zone où l'on agit, isolée du reste. */}
        <Panel sunk className="h-fit">
          <p className="nums font-display text-4xl font-bold leading-none">
            {Math.max(0, left)}
            <span className="text-lg font-normal text-ink-soft">
              {" "}
              / {session.capacity}
            </span>
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            place{left > 1 ? "s" : ""} restante{left > 1 ? "s" : ""}
          </p>

          <div className="mt-5 border-t border-rule pt-5">
            {isCancelled ? (
              <Alert tone="error">
                Cette séance a été annulée par le club.
              </Alert>
            ) : isPast ? (
              <p className="text-sm text-ink-soft">
                Cette séance est déjà passée.
              </p>
            ) : active ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Votre réservation{" "}
                  <Badge tone={bookingStatusTone[active.status]}>
                    {bookingStatusLabel[active.status]}
                  </Badge>
                </p>
                {active.status !== "ATTENDED" && (
                  <CancelButton bookingId={active.id} full />
                )}
              </div>
            ) : (
              <BookButton sessionId={session.id} disabled={left <= 0} full />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
