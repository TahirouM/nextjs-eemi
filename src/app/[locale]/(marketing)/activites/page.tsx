import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { getActivities } from "@/lib/queries";
import { Badge } from "@/components/ui";
import { activityImage } from "@/lib/images";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "activities" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/activites` },
  };
}

/**
 * Catalogue public — Server Component.
 *
 * Le contenu vient de la base, pas d'un tableau en dur : ajouter une
 * discipline au seed la fait apparaître ici sans toucher au code.
 *
 * Mise en page : une discipline par ligne, photo à gauche, texte à droite. Le
 * format large plutôt que la grille de la page d'accueil, parce qu'ici le
 * visiteur compare — il lit les descriptions les unes sous les autres, et la
 * ligne pleine largeur lui donne la place de le faire.
 */
export default async function ActivitiesPage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tHome, tLevel, activities] = await Promise.all([
    getTranslations("activities"),
    getTranslations("home"),
    getTranslations("levels"),
    getActivities(),
  ]);

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
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.25rem,5.5vw,3.5rem)] font-bold leading-[1.02] tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty text-ink-soft">
          {t("description")}
        </p>
      </header>

      {Object.entries(byCity).map(([city, list]) => (
        <section key={city} className="mt-16">
          <h2 className="border-b-2 border-ink pb-2 font-display text-sm font-semibold tracking-wide">
            {city}
          </h2>

          <ul>
            {list.map((activity) => (
              <li key={activity.id} className="border-b border-rule">
                <Link
                  href={`/activites/${activity.slug}`}
                  className="group grid gap-5 py-7 transition-colors duration-150 hover:bg-surface-sunk sm:grid-cols-[minmax(0,20rem)_1fr] sm:gap-9"
                >
                  <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-rule">
                    <Image
                      src={activityImage(activity.slug)}
                      alt={tHome("activityImageAlt", { name: activity.name })}
                      fill
                      sizes="(max-width: 640px) 100vw, 20rem"
                      className="object-cover transition-[scale] duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      <h3 className="font-display text-2xl font-semibold group-hover:text-accent">
                        {activity.name}
                      </h3>
                      <Badge>{tLevel(activity.level as "all")}</Badge>
                      <span className="nums font-mono text-sm text-ink-soft">
                        {tHome("minutes", { count: activity.durationMin })}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-prose text-pretty leading-relaxed text-ink-soft">
                      {activity.description}
                    </p>
                    <p className="mt-3 text-sm text-ink-soft">
                      {activity.site.name}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
