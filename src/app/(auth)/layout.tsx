import Link from "next/link";

/**
 * Layout du groupe (auth) : volontairement dépouillé, sans navigation,
 * pour concentrer l'attention sur le formulaire. C'est précisément l'intérêt
 * des route groups : ce groupe n'hérite pas de l'en-tête marketing.
 */
export default function AuthLayout({ children }: LayoutProps<"/"> ) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Club<span className="text-accent">Sport</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
