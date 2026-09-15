import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { routing } from "@/i18n/routing";
import "../globals.css";

/*
  Une seule famille de texte, Archivo, exploitée sur son axe de LARGEUR
  (`wdth`) : les titres sont réglés en large, le texte courant en normal. Le
  lettrage large rappelle les typographies peintes sur les murs de gymnase et
  les dossards — le titre devient un élément graphique, pas un simple
  porte-texte.

  IBM Plex Mono n'intervient que là où des caractères doivent s'aligner en
  colonne : heures, identifiants de bornes NFC, coordonnées GPS.
*/

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/** Pré-rend les deux langues au build plutôt qu'à la première visite. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Metadata traduite. `alternates.languages` publie les balises `hreflang` :
 * elles indiquent aux moteurs de recherche que /fr et /en sont deux versions
 * de la même page, et non du contenu dupliqué.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("siteTitle"), template: `%s · ClubSport` },
    description: t("siteDescription"),
    authors: [{ name: "ClubSport" }],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: "/fr",
        en: "/en",
        "x-default": "/fr",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      url: `${siteUrl}/${locale}`,
      siteName: "ClubSport",
      title: t("siteTitle"),
      description: t("siteDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: "ClubSport",
      description: t("siteDescription"),
    },
    robots: { index: true, follow: true },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  // Une locale inconnue (/de par exemple) doit rendre un vrai 404.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Indispensable pour que les pages du segment puissent être rendues
  // statiquement : sans cet appel, elles basculeraient en rendu dynamique.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          Fournit les traductions aux Client Components. Les Server Components
          lisent les messages directement, sans passer par ce contexte.
        */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
