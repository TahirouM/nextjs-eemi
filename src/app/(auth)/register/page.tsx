import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Rejoignez ClubSport et réservez vos séances en ligne.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold tracking-tight">Rejoindre le club</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Créez votre compte, puis choisissez votre salle et votre formule.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-accent">
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
