import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Le plugin next-intl indique à Next.js où trouver la configuration des
 * traductions (`src/i18n/request.ts`). Sans cet appel, les pages rendues au
 * build ne savent pas charger les messages.
 */
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Image Docker : `next build` produit `.next/standalone`, un serveur
  // autonome (`server.js`) accompagné des seuls modules réellement utilisés.
  // L'image finale n'a donc besoin ni de `npm install` ni du code source.
  // Sans effet sur Vercel, qui a son propre format de sortie.
  output: "standalone",

  // Images distantes autorisées. Sans cette liste, <Image> refuse les URLs
  // externes : c'est une protection contre l'usage du serveur comme proxy
  // d'optimisation pour n'importe quel domaine.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  // Empêche la fuite d'informations sur la stack côté réponse HTTP.
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
