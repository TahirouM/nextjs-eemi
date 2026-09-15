"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { registerAction } from "@/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

function SubmitButton() {
  const t = useTranslations("auth");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("creatingAccount") : t("createAccount")}
    </Button>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(registerAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")} htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.firstName)}
          />
        </Field>

        <Field label={t("lastName")} htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={Boolean(errors.lastName)}
          />
        </Field>
      </div>

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

      <Field
        label={t("password")}
        htmlFor="password"
        error={errors.password}
        hint={t("passwordHint")}
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
        label={t("confirmPassword")}
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
