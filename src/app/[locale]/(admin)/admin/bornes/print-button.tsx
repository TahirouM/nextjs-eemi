"use client";

import { Button } from "@/components/ui";

/**
 * Déclenche l'impression des affiches.
 *
 * Seul fragment client de la page : `window.print()` n'existe pas côté
 * serveur. Tout le reste — génération des QR comprise — est rendu sur le
 * serveur, donc l'impression fonctionne même si ce bouton ne s'hydrate pas :
 * l'utilisateur garde Ctrl/Cmd + P.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
