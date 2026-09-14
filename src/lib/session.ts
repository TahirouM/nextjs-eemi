import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Gestion du cookie de session.
 *
 * Choix : un JWT signé (jose, compatible Edge runtime donc lisible par le
 * middleware) QUI NE CONTIENT QU'UN identifiant de session opaque.
 * Le JWT porte `sid`, pas le rôle : le rôle est relu en base à chaque requête
 * serveur. Sinon un utilisateur promu/rétrogradé garderait son ancien rôle
 * jusqu'à expiration du cookie — et un cookie volé resterait valable.
 * La ligne AuthSession en base permet la révocation réelle à la déconnexion.
 */

const COOKIE_NAME = "clubsport_session";
const SESSION_DURATION_DAYS = 7;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { sid: string };

export async function signSessionToken(sid: string, expiresAt: Date) {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());
}

/** Vérifie la signature et l'expiration. Ne touche pas à la base (Edge-safe). */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sid !== "string") return null;
    return { sid: payload.sid };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export function sessionDuration() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, // inaccessible au JS client : limite le vol par XSS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // protège des CSRF simples tout en gardant les liens entrants
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSessionCookie() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
