import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getSites } from "@/lib/queries";
import { Card } from "@/components/ui";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Finaliser mon inscription",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  // `requireUser` et non `requireOnboardedUser` : c'est justement la page qui
  // termine l'onboarding, l'exiger ici créerait une boucle de redirection.
  const user = await requireUser();

  // Un utilisateur déjà onboardé n'a rien à faire ici.
  if (user.onboarded) redirect("/dashboard");

  const sites = await getSites();

  return (
    <Card>
      <h1 className="text-xl font-semibold tracking-tight">
        Bienvenue {user.firstName}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Trois étapes rapides et votre compte devient un vrai accès au club.
      </p>

      <OnboardingForm sites={sites} />
    </Card>
  );
}
