import type { Metadata } from "next";
import Link from "next/link";

import { getActivities, getPublicStats, getSites } from "@/lib/queries";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { levelLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Le club de sport qui vous suit, séance après séance",
  description:
    "3 salles à Paris et Montreuil, 6 disciplines encadrées, réservation en ligne et suivi de présence. Rejoignez ClubSport.",
  alternates: { canonical: "/" },
};

/**
 * Home — Server Component.
 *
 * Justification du rendu serveur (choix n°1 exigé par le brief) : cette page
 * est publique, indexable, et son contenu est identique pour tous les
 * visiteurs. Les données viennent de `unstable_cache` : le HTML complet part
 * du serveur, ce qui donne un contenu directement lisible par les moteurs de
 * recherche et zéro JavaScript de rendu côté client.
 */
export default async function HomePage() {
  const [stats, activities, sites] = await Promise.all([
    getPublicStats(),
    getActivities(),
    getSites(),
  ]);

  const featured = activities.slice(0, 3);

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge tone="accent">3 salles · Paris &amp; Montreuil</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Le club de sport qui vous suit,{" "}
              <span className="text-accent">séance après séance</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Réservez votre place en deux clics, retrouvez votre planning et
              suivez votre assiduité réelle. Pas de liste d&apos;attente à
              l&apos;accueil, pas de carton de présence perdu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/register" className="px-6 py-3">
                Rejoindre le club
              </ButtonLink>
              <ButtonLink href="/activites" variant="secondary" className="px-6 py-3">
                Voir les activités
              </ButtonLink>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { label: "Salles", value: stats.sites },
                { label: "Disciplines", value: stats.activities },
                { label: "Séances à venir", value: stats.upcoming },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Aperçu du produit : montre l'interface réelle plutôt qu'une image. */}
          <Card className="lg:ml-auto lg:max-w-md">
            <p className="text-xs uppercase tracking-wide text-muted">
              Votre prochaine séance
            </p>
            <p className="mt-2 text-xl font-semibold">Yoga Vinyasa</p>
            <p className="text-sm text-muted">
              Demain · 09:00 · ClubSport Bastille
            </p>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              {[
                "Réservation instantanée, annulation jusqu'au début",
                "Présence pointée par le coach sur place",
                "Historique complet de vos séances",
              ].map((line) => (
                <p key={line} className="flex gap-2 text-muted">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  {line}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Nos disciplines
            </h2>
            <p className="mt-1 text-muted">
              Encadrées par des coachs du club, en petit groupe.
            </p>
          </div>
          <Link href="/activites" className="text-sm font-medium text-accent">
            Toutes les activités →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((activity) => (
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
                En savoir plus
              </ButtonLink>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Comment ça marche
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Créez votre compte",
                text: "Inscription en une minute, puis quelques questions pour choisir votre salle et votre formule.",
              },
              {
                step: "02",
                title: "Réservez vos séances",
                text: "Filtrez par salle et par discipline, voyez les places restantes en temps réel et réservez.",
              },
              {
                step: "03",
                title: "Venez vous entraîner",
                text: "Le coach valide votre présence sur place. Votre historique se construit tout seul.",
              },
            ].map((item) => (
              <li key={item.step}>
                <span className="font-mono text-sm text-accent">{item.step}</span>
                <h3 className="mt-2 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Nos salles</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id}>
              <h3 className="font-semibold">{site.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {site.address}
                <br />
                {site.postalCode} {site.city}
              </p>
              <Link
                href="/salles"
                className="mt-4 inline-block text-sm font-medium text-accent"
              >
                Voir la salle →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-accent-soft">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Prêt à reprendre le sport sérieusement ?
          </h2>
          <p className="mt-2 text-muted">
            Adhésion annuelle, séances illimitées dans les trois salles.
          </p>
          <ButtonLink href="/register" className="mt-6 px-6 py-3">
            Créer mon compte
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
