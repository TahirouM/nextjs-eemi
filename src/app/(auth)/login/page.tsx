import type { Metadata } from "next";
import Link from "next/link";

import { Alert, Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace membre ClubSport.",
  // Les pages d'authentification n'ont aucun intérêt dans les résultats
  // de recherche : on demande explicitement leur désindexation.
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  return (
    <Card>
      <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Accédez à votre planning et à vos réservations.
      </p>

      {message === "sessions-closed" && (
        <div className="mb-4">
          <Alert tone="success">
            Toutes vos sessions ont été fermées. Reconnectez-vous.
          </Alert>
        </div>
      )}

      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-accent">
          Rejoindre le club
        </Link>
      </p>

      {/* Comptes de démonstration : exigés dans les livrables du brief. */}
      <div className="mt-6 rounded-lg border border-border bg-surface-muted p-4 text-xs text-muted">
        <p className="font-medium text-foreground">Comptes de démonstration</p>
        <ul className="mt-2 space-y-1 font-mono">
          <li>membre@clubsport.fr — membre</li>
          <li>coach@clubsport.fr — coach</li>
          <li>admin@clubsport.fr — administrateur</li>
          <li>nouveau@clubsport.fr — onboarding à faire</li>
        </ul>
        <p className="mt-2">Mot de passe commun : Password123!</p>
      </div>
    </Card>
  );
}
