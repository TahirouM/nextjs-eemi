import type { Metadata } from "next";
import Link from "next/link";

import {
  getActivities,
  getPublicStats,
  getSites,
  getUpcomingSessions,
} from "@/lib/queries";
import { Badge, ButtonLink } from "@/components/ui";
import { formatTime, levelLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Le planning du club, en ligne",
  description:
    "Trois salles à Paris et Montreuil, six disciplines encadrées. Consultez le planning, réservez votre place, suivez votre présence.",
  alternates: { canonical: "/" },
};

/**
 * Accueil — Server Component.
 *
 * Justification du rendu serveur (choix n°1 exigé par le brief) : page
 * publique, indexable, au contenu identique pour tous les visiteurs. Le HTML
 * complet part du serveur, donc contenu lisible par les moteurs de recherche
 * et zéro JavaScript de rendu côté client.
 *
 * Parti pris visuel : le héros n'est pas un slogan sur fond dégradé mais le
 * PLANNING RÉEL des prochaines séances. C'est l'objet le plus caractéristique
 * d'un club de sport, et c'est aussi la preuve immédiate que le produit
 * contient de vraies données.
 */
export default async function HomePage() {
  const [stats, activities, sites, planning] = await Promise.all([
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
              Le planning du club, en ligne.
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-pretty text-ink-soft">
              Trois salles, six disciplines, des séances encadrées en petit
              groupe. Vous voyez les places restantes en direct, vous réservez,
              vous venez. Le coach valide votre présence sur place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/register" className="px-5 py-2.5">
                Rejoindre le club
              </ButtonLink>
              <ButtonLink
                href="/activites"
                variant="secondary"
                className="px-5 py-2.5"
              >
                Voir les disciplines
              </ButtonLink>
            </div>

            {/*
              Les chiffres sont posés sur un filet horizontal plutôt que dans
              trois cartes : ils qualifient le club, ils ne sont pas trois
              objets distincts.
            */}
            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-rule pt-6">
              {[
                { value: stats.sites, label: "salles en Île-de-France" },
                { value: stats.activities, label: "disciplines encadrées" },
                { value: stats.upcoming, label: "séances à venir" },
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
            C'est la reprise directe d'un planning mural de gymnase.
          */}
          <div className="lg:pt-2">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="font-display text-sm font-semibold tracking-wide">
                Prochaines séances
              </h2>
              <Link
                href="/activites"
                className="text-sm text-accent underline-offset-4 hover:underline"
              >
                Tout voir
              </Link>
            </div>

            {planning.sessions.length === 0 ? (
              <p className="py-8 text-sm text-ink-soft">
                Aucune séance programmée pour le moment.
              </p>
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
                          {formatTime(session.startsAt)}
                        </time>
                        <p className="min-w-0 flex-1 truncate font-medium">
                          {session.activity.name}
                        </p>
                        <span
                          className={`nums shrink-0 text-sm ${
                            left > 0 ? "text-ink-soft" : "font-medium text-stop"
                          }`}
                        >
                          {left > 0 ? `${left} pl.` : "complet"}
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
      <section className="border-t border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Six disciplines, trois salles
            </h2>
            <Link
              href="/activites"
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              Toutes les disciplines
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
                  <Badge>{levelLabel[activity.level] ?? activity.level}</Badge>
                  <p className="min-w-0 flex-1 basis-full text-pretty text-sm text-ink-soft sm:basis-0">
                    {activity.description}
                  </p>
                  <span className="nums shrink-0 font-mono text-sm text-ink-soft">
                    {activity.durationMin} min · {activity.site.city}
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
          Comment ça se passe
        </h2>

        {/*
          Numérotation justifiée ici : c'est une séquence réelle, chaque étape
          suit la précédente dans le temps.
        */}
        <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Vous créez votre compte",
              d: "Quelques questions pour choisir votre salle de référence et votre formule d’adhésion.",
            },
            {
              n: "2",
              t: "Vous réservez une séance",
              d: "Filtrez par salle ou par discipline. Les places restantes sont à jour à chaque chargement.",
            },
            {
              n: "3",
              t: "Vous venez vous entraîner",
              d: "Le coach valide votre présence. Votre historique se construit tout seul, séance après séance.",
            },
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
      <section className="border-t border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Où nous trouver
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
            Détail des salles
          </ButtonLink>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA --- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance">
            Adhésion annuelle, accès aux trois salles.
          </h2>
          <p className="mt-3 text-pretty text-ink-soft">
            Deux formules, sans frais d’inscription. Vous choisissez la vôtre au
            moment de créer votre compte.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/register" className="px-5 py-2.5">
              Créer mon compte
            </ButtonLink>
            <ButtonLink href="/tarifs" variant="secondary" className="px-5 py-2.5">
              Comparer les formules
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
