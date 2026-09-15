"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * Client Component — et uniquement lui.
 *
 * Justification du rendu client (choix n°2 exigé par le brief) : ce formulaire
 * a besoin d'état interactif que le serveur ne peut pas fournir seul — afficher
 * les erreurs de validation renvoyées par l'action sans recharger la page, et
 * désactiver le bouton pendant l'envoi. La frontière est placée ici, au plus
 * bas : la page qui l'entoure reste un Server Component.
 */

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

  return (
    <form action={formAction} className="space-y-4" noValidate>
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
  );
}
