import Link from "next/link";

/** 404 global de l'application (URL inconnue). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="nums font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-2 max-w-md text-pretty text-ink-soft">
        Le lien est peut-être obsolète, ou la page a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
