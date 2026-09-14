"use client";

/**
 * Dernier filet : une erreur survenue dans le layout racine lui-même.
 * Ce composant remplace tout le document, il doit donc fournir <html> et <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Erreur globale :", error);

  return (
    <html lang="fr">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Une erreur inattendue est survenue
        </h1>
        <p style={{ marginTop: ".5rem", color: "#6b7280" }}>
          L&apos;application n&apos;a pas pu démarrer correctement.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            borderRadius: ".5rem",
            background: "#4d7c0f",
            color: "#fff",
            padding: ".5rem 1rem",
            border: 0,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
