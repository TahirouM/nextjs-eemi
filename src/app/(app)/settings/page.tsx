import type { Metadata } from "next";

import { requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSites } from "@/lib/queries";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import {
  membershipStatusLabel,
  membershipStatusTone,
  formatShortDate,
  roleLabel,
} from "@/lib/format";
import {
  LogoutEverywhereForm,
  PasswordForm,
  PreferencesForm,
  ProfileForm,
} from "./settings-forms";

export const metadata: Metadata = {
  title: "Réglages",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireOnboardedUser();

  // Les champs éditables ne sont pas dans la session : on les relit en base
  // pour afficher les valeurs à jour après une modification.
  const [profile, sites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        emailOptIn: true,
        reminderOptIn: true,
        preferredSiteId: true,
        createdAt: true,
        memberships: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    getSites(),
  ]);

  if (!profile) throw new Error("Profil introuvable");

  const membership = profile.memberships[0];

  return (
    <>
      <PageHeader
        title="Réglages"
        description="Vos informations, vos préférences et la sécurité de votre compte."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle>Profil</CardTitle>
            <ProfileForm
              defaults={{
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone ?? "",
              }}
            />
          </Card>

          <Card>
            <CardTitle>Préférences</CardTitle>
            <PreferencesForm
              sites={sites}
              defaults={{
                preferredSiteId: profile.preferredSiteId ?? sites[0]?.id ?? "",
                emailOptIn: profile.emailOptIn,
                reminderOptIn: profile.reminderOptIn,
              }}
            />
          </Card>

          <Card>
            <CardTitle>Sécurité</CardTitle>
            <PasswordForm />

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-sm font-medium">Sessions actives</p>
              <p className="mb-3 mt-1 text-sm text-muted">
                Ferme toutes vos sessions, y compris celle-ci. Utile si vous
                vous êtes connecté sur un appareil partagé.
              </p>
              <LogoutEverywhereForm />
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardTitle>Mon compte</CardTitle>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Email
              </dt>
              <dd className="mt-0.5 break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Rôle
              </dt>
              <dd className="mt-0.5">{roleLabel[profile.role]}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Membre depuis
              </dt>
              <dd className="mt-0.5">{formatShortDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                Adhésion
              </dt>
              <dd className="mt-1">
                {membership ? (
                  <>
                    <Badge tone={membershipStatusTone[membership.status]}>
                      {membershipStatusLabel[membership.status]}
                    </Badge>
                    <p className="mt-1 text-xs capitalize text-muted">
                      Formule {membership.plan} · jusqu&apos;au{" "}
                      {formatShortDate(membership.endsAt)}
                    </p>
                  </>
                ) : (
                  <span className="text-muted">Aucune</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
            L&apos;email et le rôle ne sont pas modifiables depuis cette page :
            ils relèvent de l&apos;administration du club.
          </p>
        </Card>
      </div>
    </>
  );
}
