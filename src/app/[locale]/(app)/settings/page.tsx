import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSites } from "@/lib/queries";
import { Badge, Panel, PanelTitle, PageHeader } from "@/components/ui";
import {
  membershipStatusKey,
  membershipStatusTone,
  formatShortDate,
  roleKey,
} from "@/lib/format";
import {
  LogoutEverywhereForm,
  PasswordForm,
  PreferencesForm,
  ProfileForm,
} from "./settings-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function SettingsPage({
  params,
}: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [user, t, tStatus] = await Promise.all([
    requireOnboardedUser(),
    getTranslations("settings"),
    getTranslations("status"),
  ]);

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
  const lang = locale as "fr" | "en";

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelTitle>{t("profile")}</PanelTitle>
            <ProfileForm
              defaults={{
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone ?? "",
              }}
              labels={{
                firstName: t("firstName"),
                lastName: t("lastName"),
                phone: t("phone"),
                save: t("save"),
                saving: t("saving"),
              }}
            />
          </Panel>

          <Panel>
            <PanelTitle>{t("preferences")}</PanelTitle>
            <PreferencesForm
              sites={sites}
              defaults={{
                preferredSiteId: profile.preferredSiteId ?? sites[0]?.id ?? "",
                emailOptIn: profile.emailOptIn,
                reminderOptIn: profile.reminderOptIn,
              }}
              labels={{
                homeRoom: t("homeRoom"),
                homeRoomHint: t("homeRoomHint"),
                emailOptIn: t("emailOptIn"),
                reminderOptIn: t("reminderOptIn"),
                save: t("save"),
                saving: t("saving"),
              }}
            />
          </Panel>

          <Panel>
            <PanelTitle>{t("security")}</PanelTitle>
            <PasswordForm
              labels={{
                currentPassword: t("currentPassword"),
                newPassword: t("newPassword"),
                confirmPassword: t("confirmPassword"),
                hint: t("passwordHint"),
                submit: t("changePassword"),
                saving: t("saving"),
              }}
            />

            <div className="mt-6 border-t border-rule pt-5">
              <p className="text-sm font-medium">{t("activeSessions")}</p>
              <p className="mb-3 mt-1 text-sm text-ink-soft">
                {t("activeSessionsText")}
              </p>
              <LogoutEverywhereForm label={t("logoutEverywhere")} />
            </div>
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelTitle>{t("myAccount")}</PanelTitle>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-sm text-ink-soft">{t("email")}</dt>
              <dd className="mt-0.5 break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">{t("role")}</dt>
              <dd className="mt-0.5">{tStatus(roleKey[profile.role])}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">{t("memberSince")}</dt>
              <dd className="mt-0.5">
                {formatShortDate(profile.createdAt, lang)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">{t("membership")}</dt>
              <dd className="mt-1">
                {membership ? (
                  <>
                    <Badge tone={membershipStatusTone[membership.status]}>
                      {tStatus(membershipStatusKey[membership.status])}
                    </Badge>
                    <p className="mt-1 text-xs capitalize text-ink-soft">
                      {t("planUntil", {
                        plan: membership.plan,
                        date: formatShortDate(membership.endsAt, lang),
                      })}
                    </p>
                  </>
                ) : (
                  <span className="text-ink-soft">{t("none")}</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-rule pt-4 text-xs text-ink-soft">
            {t("notEditable")}
          </p>
        </Panel>
      </div>
    </>
  );
}
