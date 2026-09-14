import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { getAdminSessionDetail } from "@/lib/queries";
import {
  Alert,
  Badge,
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { CancelSessionForm, CheckInButtons } from "@/components/admin-actions";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDate,
  formatTime,
  sessionStatusLabel,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Détail de la séance · Administration",
  robots: { index: false, follow: false },
};

/**
 * Feuille de présence : c'est l'écran qui change réellement un état métier
 * (BOOKED -> ATTENDED / NO_SHOW), pas une simple consultation.
 */
export default async function AdminSessionDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/sessions/[id]">) {
  const user = await requireStaff();
  const { id } = await params;
  const query = await searchParams;

  const session = await getAdminSessionDetail(id);
  if (!session) notFound();

  const isPast = session.startsAt <= new Date();
  const attended = session.bookings.filter((b) => b.status === "ATTENDED").length;

  return (
    <>
      <Link
        href="/admin/sessions"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Retour aux séances
      </Link>

      <div className="mt-4">
        <PageHeader
          title={session.activity.name}
          description={`${formatDate(session.startsAt)} · ${formatTime(session.startsAt)} – ${formatTime(session.endsAt)} · ${session.site.name}`}
          action={
            <Badge
              tone={session.status === "CANCELLED" ? "danger" : "success"}
            >
              {sessionStatusLabel[session.status]}
            </Badge>
          }
        />
      </div>

      {query.created === "1" && (
        <div className="mb-6">
          <Alert tone="success">
            Séance créée. Elle est ouverte à la réservation.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>
              Feuille de présence ({session.bookings.length} inscrit
              {session.bookings.length > 1 ? "s" : ""})
            </CardTitle>

            {session.bookings.length === 0 ? (
              <EmptyState
                title="Aucun inscrit"
                description="Personne n'a encore réservé cette séance."
              />
            ) : (
              <ul className="divide-y divide-border">
                {session.bookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center gap-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {booking.user.firstName} {booking.user.lastName}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {booking.user.email}
                      </p>
                    </div>

                    <Badge tone={bookingStatusTone[booking.status]}>
                      {bookingStatusLabel[booking.status]}
                    </Badge>

                    {session.status !== "CANCELLED" && (
                      <CheckInButtons
                        bookingId={booking.id}
                        status={booking.status}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Remplissage</CardTitle>
            <p className="text-3xl font-semibold">
              {session.bookings.length}
              <span className="text-base font-normal text-muted">
                {" "}
                / {session.capacity}
              </span>
            </p>
            {isPast && (
              <p className="mt-2 text-sm text-muted">
                {attended} présence{attended > 1 ? "s" : ""} validée
                {attended > 1 ? "s" : ""}
              </p>
            )}

            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Coach
                </dt>
                <dd className="mt-0.5">
                  {session.coach
                    ? `${session.coach.firstName} ${session.coach.lastName}`
                    : "À confirmer"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Salle
                </dt>
                <dd className="mt-0.5">
                  {session.site.name} — {session.site.city}
                </dd>
              </div>
              {session.notes && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    Consignes
                  </dt>
                  <dd className="mt-0.5 text-muted">{session.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* L'annulation n'est proposée qu'aux administrateurs et seulement
              sur une séance à venir encore programmée. */}
          {user.role === "ADMIN" &&
            session.status === "SCHEDULED" &&
            !isPast && (
              <Card>
                <CardTitle>Zone sensible</CardTitle>
                <CancelSessionForm sessionId={session.id} />
              </Card>
            )}
        </div>
      </div>
    </>
  );
}
