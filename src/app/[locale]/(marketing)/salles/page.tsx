import type { Metadata } from "next";

import { getSites } from "@/lib/queries";
import { Panel, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Nos salles",
  description:
    "ClubSport Bastille, Nation et Montreuil : adresses, accès et équipements de nos trois salles en Île-de-France.",
  alternates: { canonical: "/salles" },
};

export default async function SitesPage() {
  const sites = await getSites();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="Nos salles"
        description="Trois salles en Île-de-France, accessibles avec la même adhésion. Choisissez votre salle par défaut à l'inscription, vous pourrez en changer à tout moment."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sites.map((site) => (
          <Panel key={site.id}>
            <h2 className="font-semibold">{site.name}</h2>
            <address className="mt-2 text-sm not-italic text-ink-soft">
              {site.address}
              <br />
              {site.postalCode} {site.city}
            </address>

            <dl className="mt-4 border-t border-rule pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Coordonnées GPS</dt>
                <dd className="font-mono text-xs">
                  {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <dt className="text-ink-soft">Borne d&apos;accès</dt>
                <dd className="font-mono text-xs">
                  {site.nfcTagId ?? "à installer"}
                </dd>
              </div>
            </dl>

            <a
              href={`https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=17/${site.latitude}/${site.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-accent"
            >
              Ouvrir dans une carte →
            </a>
          </Panel>
        ))}
      </div>

      {/*
        Ce bloc explicite la continuité mobile demandée par le brief : les
        coordonnées et les identifiants de borne ci-dessus ne sont pas
        décoratifs, ce sont les données que l'application React Native
        consommera.
      */}
      <Panel className="mt-10">
        <h2 className="font-semibold">Bientôt sur mobile</h2>
        <p className="mt-2 text-sm text-ink-soft">
          L&apos;application ClubSport pour iOS et Android exploitera deux
          capacités que le web ne peut pas offrir :
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <strong>NFC</strong> — chaque salle dispose d&apos;une borne à
            l&apos;entrée (identifiant ci-dessus). Approcher son téléphone
            pointera la présence en une seconde, sans passer par l&apos;accueil.
            Le champ qui trace la provenance du pointage existe déjà en base.
          </li>
          <li>
            <strong>Géolocalisation</strong> — les séances seront triées par
            distance réelle depuis la position du téléphone, pour proposer
            d&apos;abord la salle où l&apos;on se trouve. Les coordonnées de
            chaque salle sont déjà stockées et utilisées pour ce calcul.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
