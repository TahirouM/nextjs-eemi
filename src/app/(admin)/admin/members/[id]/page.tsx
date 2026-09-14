import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Alert,
  Badge,
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { MembershipStatusForm, RoleForm } from "@/components/admin-actions";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatShortDate,
  formatTime,
  membershipStatusLabel,
  membershipStatusTone,
  roleLabel,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "Fiche membre · Administration",
  robots: { index: false, follow: false },
};

export default async function AdminMemberDetailPage({
  params,
}: PageProps<"/admin/members/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      preferredSite: { select: { name: true, city: true } },
      memberships: { orderBy: { createdAt: "desc" }, take: 1 },
      bookings: {
        orderBy: { session: { startsAt: "desc" } },
        take: 10,
        include: {
          session: {
            include: {
              activity: { select: { name: true } },
              site: { select: { name: true } },
            },
          },
        },
      },
      _count: {
        select: { bookings: { where: { status: "ATTENDED" } } },
      },
    },
  });

  if (!member) notFound();

  const membership = member.memberships[0];
  const isSelf = member.id === admin.id;

  return (
    <>
      <Link
        href="/admin/members"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Retour aux membres
      </Link>

      <div className="mt-4">
        <PageHeader
          title={`${member.firstName} ${member.lastName}`}
          description={member.email}
          action={
            <Badge tone={member.role === "ADMIN" ? "accent" : "neutral"}>
              {roleLabel[member.role]}
            </Badge>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>Dernières séances</CardTitle>

            {member.bookings.length === 0 ? (
              <EmptyState
                title="Aucune réservation"
                description="Ce membre n'a encore réservé aucune séance."
              />
            ) : (
              <ul className="divide-y divide-border">
                {member.bookings.map((booking) => (
                  <li key={booking.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/sessions/${booking.sessionId}`}
                        className="truncate font-medium hover:text-accent"
                      >
                        {booking.session.activity.name}
                      </Link>
                      <p className="text-sm text-muted">
                        {formatShortDate(booking.session.startsAt)} ·{" "}
                        {formatTime(booking.session.startsAt)} ·{" "}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Informations</CardTitle>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Séances suivies
                </dt>
                <dd className="mt-0.5 text-2xl font-semibold">
                  {member._count.bookings}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Salle de référence
                </dt>
                <dd className="mt-0.5">
                  {member.preferredSite?.name ?? "Non renseignée"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Téléphone
                </dt>
                <dd className="mt-0.5">{member.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Onboarding
                </dt>
                <dd className="mt-1">
                  <Badge tone={member.onboarded ? "success" : "warning"}>
                    {member.onboarded ? "Terminé" : "À faire"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Inscrit le
                </dt>
                <dd className="mt-0.5">{formatShortDate(member.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardTitle>Adhésion</CardTitle>
            {membership && (
              <p className="mb-3">
                <Badge tone={membershipStatusTone[membership.status]}>
                  {membershipStatusLabel[membership.status]}
                </Badge>
                <span className="ml-2 text-xs capitalize text-muted">
                  formule {membership.plan}
                </span>
              </p>
            )}

            {isSelf ? (
              <Alert tone="error">
                Vous ne pouvez pas modifier votre propre adhésion.
              </Alert>
            ) : (
              <MembershipStatusForm
                userId={member.id}
                current={membership?.status ?? "PENDING"}
              />
            )}
          </Card>

          <Card>
            <CardTitle>Rôle</CardTitle>
            {isSelf ? (
              <Alert tone="error">
                Vous ne pouvez pas modifier votre propre rôle : cela vous
                ferait perdre l&apos;accès au back-office.
              </Alert>
            ) : (
              <RoleForm userId={member.id} current={member.role} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
