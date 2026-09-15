import type { Metadata } from "next";
import Link from "next/link";

import { getActivities } from "@/lib/queries";
import { Badge, PageHeader } from "@/components/ui";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Disciplines",
  description:
    "Yoga, escalade, HIIT, natation, boxe et pilates : les six disciplines encadrées par les coachs ClubSport.",
  alternates: { canonical: "/activites" },
};

/** Page publique dynamique : le catalogue vient de la base, pas d'un tableau en dur. */
export default async function ActivitiesPage() {
  const t = await getTranslations("activities");
  const tLevel = await getTranslations("levels");
  const activities = await getActivities();

  // Regroupement par ville : c'est la première question que se pose un
  // visiteur (« qu'est-ce qu'il y a près de chez moi ? »).
  const byCity = activities.reduce<Record<string, typeof activities>>(
    (acc, activity) => {
      (acc[activity.site.city] ??= []).push(activity);
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {Object.entries(byCity).map(([city, list]) => (
        <section key={city} className="mb-12">
          <h2 className="border-b-2 border-ink pb-1.5 font-display text-sm font-semibold tracking-wide">
            {city}
          </h2>

          <ul>
            {list.map((activity) => (
              <li key={activity.id} className="border-b border-rule">
                <Link
                  href={`/activites/${activity.slug}`}
                  className="group block py-5 transition-colors duration-150 hover:bg-surface-sunk"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <h3 className="font-display text-xl font-semibold group-hover:text-accent">
                      {activity.name}
                    </h3>
                    <Badge>
                      {tLevel(activity.level as "all")}
                    </Badge>
                    <span className="nums ms-auto font-mono text-sm text-ink-soft">
                      {activity.durationMin} min
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-prose text-pretty text-sm leading-relaxed text-ink-soft">
                    {activity.description}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {activity.site.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
