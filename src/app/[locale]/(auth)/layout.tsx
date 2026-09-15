import Link from "next/link";

/**
 * Layout du groupe (auth) : volontairement dépouillé, sans navigation, pour
 * concentrer l'attention sur le formulaire. C'est précisément l'intérêt des
 * route groups — ce groupe n'hérite pas de l'en-tête marketing.
 */
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            ClubSport
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
