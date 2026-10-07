import { PrismaClient } from "@prisma/client";

import { buildWithoutDb } from "@/lib/build";

// En dev, Next recharge les modules à chaque modification. Sans ce cache global
// on ouvrirait un nouveau pool de connexions à chaque HMR jusqu'à saturer Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Build Docker sans base : pendant le pré-rendu, Next lance les requêtes
    // d'une page avant de découvrir (via la session lue par le layout) qu'elle
    // est dynamique, puis abandonne ce rendu. Les échecs de connexion qui en
    // résultent sont attendus et ignorés par Next ; on évite juste de les
    // afficher comme des erreurs dans le log de build.
    log: buildWithoutDb
      ? []
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
