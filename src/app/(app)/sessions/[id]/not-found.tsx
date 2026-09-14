import { ButtonLink, EmptyState } from "@/components/ui";

/** Rendu quand `notFound()` est appelé dans la page de détail. */
export default function SessionNotFound() {
  return (
    <EmptyState
      title="Séance introuvable"
      description="Cette séance n'existe pas ou a été retirée du planning."
      action={<ButtonLink href="/sessions">Retour au planning</ButtonLink>}
    />
  );
}
