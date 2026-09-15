import type { Metadata } from "next";

import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Deux formules d'adhésion annuelle ClubSport : Standard et Premium, accès aux trois salles.",
  alternates: { canonical: "/tarifs" },
};

/**
 * Contenu marketing statique : autorisé explicitement par le brief. Aucune
 * donnée métier ici, donc pas d'accès base — la page est entièrement
 * pré-rendue au build.
 *
 * Présentation en tableau de comparaison plutôt qu'en deux cartes côte à côte :
 * quand il n'y a que deux formules, ce que le visiteur veut voir, c'est la
 * DIFFÉRENCE ligne à ligne.
 */
const PLANS = [
  { id: "standard", name: "Standard", price: "39 €" },
  { id: "premium", name: "Premium", price: "59 €" },
] as const;

const ROWS: Array<{
  label: string;
  standard: boolean | string;
  premium: boolean | string;
}> = [
  { label: "Accès aux trois salles", standard: true, premium: true },
  { label: "Réservation en ligne", standard: true, premium: true },
  { label: "Suivi de présence et historique", standard: true, premium: true },
  { label: "Séances encadrées par semaine", standard: "4", premium: "illimité" },
  { label: "Réservation à l’avance", standard: "14 jours", premium: "21 jours" },
  { label: "Invitation d’un proche", standard: false, premium: "1 par mois" },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <>
        <span aria-hidden="true" className="text-accent">
          ✓
        </span>
        <span className="sr-only">Inclus</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="text-ink-soft">
          —
        </span>
        <span className="sr-only">Non inclus</span>
      </>
    );
  }
  return <span className="nums">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageHeader
        title="Deux formules"
        description="Adhésion annuelle, sans frais d’inscription. Les deux donnent accès aux trois salles."
      />

      {/*
        Deux présentations du MÊME contenu selon la largeur :

        - sous 640 px, une liste par formule. Un tableau de comparaison à deux
          colonnes ne tient pas sur un téléphone : le réduire obligerait à le
          faire défiler latéralement, et la seconde colonne resterait invisible
          — donc inutilisable.
        - à partir de 640 px, le tableau de comparaison, qui est la bonne forme
          dès qu'on peut voir les deux colonnes côte à côte.

        Le contenu vient d'une seule source (`ROWS`, `PLANS`) : les deux vues ne
        peuvent pas diverger.
      */}
      <div className="space-y-8 sm:hidden">
        {PLANS.map((plan) => (
          <section key={plan.id}>
            <h2 className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
              <span className="font-display text-xl font-bold">{plan.name}</span>
              <span className="nums text-ink-soft">{plan.price} / mois</span>
            </h2>
            <dl>
              {ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-3"
                >
                  <dt className="text-sm">{row.label}</dt>
                  <dd className="shrink-0 text-sm font-medium">
                    <Cell value={row[plan.id]} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <table className="hidden w-full border-collapse text-sm sm:table">
        <caption className="sr-only">
          Comparaison des formules Standard et Premium
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-4 text-start font-normal text-ink-soft">
              Ce qui est inclus
            </th>
            {PLANS.map((plan) => (
              <th key={plan.id} scope="col" className="w-36 py-4 text-start">
                <span className="font-display text-xl font-bold">
                  {plan.name}
                </span>
                <span className="nums mt-0.5 block font-normal text-ink-soft">
                  {plan.price} / mois
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b border-rule">
              <th scope="row" className="py-3.5 pe-4 text-start font-normal">
                {row.label}
              </th>
              {PLANS.map((plan) => (
                <td key={plan.id} className="py-3.5">
                  <Cell value={row[plan.id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href="/register" className="px-5 py-2.5">
          Créer mon compte
        </ButtonLink>
        <p className="text-sm text-ink-soft">
          Vous choisissez votre formule au moment de l’inscription.
        </p>
      </div>

      <p className="mt-10 border-t border-rule pt-5 text-sm text-ink-soft">
        Projet pédagogique : aucun paiement n’est encaissé. La formule est
        simplement enregistrée sur votre adhésion.
      </p>
    </div>
  );
}
