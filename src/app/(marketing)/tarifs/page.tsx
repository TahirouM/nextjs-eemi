import type { Metadata } from "next";

import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Deux formules d'adhésion annuelle ClubSport : Standard et Premium, séances illimitées dans les trois salles.",
  alternates: { canonical: "/tarifs" },
};

/**
 * Contenu marketing statique : autorisé explicitement par le brief.
 * Aucune donnée métier ici, donc pas d'accès base — la page est entièrement
 * pré-rendue au build.
 */
const plans = [
  {
    id: "standard",
    name: "Standard",
    price: "39 €",
    period: "/ mois",
    description: "Pour une pratique régulière dans votre salle de référence.",
    features: [
      "Accès aux 3 salles",
      "Réservation en ligne jusqu'à 14 jours à l'avance",
      "4 séances encadrées par semaine",
      "Suivi de présence et historique",
    ],
    highlighted: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "59 €",
    period: "/ mois",
    description: "Pour ceux qui viennent plusieurs fois par semaine.",
    features: [
      "Tout le forfait Standard",
      "Séances encadrées illimitées",
      "Réservation prioritaire 21 jours à l'avance",
      "Invitation d'un proche une fois par mois",
    ],
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="Tarifs"
        description="Adhésion annuelle, sans frais d'inscription. Les deux formules donnent accès aux trois salles."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.highlighted ? "border-accent ring-1 ring-accent" : undefined
            }
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              {plan.highlighted && <Badge tone="accent">Le plus choisi</Badge>}
            </div>

            <p className="mt-3">
              <span className="text-3xl font-semibold">{plan.price}</span>
              <span className="text-sm text-muted">{plan.period}</span>
            </p>
            <p className="mt-2 text-sm text-muted">{plan.description}</p>

            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <ButtonLink
              href="/register"
              variant={plan.highlighted ? "primary" : "secondary"}
              className="mt-6 w-full"
            >
              Choisir {plan.name}
            </ButtonLink>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Projet pédagogique : aucun paiement n&apos;est encaissé. La formule est
        enregistrée sur votre adhésion à l&apos;onboarding.
      </p>
    </div>
  );
}
