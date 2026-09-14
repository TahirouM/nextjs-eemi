import type { Metadata } from "next";

import { getActivities } from "@/lib/queries";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { levelLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Activités",
  description:
    "Yoga, escalade, HIIT, natation, boxe et pilates : découvrez les six disciplines encadrées par les coachs ClubSport.",
  alternates: { canonical: "/activites" },
};

/** Page publique dynamique : le catalogue vient de la base, pas d'un tableau en dur. */
export default async function ActivitiesPage() {
  const activities = await getActivities();

  // Regroupement par ville pour donner une structure lisible à la page.
  const byCity = activities.reduce<Record<string, typeof activities>>(
    (acc, activity) => {
      const city = activity.site.city;
      (acc[city] ??= []).push(activity);
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader
        title="Nos activités"
        description="Six disciplines encadrées, réparties sur nos trois salles. Chaque séance est animée par un coach du club, en petit groupe."
      />

      {Object.entries(byCity).map(([city, list]) => (
        <section key={city} className="mb-12">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">{city}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((activity) => (
              <Card key={activity.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{activity.name}</h3>
                  <Badge>{levelLabel[activity.level] ?? activity.level}</Badge>
                </div>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {activity.description}
                </p>
                <p className="mt-4 text-xs text-muted">
                  {activity.site.name} · {activity.durationMin} min
                </p>
                <ButtonLink
                  href={`/activites/${activity.slug}`}
                  variant="secondary"
                  className="mt-4"
                >
                  Détail et horaires
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
