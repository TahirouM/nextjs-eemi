import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ButtonLink } from "@/components/ui";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/faq` },
  };
}

/**
 * Les sept questions sont numérotées dans les fichiers de messages (`q1`/`a1`
 * … `q7`/`a7`). On génère les clés plutôt que de les répéter : ajouter une
 * question revient à ajouter la paire dans `messages/` et à incrémenter cette
 * constante.
 */
const QUESTION_COUNT = 7;

export default async function FaqPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("faq");

  const faq = Array.from({ length: QUESTION_COUNT }, (_, i) => ({
    q: t(`q${i + 1}` as "q1"),
    a: t(`a${i + 1}` as "a1"),
  }));

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
    <div className="mx-auto max-w-3xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.25rem,5.5vw,3.5rem)] font-bold leading-[1.02] tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty text-ink-soft">
          {t("description")}
        </p>
      </header>

      {/*
        Les questions sont posées sur des filets, sans encadré : une FAQ est
        une liste, pas sept objets distincts. Le trait sous chaque question
        suffit à les séparer, et la page reste calme.
      */}
      <div className="mt-14 border-t border-rule">
        {faq.map((item) => (
          <details key={item.q} className="group border-b border-rule">
            {/* <details> natif : ouverture/fermeture sans une ligne de JS. */}
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 font-display text-lg font-medium transition-colors duration-150 hover:text-accent">
              {item.q}
              <span
                aria-hidden="true"
                className="shrink-0 text-xl leading-none text-ink-soft transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-prose pb-6 text-pretty leading-relaxed text-ink-soft">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-14 border-t-2 border-ink pt-6">
        <p className="font-display text-lg font-semibold">{t("moreTitle")}</p>
        <p className="mt-1.5 text-ink-soft">{t("moreText")}</p>
        <ButtonLink href="/salles" variant="secondary" className="mt-5">
          {t("seeRooms")}
        </ButtonLink>
      </div>
    </div>
  );
}
