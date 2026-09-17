import type { Metadata } from "next";
import Image from "next/image";
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
import { HERO_IMAGE, HOW_IMAGE, activityImage, siteImage } from "@/lib/images";

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
 * Parti pris visuel : le héros montre la salle ET le planning réel. La photo
 * dit le lieu — un vrai gymnase, du parquet, de la lumière — le planning posé
 * dessus prouve que le produit contient de vraies séances, à de vraies heures.
 * C'est la superposition des deux qui fait le sujet, pas un slogan sur un
 * dégradé.
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
      {/*
        La photo sort des marges (pleine largeur) tandis que le contenu reste
        dans la colonne de 72rem : c'est ce décalage qui donne l'échelle du
        lieu. `isolate` crée un contexte d'empilement propre, pour que les
        z-index du voile et du contenu ne débordent pas sur l'en-tête collant.
      */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src={HERO_IMAGE}
            alt={t("heroImageAlt")}
            fill
            sizes="100vw"
            // L'image du héros est l'élément LCP : on la charge sans attendre
            // la découverte du DOM. `priority` est déprécié depuis Next 16, ces
            // deux attributs natifs le remplacent.
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[50%_35%]"
          />
          {/*
            Le voile est DIRECTIONNEL, pas uniforme : opaque là où se pose le
            texte, presque transparent là où la salle doit rester visible. Un
            voile plat sur toute la surface protégerait le texte aussi bien,
            mais effacerait la photo — autant ne pas en mettre.

            Sa direction change avec la largeur, parce que la mise en page
            change : en colonne unique (mobile) le texte occupe TOUTE la
            largeur, donc un dégradé horizontal le laisserait sans protection
            à droite — le voile part alors du haut. À partir de `lg`, le texte
            revient à gauche et le planning à droite : le dégradé redevient
            horizontal.
          */}
          <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/90 to-paper/40 lg:bg-gradient-to-r lg:from-paper lg:via-paper/85 lg:to-paper/25" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-20 pb-20 sm:pt-24 sm:pb-24">
          <div className="grid gap-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-20">
            <div className="max-w-xl">
              <p className="font-mono text-sm tracking-wide text-ink-soft">
                {t("heroKicker")}
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.75rem,7.5vw,4.75rem)] font-bold leading-[0.95] tracking-tight text-balance">
                {t("title")}
              </h1>
              <p className="mt-7 max-w-prose text-lg leading-relaxed text-pretty text-ink-soft">
                {t("intro")}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/register" className="px-6 py-3 text-base">
                  {t("join")}
                </ButtonLink>
                <ButtonLink
                  href="/activites"
                  variant="secondary"
                  className="px-6 py-3 text-base"
                >
                  {t("seeDisciplines")}
                </ButtonLink>
              </div>

              {/*
                Les chiffres sont posés sur un filet horizontal plutôt que dans
                trois cartes : ils qualifient le club, ils ne sont pas trois
                objets distincts.
              */}
              <dl className="mt-14 grid grid-cols-3 gap-x-6 border-t border-rule-strong pt-7 sm:flex sm:flex-wrap sm:gap-x-14">
                {[
                  { value: stats.sites, label: t("statRooms") },
                  { value: stats.activities, label: t("statDisciplines") },
                  { value: stats.upcoming, label: t("statSessions") },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="sr-only">{item.label}</dt>
                    <dd>
                      <span className="nums font-display text-[2.75rem] font-bold leading-none">
                        {item.value}
                      </span>
                      <span className="mt-2 block text-sm leading-snug text-ink-soft sm:max-w-[8rem]">
                        {item.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/*
              Le planning : rail vertical d'heures, séances accrochées dessus.
              Reprise directe d'un planning mural de gymnase. Posé en plaque de
              verre, il flotte au-dessus de la photo du gymnase — la salle
              derrière, son planning devant.
            */}
            <div className="glass h-fit rounded-2xl border border-rule p-6 lg:mt-3">
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2.5">
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
        </div>
      </section>

      {/* ---------------------------------------------------- Disciplines --- */}
      <section className="border-y border-rule bg-surface-solid/45 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold tracking-tight">
                {t("disciplinesTitle")}
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                {t("disciplinesIntro")}
              </p>
            </div>
            <Link
              href="/activites"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              {t("allDisciplines")}
            </Link>
          </div>

          {/*
            Grille d'images : une discipline se reconnaît d'abord à son geste
            (grimper, nager, frapper). La photo fait ici le travail qu'une ligne
            de texte ferait mal — et le visiteur qui cherche « du yoga près de
            Bastille » trouve son repère en un coup d'œil.
          */}
          <ul className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <li key={activity.id}>
                <Link
                  href={`/activites/${activity.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-rule">
                    <Image
                      src={activityImage(activity.slug)}
                      alt={t("activityImageAlt", { name: activity.name })}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-[scale] duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <h3 className="font-display text-xl font-semibold group-hover:text-accent">
                      {activity.name}
                    </h3>
                    <Badge>{tLevel(activity.level as "all")}</Badge>
                  </div>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
                    {activity.description}
                  </p>
                  <p className="nums mt-3 border-t border-rule pt-3 font-mono text-sm text-ink-soft">
                    {t("minutes", { count: activity.durationMin })} ·{" "}
                    {activity.site.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------- Fonctionnement --- */}
      {/*
        Deux colonnes : la photo montre le moment d'arrivée à la salle, la
        liste explique le parcours qui y mène. Entre deux sections denses en
        images, trois paragraphes seuls tomberaient à plat — l'image leur rend
        le poids qui manquait.
      */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-rule">
            <Image
              src={HOW_IMAGE}
              alt={t("howImageAlt")}
              fill
              sizes="(max-width: 1024px) 100vw, 22rem"
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {t("howTitle")}
            </h2>

            {/*
              Numérotation justifiée ici : c'est une séquence réelle, chaque
              étape suit la précédente dans le temps.
            */}
            <ol className="mt-10 space-y-9">
              {[
                { n: "1", t: t("step1Title"), d: t("step1Text") },
                { n: "2", t: t("step2Title"), d: t("step2Text") },
                { n: "3", t: t("step3Title"), d: t("step3Text") },
              ].map((step) => (
                <li
                  key={step.n}
                  className="grid grid-cols-[2.5rem_1fr] items-baseline border-t border-rule pt-5"
                >
                  <span className="nums font-display text-2xl font-bold leading-none text-accent">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold">
                      {step.t}
                    </h3>
                    <p className="mt-2 max-w-prose text-pretty leading-relaxed text-ink-soft">
                      {step.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Salles --- */}
      <section className="border-y border-rule bg-surface-solid/45 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {t("whereTitle")}
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
              {t("whereIntro")}
            </p>
          </div>

          <ul className="mt-12 grid gap-x-7 gap-y-10 sm:grid-cols-3">
            {sites.map((site) => (
              <li key={site.id}>
                <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-rule">
                  <Image
                    src={siteImage(site.slug)}
                    alt={t("siteImageAlt", { name: site.name })}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">
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

          <ButtonLink href="/salles" variant="secondary" className="mt-12">
            {t("roomDetails")}
          </ButtonLink>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA --- */}
      <section className="mx-auto max-w-6xl px-4 py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-tight text-balance">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-pretty leading-relaxed text-ink-soft">
            {t("ctaText")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/register" className="px-6 py-3 text-base">
              {t("ctaButton")}
            </ButtonLink>
            <ButtonLink
              href="/tarifs"
              variant="secondary"
              className="px-6 py-3 text-base"
            >
              {t("comparePlans")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
