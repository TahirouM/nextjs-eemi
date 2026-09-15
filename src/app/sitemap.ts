import type { MetadataRoute } from "next";

import { getActivities } from "@/lib/queries";
import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/**
 * Sitemap généré depuis la base, DANS LES DEUX LANGUES.
 *
 * Chaque URL déclare ses équivalents via `alternates.languages` : c'est ce qui
 * indique aux moteurs de recherche que /fr/activites et /en/activites sont deux
 * versions de la même page, et non du contenu dupliqué.
 *
 * Seules les pages publiques y figurent — l'espace membre et le back-office
 * n'ont rien à faire dans un index de moteur.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await getActivities();

  const staticPaths = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/activites", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/salles", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/tarifs", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  /** Construit la table des équivalents linguistiques d'un chemin donné. */
  const alternatesFor = (path: string) => ({
    languages: Object.fromEntries(
      routing.locales.map((l) => [l, `${siteUrl}/${l}${path}`]),
    ),
  });

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const route of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: alternatesFor(route.path),
      });
    }

    for (const activity of activities) {
      entries.push({
        url: `${siteUrl}/${locale}/activites/${activity.slug}`,
        lastModified: activity.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: alternatesFor(`/activites/${activity.slug}`),
      });
    }
  }

  return entries;
}
