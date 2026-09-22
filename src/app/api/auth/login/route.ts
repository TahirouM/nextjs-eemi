import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { sessionDuration, signSessionToken } from "@/lib/session";

/**
 * Route Handler — POST /api/auth/login
 *
 * Équivalent mobile de `loginAction`. La Server Action du web ne peut pas être
 * consommée par React Native : elle pose un cookie httpOnly puis lève un
 * `redirect()` (307 vers du HTML). Un client mobile a besoin d'un JSON avec un
 * token qu'il stockera lui-même dans le trousseau du téléphone.
 *
 * La session créée est la MÊME entité que côté web (`AuthSession`) : un même
 * compte peut donc être connecté au navigateur et au téléphone, chaque appareil
 * ayant sa propre ligne révocable indépendamment.
 */

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Message volontairement identique que l'e-mail existe ou non : sinon la
  // route devient un oracle permettant d'énumérer les comptes du club.
  const invalid = NextResponse.json(
    { error: "E-mail ou mot de passe incorrect.", code: "INVALID_CREDENTIALS" },
    { status: 401 },
  );
  if (!user) return invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid;

  const expiresAt = sessionDuration();
  const session = await prisma.authSession.create({
    data: { userId: user.id, expiresAt },
  });
  const token = await signSessionToken(session.id, expiresAt);

  return NextResponse.json(
    {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        onboarded: user.onboarded,
        preferredSiteId: user.preferredSiteId,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
