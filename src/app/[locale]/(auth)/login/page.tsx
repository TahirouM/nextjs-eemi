import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("loginTitle"),
    description: t("loginMeta"),
    // Les pages d'authentification n'ont aucun intérêt dans les résultats de
    // recherche : on demande explicitement leur désindexation.
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  const next = typeof query.next === "string" ? query.next : undefined;
  const message = typeof query.message === "string" ? query.message : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
        {t("loginTitle")}
      </h1>
      <p className="mt-2 mb-7 text-ink-soft">{t("loginSubtitle")}</p>

      {message === "sessions-closed" && (
        <div className="mb-5">
          <Alert tone="success">{t("sessionsClosed")}</Alert>
        </div>
      )}

      {/*
        Le formulaire porte aussi les comptes de démonstration : les remplir
        demande d'écrire dans ses champs, donc les deux vivent dans le même
        Client Component.
      */}
      <LoginForm next={next} />

      <p className="mt-7 border-t border-rule pt-5 text-sm text-ink-soft">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("joinClub")}
        </Link>
      </p>
    </div>
  );
}
