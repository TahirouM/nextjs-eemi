import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { readSessionCookie, verifySessionToken } from "@/lib/session";

/**
 * Couche d'autorisation. Règle du projet : le middleware ne fait QUE de
 * l'aiguillage (il ne voit pas la base, il tourne sur l'Edge runtime).
 * La vraie protection est ici, exécutée côté serveur à chaque rendu de page,
 * Server Action et Route Handler.
 */

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  onboarded: boolean;
  preferredSiteId: string | null;
};

/**
 * `cache()` de React dédoublonne l'appel sur la durée d'UNE requête serveur :
 * le layout, la page et les composants imbriqués appellent tous
 * `getCurrentUser()` mais une seule requête SQL part réellement.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readSessionCookie();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sid },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          onboarded: true,
          preferredSiteId: true,
        },
      },
    },
  });

  // Session révoquée (déconnexion) ou expirée : le cookie ne suffit pas.
  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
});

/**
 * Exige une session valide. Utilisé par tout l'espace (app).
 *
 * Le paramètre `?stale=1` est ajouté quand un cookie est présent mais ne
 * correspond à aucune session vivante. Il sert de signal au proxy, qui tourne
 * sur l'Edge runtime et ne peut pas interroger la base : sans lui, le proxy
 * verrait un cookie signé valide et renverrait aussitôt vers /dashboard,
 * créant une boucle de redirections.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const hadCookie = (await readSessionCookie()) !== null;
    redirect(hadCookie ? "/login?stale=1" : "/login");
  }
  return user;
}

/** Exige une session ET un onboarding terminé. */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  return user;
}

/**
 * Exige un rôle précis. Renvoie vers /dashboard plutôt que /login quand
 * l'utilisateur est connecté mais pas assez privilégié : c'est un 403 métier,
 * pas un défaut d'authentification.
 */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (!roles.includes(user.role)) redirect("/dashboard?error=forbidden");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

/** Admin ou coach : les deux peuvent pointer les présences. */
export async function requireStaff(): Promise<CurrentUser> {
  return requireRole("ADMIN", "COACH");
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
