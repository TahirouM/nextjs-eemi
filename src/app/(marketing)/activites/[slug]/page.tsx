import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getActivities, getActivityBySlug } from "@/lib/queries";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { formatDate, formatTime, levelLabel } from "@/lib/format";

/**
 * Route dynamique publique (`/activites/[slug]`).
 *
 * `generateStaticParams` déclare les six slugs connus : Next.js les rend au
 * build plutôt qu'à la première visite, et un slug inconnu tombe sur le
 * `notFound()` plus bas.
 *
 * `revalidate = 300` : la fiche est resservie depuis le cache pendant 5
 * minutes puis régénérée en arrière-plan. C'est le compromis assumé pour cette
 * page — la description de l'activité ne bouge presque jamais, et un planning
 * vieux de quelques minutes reste acceptable pour une page publique, alors que
 * la même donnée est lue sans cache dans l'espace membre où l'on réserve.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const activities = await getActivities();
  return activities.map((a) => ({ slug: a.slug }));
}

/** Metadata par page : chaque fiche a son propre titre et sa description. */
export async function generateMetadata({
  params,
}: PageProps<"/activites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) return { title: "Activité introuvable" };

  return {
    title: activity.name,
    description: activity.description.slice(0, 155),
    alternates: { canonical: `/activites/${activity.slug}` },
    openGraph: {
      title: `${activity.name} · ClubSport`,
      description: activity.description.slice(0, 155),
    },
  };
}

export default async function ActivityPage({
  params,
}: PageProps<"/activites/[slug]">) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  // Un slug inconnu doit rendre un vrai 404, pas une page vide.
  if (!activity) notFound();

  const sessions = await prisma.session.findMany({
    where: {
      activityId: activity.id,
      status: "SCHEDULED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: {
      coach: { select: { firstName: true, lastName: true } },
      _count: {
        select: { bookings: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/activites" className="text-sm text-muted hover:text-foreground">
        ← Toutes les activités
      </Link>

      <div className="mt-4">
        <PageHeader
          title={activity.name}
          description={activity.description}
          action={<Badge tone="accent">{levelLabel[activity.level] ?? activity.level}</Badge>}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Durée", value: `${activity.durationMin} min` },
          { label: "Salle", value: activity.site.name },
          { label: "Ville", value: activity.site.city },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p className="mt-1 font-semibold">{item.value}</p>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Prochaines séances
        </h2>

        {sessions.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Aucune séance programmée pour le moment. Revenez bientôt ou
              consultez les autres disciplines.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => {
              const remaining = session.capacity - session._count.bookings;
              return (
                <li key={session.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium capitalize">
                        {formatDate(session.startsAt)}
                      </p>
                      <p className="text-sm text-muted">
                        {formatTime(session.startsAt)} ·{" "}
                        {session.coach
                          ? `${session.coach.firstName} ${session.coach.lastName}`
                          : "Coach à confirmer"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={remaining > 0 ? "success" : "danger"}>
                        {remaining > 0
                          ? `${remaining} place${remaining > 1 ? "s" : ""}`
                          : "Complet"}
                      </Badge>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card className="mt-10 text-center">
        <p className="font-medium">
          La réservation est réservée aux adhérents du club.
        </p>
        <p className="mt-1 text-sm text-muted">
          Créez votre compte pour réserver votre place en ligne.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <ButtonLink href="/register">Rejoindre le club</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            J&apos;ai déjà un compte
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
