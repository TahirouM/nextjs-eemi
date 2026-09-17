import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getActivities, getActivityBySlug } from "@/lib/queries";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";
import { activityImage } from "@/lib/images";

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
}: PageProps<"/[locale]/activites/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const [activity, t] = await Promise.all([
    getActivityBySlug(slug),
    getTranslations({ locale, namespace: "activities" }),
  ]);

  if (!activity) return { title: t("notFound") };

  return {
    title: activity.name,
    description: activity.description.slice(0, 155),
    alternates: { canonical: `/${locale}/activites/${activity.slug}` },
    openGraph: {
      title: `${activity.name} · ClubSport`,
      description: activity.description.slice(0, 155),
      images: [activityImage(activity.slug)],
    },
  };
}

export default async function ActivityPage({
  params,
}: PageProps<"/[locale]/activites/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, tHome, tLevel, activity] = await Promise.all([
    getTranslations("activities"),
    getTranslations("home"),
    getTranslations("levels"),
    getActivityBySlug(slug),
  ]);

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

  const lang = locale as "fr" | "en";

  return (
    <>
      {/*
        Bandeau d'ouverture : la photo occupe toute la largeur, le titre se
        pose dessus. C'est la fiche d'une discipline — le geste sportif doit
        arriver avant le texte qui le décrit.
      */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <Image
            src={activityImage(activity.slug)}
            alt={tHome("activityImageAlt", { name: activity.name })}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center"
          />
          {/* Même voile directionnel que la page d'accueil : vertical en
              colonne unique, horizontal dès que le texte se range à gauche. */}
          <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/90 to-paper/45 lg:bg-gradient-to-r lg:from-paper lg:via-paper/85 lg:to-paper/30" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-paper" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pt-10 pb-16">
          <Link
            href="/activites"
            className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            {t("backToAll")}
          </Link>

          <div className="mt-8 max-w-xl">
            <Badge tone="accent">{tLevel(activity.level as "all")}</Badge>
            <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,3.75rem)] font-bold leading-[1.02] tracking-tight text-balance">
              {activity.name}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-ink-soft">
              {activity.description}
            </p>
          </div>

          {/*
            Les trois repères pratiques sur un filet, comme les statistiques de
            l'accueil : ils qualifient la séance, ils ne sont pas trois objets.
          */}
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-rule-strong pt-6">
            {[
              {
                label: t("duration"),
                value: tHome("minutes", { count: activity.durationMin }),
              },
              { label: t("room"), value: activity.site.name },
              { label: t("city"), value: activity.site.city },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-ink-soft">{item.label}</dt>
                <dd className="mt-1 font-display text-lg font-semibold">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-20">
        <section>
          <h2 className="border-b-2 border-ink pb-2 font-display text-sm font-semibold tracking-wide">
            {t("nextSessions")}
          </h2>

          {sessions.length === 0 ? (
            <p className="py-8 text-ink-soft">{t("noSession")}</p>
          ) : (
            <ul className="rail mt-6 ps-5">
              {sessions.map((session) => {
                const remaining = session.capacity - session._count.bookings;
                return (
                  <li
                    key={session.id}
                    className="relative flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-rule py-4 last:border-0"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -start-5 top-[1.5rem] size-2 -translate-x-[3px] rounded-full bg-rule-strong"
                    />
                    <p className="font-medium capitalize">
                      {formatDate(session.startsAt, lang)}
                    </p>
                    <p className="nums font-mono text-sm text-ink-soft">
                      {formatTime(session.startsAt, lang)}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {session.coach
                        ? `${session.coach.firstName} ${session.coach.lastName}`
                        : t("coachTbc")}
                    </p>
                    <span className="ms-auto">
                      <Badge tone={remaining > 0 ? "go" : "stop"}>
                        {remaining > 0
                          ? t("seats", { count: remaining })
                          : t("full")}
                      </Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Panel className="mt-12">
          <p className="font-display text-lg font-semibold">
            {t("membersOnly")}
          </p>
          <p className="mt-1.5 text-ink-soft">{t("membersOnlyText")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/register" className="px-5 py-2.5">
              {t("join")}
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="px-5 py-2.5">
              {t("haveAccount")}
            </ButtonLink>
          </div>
        </Panel>
      </div>
    </>
  );
}
