import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import {
  getActivities,
  getPublicStats,
  getSites,
  getUpcomingSessions,
} from "@/lib/queries";
import { Badge, ButtonLink } from "@/components/ui";
import { formatTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("siteTitle"),
    description: t("siteDescription"),
    // `languages` doit être redéclaré ici : les `alternates` d'une page
    // REMPLACENT ceux du layout, ils ne fusionnent pas. Sans cela, la page
    // perdrait ses balises hreflang.
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: "/fr", en: "/en", "x-default": "/fr" },
    },
  };
}

/**
 * Accueil — Server Component.
 *
 * Justification du rendu serveur (choix n°1 exigé par le brief) : page
 * publique, indexable, au contenu identique pour tous les visiteurs. Le HTML
 * complet part du serveur, donc contenu lisible par les moteurs de recherche
 * et zéro JavaScript de rendu côté client.
 *
 * Parti pris visuel : le héros n'est pas un slogan sur fond dégradé mais le
 * PLANNING RÉEL des prochaines séances — l'objet le plus caractéristique d'un
 * club de sport, et la preuve immédiate que le produit contient de vraies
 * données.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tLevel, stats, activities, sites, planning] = await Promise.all([
    getTranslations("home"),
    getTranslations("levels"),
    getPublicStats(),
    getActivities(),
    getSites(),
    getUpcomingSessions({ perPage: 6 }),
  ]);

  return (
    <>
      {/* ---------------------------------------------------------- Héros --- */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(2.5rem,7vw,4.25rem)] font-bold leading-[0.95] tracking-tight text-balance">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-pretty text-ink-soft">
              {t("intro")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/register" className="px-5 py-2.5">
                {t("join")}
              </ButtonLink>
              <ButtonLink
                href="/activites"
                variant="secondary"
                className="px-5 py-2.5"
              >
                {t("seeDisciplines")}
              </ButtonLink>
            </div>

            {/*
              Les chiffres sont posés sur un filet horizontal plutôt que dans
              trois cartes : ils qualifient le club, ils ne sont pas trois
              objets distincts.
            */}
            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-rule pt-6">
              {[
                { value: stats.sites, label: t("statRooms") },
                { value: stats.activities, label: t("statDisciplines") },
                { value: stats.upcoming, label: t("statSessions") },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="sr-only">{item.label}</dt>
                  <dd>
                    <span className="nums font-display text-4xl font-bold leading-none">
                      {item.value}
                    </span>
                    <span className="mt-1.5 block max-w-[8rem] text-sm leading-snug text-ink-soft">
                      {item.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/*
            Le planning : rail vertical d'heures, séances accrochées dessus.
            Reprise directe d'un planning mural de gymnase.
          */}
          {/* Plaque de verre : le planning est l'élément principal du héros,
              il mérite d'être posé en avant du fond plutôt que fondu dedans. */}
          <div className="glass rounded-xl border border-rule p-5 lg:mt-2">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="font-display text-sm font-semibold tracking-wide">
                {t("nextSessions")}
              </h2>
              <Link
                href="/activites"
                className="text-sm text-accent underline-offset-4 hover:underline"
              >
                {t("seeAll")}
              </Link>
            </div>

            {planning.sessions.length === 0 ? (
              <p className="py-8 text-sm text-ink-soft">{t("noSession")}</p>
            ) : (
              <ol className="rail ps-5">
                {planning.sessions.map((session) => {
                  const left = session.capacity - session._count.bookings;
                  return (
                    <li
                      key={session.id}
                      className="relative border-b border-rule py-3.5 last:border-0"
                    >
                      {/* Le point qui accroche la séance au rail d'heures. */}
                      <span
                        aria-hidden="true"
                        className="absolute -start-5 top-[1.35rem] size-2 -translate-x-[3px] rounded-full bg-rule-strong"
                      />
                      <div className="flex items-baseline gap-3">
                        <time
                          dateTime={session.startsAt.toISOString()}
                          className="nums font-mono text-sm text-ink-soft"
                        >
                          {formatTime(session.startsAt, locale as "fr" | "en")}
                        </time>
                        <p className="min-w-0 flex-1 truncate font-medium">
                          {session.activity.name}
                        </p>
                        <span
                          className={`nums shrink-0 text-sm ${
                            left > 0 ? "text-ink-soft" : "font-medium text-stop"
                          }`}
                        >
                          {left > 0 ? t("seats", { count: left }) : t("full")}
                        </span>
                      </div>
                      <p className="mt-0.5 ps-[3.25rem] text-sm text-ink-soft">
                        {session.site.name}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Disciplines --- */}
      <section className="border-y border-rule bg-surface-solid/45 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {t("disciplinesTitle")}
            </h2>
            <Link
              href="/activites"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              {t("allDisciplines")}
            </Link>
          </div>

          {/*
            Liste en filets plutôt qu'en grille de cartes : chaque discipline
            est une ligne d'un répertoire, pas un produit à vendre.
          */}
          <ul className="mt-8 border-t border-rule">
            {activities.map((activity) => (
              <li key={activity.id} className="border-b border-rule">
                <Link
                  href={`/activites/${activity.slug}`}
                  className="group flex flex-wrap items-baseline gap-x-5 gap-y-1 py-5 transition-colors duration-150 hover:bg-surface-sunk"
                >
                  <h3 className="font-display text-lg font-semibold group-hover:text-accent">
                    {activity.name}
                  </h3>
                  <Badge>{tLevel(activity.level as "all")}</Badge>
                  <p className="min-w-0 flex-1 basis-full text-pretty text-sm text-ink-soft sm:basis-0">
                    {activity.description}
                  </p>
                  <span className="nums shrink-0 font-mono text-sm text-ink-soft">
                    {t("minutes", { count: activity.durationMin })} ·{" "}
                    {activity.site.city}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------- Fonctionnement --- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {t("howTitle")}
        </h2>

        {/*
          Numérotation justifiée ici : c'est une séquence réelle, chaque étape
          suit la précédente dans le temps.
        */}
        <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {[
            { n: "1", t: t("step1Title"), d: t("step1Text") },
            { n: "2", t: t("step2Title"), d: t("step2Text") },
            { n: "3", t: t("step3Title"), d: t("step3Text") },
          ].map((step) => (
            <li key={step.n} className="border-t-2 border-ink pt-4">
              <span className="nums font-display text-sm font-bold text-accent">
                {step.n}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold">
                {step.t}
              </h3>
              <p className="mt-1.5 text-pretty text-sm leading-relaxed text-ink-soft">
                {step.d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------- Salles --- */}
      <section className="border-y border-rule bg-surface-solid/45 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {t("whereTitle")}
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
            {sites.map((site) => (
              <li key={site.id} className="border-t border-rule pt-4">
                <h3 className="font-display text-lg font-semibold">
                  {site.name}
                </h3>
                <address className="mt-1.5 text-sm not-italic leading-relaxed text-ink-soft">
                  {site.address}
                  <br />
                  {site.postalCode} {site.city}
                </address>
              </li>
            ))}
          </ul>
          <ButtonLink href="/salles" variant="secondary" className="mt-8">
            {t("roomDetails")}
          </ButtonLink>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA --- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 text-pretty text-ink-soft">{t("ctaText")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/register" className="px-5 py-2.5">
              {t("ctaButton")}
            </ButtonLink>
            <ButtonLink href="/tarifs" variant="secondary" className="px-5 py-2.5">
              {t("comparePlans")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
