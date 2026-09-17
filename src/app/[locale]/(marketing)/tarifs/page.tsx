import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ButtonLink } from "@/components/ui";
import { PRICING_IMAGE } from "@/lib/images";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/tarifs` },
  };
}

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

function Cell({ value, yes, no }: { value: boolean | string; yes: string; no: string }) {
  if (value === true) {
    return (
      <>
        <span aria-hidden="true" className="text-accent">
          ✓
        </span>
        <span className="sr-only">{yes}</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="text-ink-soft">
          —
        </span>
        <span className="sr-only">{no}</span>
      </>
    );
  }
  return <span className="nums">{value}</span>;
}

export default async function PricingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("pricing");

  const ROWS: Array<{
    label: string;
    standard: boolean | string;
    premium: boolean | string;
  }> = [
    { label: t("rowAccess"), standard: true, premium: true },
    { label: t("rowBooking"), standard: true, premium: true },
    { label: t("rowHistory"), standard: true, premium: true },
    { label: t("rowWeekly"), standard: "4", premium: t("unlimited") },
    {
      label: t("rowAdvance"),
      standard: t("days", { count: 14 }),
      premium: t("days", { count: 21 }),
    },
    { label: t("rowGuest"), standard: false, premium: t("oncePerMonth") },
  ];

  return (
    <>
      {/*
        Bandeau : une salle en activité. La page parle d'argent — montrer ce
        qu'on achète (l'accès aux salles) vaut mieux qu'un en-tête nu.
      */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <Image
            src={PRICING_IMAGE}
            alt={t("heroImageAlt")}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/90 to-paper/45 lg:bg-gradient-to-r lg:from-paper lg:via-paper/85 lg:to-paper/30" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-paper" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pt-16 pb-14">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(2.25rem,6vw,3.75rem)] font-bold leading-[1.02] tracking-tight text-balance">
              {t("title")}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-pretty text-ink-soft">
              {t("description")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-20">
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
        <div className="space-y-10 sm:hidden">
          {PLANS.map((plan) => (
            <section key={plan.id}>
              <h2 className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
                <span className="font-display text-2xl font-bold">
                  {plan.name}
                </span>
                <span className="nums text-ink-soft">
                  {plan.price} {t("perMonth")}
                </span>
              </h2>
              <dl>
                {ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-b border-rule py-3.5"
                  >
                    <dt className="text-sm">{row.label}</dt>
                    <dd className="shrink-0 text-sm font-medium">
                      <Cell value={row[plan.id]} yes={t("yes")} no={t("no")} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <table className="hidden w-full border-collapse text-sm sm:table">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th
                scope="col"
                className="py-5 text-start font-normal text-ink-soft"
              >
                {t("included")}
              </th>
              {PLANS.map((plan) => (
                <th key={plan.id} scope="col" className="w-40 py-5 text-start">
                  <span className="font-display text-2xl font-bold">
                    {plan.name}
                  </span>
                  <span className="nums mt-1 block font-normal text-ink-soft">
                    {plan.price} {t("perMonth")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b border-rule">
                <th scope="row" className="py-4 pe-4 text-start font-normal">
                  {row.label}
                </th>
                {PLANS.map((plan) => (
                  <td key={plan.id} className="py-4">
                    <Cell value={row[plan.id]} yes={t("yes")} no={t("no")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <ButtonLink href="/register" className="px-6 py-3 text-base">
            {t("createAccount")}
          </ButtonLink>
          <p className="text-sm text-ink-soft">{t("chooseAtSignup")}</p>
        </div>

        <p className="mt-12 border-t border-rule pt-6 text-sm text-ink-soft">
          {t("disclaimer")}
        </p>
      </div>
    </>
  );
}
