import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

/**
 * Interdit explicitement l'indexation de tout ce qui est privé.
 * C'est une indication pour les robots, pas une protection : l'accès réel
 * est bloqué côté serveur par les gardes de src/lib/auth.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/sessions", "/bookings", "/settings", "/admin", "/onboarding", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
