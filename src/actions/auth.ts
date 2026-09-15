"use server";



import { prisma } from "@/lib/prisma";
import { redirectLocalized, translateFieldErrors, tValidation } from "@/lib/errors";
import { hashPassword, verifyPassword, getCurrentUser } from "@/lib/auth";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionDuration,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validation";

/**
 * Server Actions d'authentification.
 *
 * Elles tournent exclusivement sur le serveur : le mot de passe n'est jamais
 * comparé côté client et le hash ne quitte jamais la base. Le retour est une
 * forme unique `{ errors }` consommée par `useActionState` dans les formulaires.
 */

export type AuthState = { errors: Record<string, string> } | null;

/** Crée la ligne AuthSession et pose le cookie signé. */
async function startSession(userId: string) {
  const expiresAt = sessionDuration();
  const session = await prisma.authSession.create({
    data: { userId, expiresAt },
  });
  const token = await signSessionToken(session.id, expiresAt);
  await setSessionCookie(token, expiresAt);
}

/** N'autorise que les chemins internes : empêche un open redirect via ?next=. */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { errors: await translateFieldErrors(parsed.error) };

  const { firstName, lastName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: await tValidation("emailTaken") } };
  }

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash: await hashPassword(password),
      // Rôle jamais accepté depuis le formulaire : un POST forgé pourrait
      // sinon créer un administrateur.
      role: "MEMBER",
      onboarded: false,
    },
  });

  await startSession(user.id);
  // Un compte fraîchement créé n'est pas encore un utilisateur du produit :
  // on l'envoie vers l'onboarding, pas vers le dashboard.
  return await redirectLocalized("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { errors: await translateFieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Message volontairement identique dans les deux cas : ne pas révéler
  // quels emails existent en base.
  const invalid = { errors: { _form: await tValidation("badCredentials") } };
  if (!user) return invalid;

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return invalid;

  await startSession(user.id);

  const next = safeNext(formData.get("next"));
  if (next) await redirectLocalized(next);
  return await redirectLocalized(user.onboarded ? "/dashboard" : "/onboarding");
}

export async function logoutAction() {
  const token = await readSessionCookie();
  if (token) {
    const payload = await verifySessionToken(token);
    // Suppression en base : la session est réellement révoquée, pas seulement
    // oubliée par le navigateur.
    if (payload) {
      await prisma.authSession.deleteMany({ where: { id: payload.sid } });
    }
  }
  await clearSessionCookie();
  return await redirectLocalized("/");
}

/** Déconnecte toutes les autres sessions (page Sécurité des réglages). */
export async function logoutEverywhereAction() {
  const user = await getCurrentUser();
  if (!user) return await redirectLocalized("/login");

  await prisma.authSession.deleteMany({ where: { userId: user.id } });
  await clearSessionCookie();
  return await redirectLocalized("/login?message=sessions-closed");
}
