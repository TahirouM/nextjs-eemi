import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images distantes autorisées. Sans cette liste, <Image> refuse les URLs
  // externes : c'est une protection contre l'usage du serveur comme proxy
  // d'optimisation pour n'importe quel domaine.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Empêche la fuite d'informations sur la stack côté réponse HTTP.
  poweredByHeader: false,
};

export default nextConfig;
