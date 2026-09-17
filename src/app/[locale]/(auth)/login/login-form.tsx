"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * Client Component — et uniquement lui.
 *
 * Justification du rendu client (choix n°2 exigé par le brief) : ce formulaire
 * a besoin d'état interactif que le serveur ne peut pas fournir seul — afficher
 * les erreurs de validation renvoyées par l'action sans recharger la page,
 * désactiver le bouton pendant l'envoi, et remplir les champs au clic sur un
 * compte de démonstration. La frontière est placée ici, au plus bas : la page
 * qui l'entoure reste un Server Component.
 */

/**
 * Comptes créés par `prisma/seed.ts`, avec le mot de passe commun qui y est
 * défini. Les exposer est un choix assumé : c'est un projet pédagogique dont
 * la base est publique et réinitialisable. Dans un vrai produit, ce bloc
 * n'existerait pas.
 *
 * `roleKey` pointe vers la traduction du rôle : le libellé se traduit, pas
 * l'adresse.
 */
const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS = [
  { email: "membre@clubsport.fr", roleKey: "demoMember" },
  { email: "coach@clubsport.fr", roleKey: "demoCoach" },
  { email: "admin@clubsport.fr", roleKey: "demoAdmin" },
  { email: "nouveau@clubsport.fr", roleKey: "demoOnboarding" },
] as const;

function SubmitButton() {
  const t = useTranslations("auth");
  // useFormStatus doit être dans un composant ENFANT du <form> pour lire
  // l'état d'envoi du formulaire parent.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("signingIn") : t("signIn")}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(loginAction, null);
  const errors = state?.errors ?? {};

  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Remplit les deux champs puis donne le focus au bouton d'envoi.
   *
   * On écrit dans le DOM via `ref` plutôt que de passer les `<Input>` en
   * composants contrôlés : ceux-ci n'ont pas d'état React, et en ajouter un
   * uniquement pour ce raccourci de démonstration ferait re-rendre le
   * formulaire à chaque frappe de l'utilisateur. Ici, le navigateur reste
   * maître de la saisie.
   *
   * Les événements `input` sont émis explicitement : sans eux, le navigateur
   * peut laisser le libellé flottant ou la validation native dans leur état
   * « champ vide ».
   */
  function fillWith(email: string) {
    const form = formRef.current;
    if (!form) return;

    const fields: Array<[string, string]> = [
      ["email", email],
      ["password", DEMO_PASSWORD],
    ];

    for (const [name, value] of fields) {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) {
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    // Le champ est rempli : l'action suivante est d'envoyer, pas de saisir.
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submit?.focus();
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-4" noValidate>
        {/* Destination mémorisée par le middleware, revalidée côté serveur. */}
        {next && <input type="hidden" name="next" value={next} />}

        {errors._form && <Alert tone="error">{errors._form}</Alert>}

        <Field label={t("email")} htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            placeholder="vous@exemple.fr"
          />
        </Field>

        <Field label={t("password")} htmlFor="password" error={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        <SubmitButton />
      </form>

      {/* Comptes de démonstration : exigés dans les livrables du brief. */}
      <section className="mt-7 rounded-xl border border-rule bg-surface-sunk p-4">
        <h2 className="text-sm font-medium">{t("demoAccounts")}</h2>
        <p className="mt-1 text-xs text-ink-soft">{t("demoHint")}</p>

        {/*
          Un bouton par compte : cliquer remplit les deux champs. `type="button"`
          est indispensable — sans lui, un <button> dans un formulaire vaut
          `submit` et enverrait la connexion avant que les champs soient lus.
        */}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => fillWith(account.email)}
                className="w-full rounded-lg border border-rule-strong bg-surface-solid/60 px-3 py-2 text-start transition-colors duration-150 hover:border-accent hover:bg-surface-solid"
              >
                <span
                  className="block font-mono text-xs break-all text-ink"
                  translate="no"
                >
                  {account.email}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t(account.roleKey)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-rule pt-2.5 text-xs text-ink-soft">
          {t("sharedPassword")}{" "}
          <span className="font-mono" translate="no">
            {DEMO_PASSWORD}
          </span>
        </p>
      </section>
    </>
  );
}
