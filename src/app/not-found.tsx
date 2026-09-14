import Link from "next/link";

/** 404 global de l'application (URL inconnue). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Le lien est peut-être obsolète, ou la page a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
