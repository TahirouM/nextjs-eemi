"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { registerAction } from "@/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Création du compte…" : "Créer mon compte"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.firstName)}
          />
        </Field>

        <Field label="Nom" htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={Boolean(errors.lastName)}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="email" error={errors.email}>
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

      <Field
        label="Mot de passe"
        htmlFor="password"
        error={errors.password}
        hint="8 caractères minimum."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
        />
      </Field>

      <Field
        label="Confirmer le mot de passe"
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
