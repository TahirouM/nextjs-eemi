import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getSites } from "@/lib/queries";
import { Panel } from "@/components/ui";
import { siteImage } from "@/lib/images";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/salles` },
  };
}

export default async function SitesPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tHome, sites] = await Promise.all([
    getTranslations("rooms"),
    getTranslations("home"),
    getSites(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.25rem,5.5vw,3.5rem)] font-bold leading-[1.02] tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty text-ink-soft">
          {t("description")}
        </p>
      </header>

      {/*
        Une salle par ligne, en alternance photo/texte. Les trois salles ne se
        comparent pas sur une caractéristique chiffrée — on choisit la sienne
        parce qu'elle est près de chez soi et qu'on a vu à quoi elle ressemble.
        D'où la grande image et l'adresse mise en avant.
      */}
      <div className="mt-16 space-y-20">
        {sites.map((site, index) => (
          <section
            key={site.id}
            className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
          >
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-rule ${
                // La photo passe à droite une ligne sur deux : le regard
                // zigzague au lieu de descendre une colonne d'images.
                index % 2 === 1 ? "md:order-2" : ""
              }`}
            >
              <Image
                src={siteImage(site.slug)}
                alt={tHome("siteImageAlt", { name: site.name })}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {site.name}
              </h2>
              <address className="mt-3 text-lg not-italic leading-relaxed text-ink-soft">
                {site.address}
                <br />
                {site.postalCode} {site.city}
              </address>

              <dl className="mt-6 border-t border-rule pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{t("gps")}</dt>
                  <dd className="nums font-mono text-xs">
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </dd>
                </div>
                <div className="mt-2.5 flex justify-between gap-4">
                  <dt className="text-ink-soft">{t("nfcTerminal")}</dt>
                  <dd className="font-mono text-xs">
                    {site.nfcTagId ?? t("toInstall")}
                  </dd>
                </div>
              </dl>

              <a
                href={`https://www.openstreetmap.org/?mlat=${site.latitude}&mlon=${site.longitude}#map=17/${site.latitude}/${site.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {t("openMap")}
              </a>
            </div>
          </section>
        ))}
      </div>

      {/*
        Ce bloc explicite la continuité mobile demandée par le brief : les
        coordonnées et les identifiants de borne ci-dessus ne sont pas
        décoratifs, ce sont les données que l'application React Native
        consommera.
      */}
      <Panel className="mt-20">
        <h2 className="font-display text-lg font-semibold">
          {t("mobileTitle")}
        </h2>
        <p className="mt-2 text-ink-soft">{t("mobileIntro")}</p>
        <ul className="mt-5 space-y-4">
          <li>
            <strong>NFC</strong> — <span className="text-ink-soft">{t("mobileNfc")}</span>
          </li>
          <li>
            <strong>{t("geoLabel")}</strong> —{" "}
            <span className="text-ink-soft">{t("mobileGeo")}</span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
