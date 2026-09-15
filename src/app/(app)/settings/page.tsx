import type { Metadata } from "next";

import { requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSites } from "@/lib/queries";
import { Badge, Panel, PanelTitle, PageHeader } from "@/components/ui";
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
          <Panel>
            <PanelTitle>Profil</PanelTitle>
            <ProfileForm
              defaults={{
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone ?? "",
              }}
            />
          </Panel>

          <Panel>
            <PanelTitle>Préférences</PanelTitle>
            <PreferencesForm
              sites={sites}
              defaults={{
                preferredSiteId: profile.preferredSiteId ?? sites[0]?.id ?? "",
                emailOptIn: profile.emailOptIn,
                reminderOptIn: profile.reminderOptIn,
              }}
            />
          </Panel>

          <Panel>
            <PanelTitle>Sécurité</PanelTitle>
            <PasswordForm />

            <div className="mt-6 border-t border-rule pt-5">
              <p className="text-sm font-medium">Sessions actives</p>
              <p className="mb-3 mt-1 text-sm text-ink-soft">
                Ferme toutes vos sessions, y compris celle-ci. Utile si vous
                vous êtes connecté sur un appareil partagé.
              </p>
              <LogoutEverywhereForm />
            </div>
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelTitle>Mon compte</PanelTitle>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-sm text-ink-soft">
                Email
              </dt>
              <dd className="mt-0.5 break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">
                Rôle
              </dt>
              <dd className="mt-0.5">{roleLabel[profile.role]}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">
                Membre depuis
              </dt>
              <dd className="mt-0.5">{formatShortDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">
                Adhésion
              </dt>
              <dd className="mt-1">
                {membership ? (
                  <>
                    <Badge tone={membershipStatusTone[membership.status]}>
                      {membershipStatusLabel[membership.status]}
                    </Badge>
                    <p className="mt-1 text-xs capitalize text-ink-soft">
                      Formule {membership.plan} · jusqu&apos;au{" "}
                      {formatShortDate(membership.endsAt)}
                    </p>
                  </>
                ) : (
                  <span className="text-ink-soft">Aucune</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-rule pt-4 text-xs text-ink-soft">
            L&apos;email et le rôle ne sont pas modifiables depuis cette page :
            ils relèvent de l&apos;administration du club.
          </p>
        </Panel>
      </div>
    </>
  );
}
