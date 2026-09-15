"use client";

import { useTranslations } from "next-intl";
import { ButtonLink, EmptyState } from "@/components/ui";

/** Rendu quand `notFound()` est appelé dans la page de détail. */
export default function SessionNotFound() {
  const t = useTranslations("sessions");
  return (
    <EmptyState
      title={t("notFound")}
      description={t("notFoundText")}
      action={<ButtonLink href="/sessions">{t("backToPlanning")}</ButtonLink>}
    />
  );
}
