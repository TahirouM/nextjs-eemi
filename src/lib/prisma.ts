import { PrismaClient } from "@prisma/client";

// En dev, Next recharge les modules à chaque modification. Sans ce cache global
// on ouvrirait un nouveau pool de connexions à chaque HMR jusqu'à saturer Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
