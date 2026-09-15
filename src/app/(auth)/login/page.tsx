import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace membre ClubSport.",
  // Les pages d'authentification n'ont aucun intérêt dans les résultats de
  // recherche : on demande explicitement leur désindexation.
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
        Connexion
      </h1>
      <p className="mt-2 mb-7 text-ink-soft">
        Retrouvez votre planning et vos réservations.
      </p>

      {message === "sessions-closed" && (
        <div className="mb-5">
          <Alert tone="success">
            Toutes vos sessions ont été fermées. Reconnectez-vous.
          </Alert>
        </div>
      )}

      <LoginForm next={next} />

      <p className="mt-7 border-t border-rule pt-5 text-sm text-ink-soft">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Rejoindre le club
        </Link>
      </p>

      {/* Comptes de démonstration : exigés dans les livrables du brief. */}
      <details className="mt-6 rounded-sm border border-rule bg-surface-sunk">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Comptes de démonstration
        </summary>
        <div className="border-t border-rule px-4 py-3 text-sm">
          <dl className="space-y-1.5">
            {[
              ["membre@clubsport.fr", "membre"],
              ["coach@clubsport.fr", "coach"],
              ["admin@clubsport.fr", "administrateur"],
              ["nouveau@clubsport.fr", "onboarding à faire"],
            ].map(([email, role]) => (
              <div key={email} className="flex flex-wrap justify-between gap-x-4">
                <dt className="font-mono text-xs" translate="no">
                  {email}
                </dt>
                <dd className="text-xs text-ink-soft">{role}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-rule pt-2.5 text-xs text-ink-soft">
            Mot de passe commun :{" "}
            <span className="font-mono" translate="no">
              Password123!
            </span>
          </p>
        </div>
      </details>
    </div>
  );
}
