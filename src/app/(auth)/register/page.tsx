import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoignez ClubSport et réservez vos séances en ligne.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
        Rejoindre le club
      </h1>
      <p className="mt-2 mb-7 text-ink-soft">
        Créez votre compte, puis choisissez votre salle et votre formule.
      </p>

      <RegisterForm />

      <p className="mt-7 border-t border-rule pt-5 text-sm text-ink-soft">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
