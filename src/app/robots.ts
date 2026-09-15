import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/**
 * Interdit l'indexation de tout ce qui est privé, DANS CHAQUE LANGUE :
 * /fr/dashboard et /en/dashboard doivent être exclus tous les deux.
 *
 * C'est une indication pour les robots, pas une protection : l'accès réel est
 * bloqué côté serveur par les gardes de src/lib/auth.ts.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/dashboard",
    "/sessions",
    "/bookings",
    "/settings",
    "/admin",
    "/onboarding",
  ];

  const disallow = routing.locales.flatMap((locale) =>
    privatePaths.map((path) => `/${locale}${path}`),
  );

  return {
    rules: { userAgent: "*", allow: "/", disallow: [...disallow, "/api"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
