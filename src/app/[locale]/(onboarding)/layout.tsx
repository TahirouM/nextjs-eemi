import Link from "next/link";

import { logoutAction } from "@/actions/auth";

/**
 * Layout du groupe (onboarding) : ni navigation marketing, ni navigation
 * applicative. L'utilisateur n'a qu'une chose à faire ici, on ne lui propose
 * aucune échappatoire sauf la déconnexion.
 */
export default function OnboardingLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Club<span className="text-accent">Sport</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
