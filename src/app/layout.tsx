import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/**
 * Metadata racine. `template` permet à chaque page de ne définir que son propre
 * titre, le suffixe "· ClubSport" étant ajouté automatiquement.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ClubSport — Le club de sport qui vous suit, séance après séance",
    template: "%s · ClubSport",
  },
  description:
    "Réservez vos séances, suivez votre présence et gérez votre adhésion dans les salles ClubSport de Paris et Montreuil.",
  keywords: ["club de sport", "réservation séance", "salle de sport Paris", "yoga", "escalade"],
  authors: [{ name: "ClubSport" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "ClubSport",
    title: "ClubSport — Le club de sport qui vous suit",
    description:
      "Réservez vos séances, suivez votre présence et gérez votre adhésion en quelques secondes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClubSport",
    description: "Réservez vos séances et suivez votre pratique sportive.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
