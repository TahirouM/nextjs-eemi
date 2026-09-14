import type { MetadataRoute } from "next";

import { getActivities } from "@/lib/queries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/**
 * Sitemap généré depuis la base : quand une activité est ajoutée, sa fiche
 * apparaît automatiquement. Seules les pages publiques y figurent — l'espace
 * membre et le back-office n'ont rien à faire dans un index de moteur.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activities = await getActivities();

  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/activites", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/salles", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/tarifs", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...activities.map((activity) => ({
      url: `${siteUrl}/activites/${activity.slug}`,
      lastModified: activity.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
