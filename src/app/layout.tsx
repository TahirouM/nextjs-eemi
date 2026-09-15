import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
  Une seule famille de texte, Archivo, mais exploitée sur son axe de LARGEUR
  (`wdth`) : les titres sont réglés en large, le texte courant en normal.
  Le lettrage large rappelle les typographies peintes sur les murs de gymnase
  et les dossards — le titre devient un élément graphique, pas un simple
  porte-texte. Un seul dessin évite le mélange de deux voix étrangères tout en
  gardant un contraste net entre les deux rôles.

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

/**
 * Metadata racine. `template` permet à chaque page de ne définir que son propre
 * titre, le suffixe "· ClubSport" étant ajouté automatiquement.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ClubSport — Le planning du club, en ligne",
    template: "%s · ClubSport",
  },
  description:
    "Réservez votre place, suivez votre présence et gérez votre adhésion dans les trois salles ClubSport de Paris et Montreuil.",
  keywords: [
    "club de sport",
    "réservation séance",
    "salle de sport Paris",
    "yoga",
    "escalade",
  ],
  authors: [{ name: "ClubSport" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "ClubSport",
    title: "ClubSport — Le planning du club, en ligne",
    description:
      "Réservez votre place, suivez votre présence, gérez votre adhésion.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClubSport",
    description: "Réservez vos séances et suivez votre pratique sportive.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

/**
 * Colore la barre du navigateur mobile. Deux valeurs pour qu'elle s'accorde au
 * fond réel de la page dans chacun des deux thèmes.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
