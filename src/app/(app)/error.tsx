"use client";

import { useEffect } from "react";

import { Button, ErrorState } from "@/components/ui";

/**
 * `error.tsx` doit être un Client Component : React y attache une frontière
 * d'erreur, qui a besoin d'état côté navigateur pour intercepter le rendu
 * fautif et proposer une reprise.
 *
 * Il couvre tout le groupe (app) : une requête qui échoue dans n'importe quelle
 * page de l'espace membre affiche cet écran au lieu de casser l'application.
 * La navigation, rendue par le layout parent, reste utilisable.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En production, c'est ici qu'on enverrait l'erreur à un service de suivi.
    console.error("Erreur dans l'espace membre :", error);
  }, [error]);

  return (
    <ErrorState
      description="Nous n'avons pas pu charger cette page. L'incident a été enregistré, vous pouvez réessayer."
      action={<Button onClick={reset}>Réessayer</Button>}
    />
  );
}
