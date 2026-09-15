import type { Metadata } from "next";

import { ButtonLink, Panel, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Adhésion, réservation, annulation, présence : les réponses aux questions les plus posées sur ClubSport.",
  alternates: { canonical: "/faq" },
};

const faq = [
  {
    q: "Comment réserver une séance ?",
    a: "Une fois votre compte créé et votre onboarding terminé, rendez-vous dans « Réserver ». Filtrez par salle ou par discipline, puis cliquez sur la séance qui vous intéresse. Les places restantes sont affichées en temps réel.",
  },
  {
    q: "Jusqu'à quand puis-je annuler ?",
    a: "Vous pouvez annuler librement tant que la séance n'a pas commencé. Passé l'heure de début, l'annulation n'est plus possible et la séance apparaît dans votre historique.",
  },
  {
    q: "Que se passe-t-il si une séance est complète ?",
    a: "Le bouton de réservation est désactivé et la séance est marquée « Complet ». Il n'y a pas encore de liste d'attente : c'est une limite connue de cette version.",
  },
  {
    q: "Comment ma présence est-elle enregistrée ?",
    a: "Le coach valide la présence des inscrits depuis son espace, au début de la séance. Votre historique et vos statistiques se mettent à jour immédiatement.",
  },
  {
    q: "Puis-je changer de salle ?",
    a: "Oui. Votre salle par défaut est choisie à l'onboarding, mais votre adhésion donne accès aux trois salles. Vous pouvez modifier votre salle de référence à tout moment dans vos réglages.",
  },
  {
    q: "Mon adhésion peut-elle être suspendue ?",
    a: "Une adhésion peut être suspendue par l'administration du club. Tant qu'elle n'est pas active, la réservation de nouvelles séances est bloquée — vos réservations existantes restent visibles.",
  },
  {
    q: "Une application mobile est-elle prévue ?",
    a: "Oui. Une application React Native est prévue, avec le pointage de présence par NFC à l'entrée de la salle et le classement des séances par distance réelle grâce à la géolocalisation.",
  },
];

export default function FaqPage() {
  /*
    JSON-LD : décrit la FAQ dans un format que les moteurs de recherche
    comprennent, ce qui permet l'affichage enrichi dans les résultats.
    Le contenu est constant et écrit par nous, pas saisi par un utilisateur.
  */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        title="Questions fréquentes"
        description="Tout ce qu'il faut savoir avant de rejoindre le club."
      />

      <div className="space-y-3">
        {faq.map((item) => (
          <Panel key={item.q} className="p-0">
            {/* <details> natif : ouverture/fermeture sans une ligne de JS. */}
            <details className="group">
              <summary className="cursor-pointer list-none p-5 font-medium">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-ink-soft transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm text-ink-soft">{item.a}</p>
            </details>
          </Panel>
        ))}
      </div>

      <Panel className="mt-10 text-center">
        <p className="font-medium">Une autre question ?</p>
        <p className="mt-1 text-sm text-ink-soft">
          L&apos;équipe du club répond sur place, dans les trois salles.
        </p>
        <ButtonLink href="/salles" variant="secondary" className="mt-4">
          Voir les salles
        </ButtonLink>
      </Panel>
    </div>
  );
}
