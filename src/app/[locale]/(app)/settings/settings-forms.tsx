"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updatePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/actions/profile";
import { logoutEverywhereAction } from "@/actions/auth";
import { Alert, Button, Checkbox, Field, Input, Select } from "@/components/ui";

/**
 * Les trois formulaires de réglages.
 *
 * Chacun écrit réellement en base et rend un retour explicite (succès ou
 * erreur) : le brief insiste sur ce point — une page de réglages qui ne
 * modifie rien n'est pas une page de réglages.
 *
 * Les libellés arrivent en props depuis la page (Server Component) : les
 * traductions sont résolues côté serveur, ces composants n'embarquent aucun
 * dictionnaire. Les MESSAGES D'ERREUR, eux, viennent des Server Actions et
 * sont traduits côté serveur (voir src/lib/validation.ts).
 */

function SaveButton({ label, saving }: { label: string; saving: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? saving : label}
    </Button>
  );
}

/** Bandeau de retour commun aux trois formulaires. */
function Feedback({
  state,
}: {
  state: { ok?: boolean; message?: string; errors?: Record<string, string> } | null;
}) {
  if (state?.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  if (state?.errors?._form) return <Alert tone="error">{state.errors._form}</Alert>;
  return null;
}

/* ------------------------------- Profil -------------------------------- */

export function ProfileForm({
  defaults,
  labels,
}: {
  defaults: { firstName: string; lastName: string; phone: string };
  labels: {
    firstName: string;
    lastName: string;
    phone: string;
    save: string;
    saving: string;
  };
}) {
  const [state, formAction] = useActionState(updateProfileAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.firstName} htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={defaults.firstName}
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.firstName)}
          />
        </Field>

        <Field label={labels.lastName} htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={defaults.lastName}
            autoComplete="family-name"
            required
            aria-invalid={Boolean(errors.lastName)}
          />
        </Field>
      </div>

      <Field label={labels.phone} htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={defaults.phone}
          placeholder="06 12 34 56 78"
          aria-invalid={Boolean(errors.phone)}
        />
      </Field>

      <SaveButton label={labels.save} saving={labels.saving} />
    </form>
  );
}

/* ----------------------------- Préférences ----------------------------- */

export function PreferencesForm({
  sites,
  defaults,
  labels,
}: {
  sites: Array<{ id: string; name: string; city: string }>;
  defaults: {
    preferredSiteId: string;
    emailOptIn: boolean;
    reminderOptIn: boolean;
  };
  labels: {
    homeRoom: string;
    homeRoomHint: string;
    emailOptIn: string;
    reminderOptIn: string;
    save: string;
    saving: string;
  };
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <Field
        label={labels.homeRoom}
        htmlFor="preferredSiteId"
        error={errors.preferredSiteId}
        hint={labels.homeRoomHint}
      >
        <Select
          id="preferredSiteId"
          name="preferredSiteId"
          defaultValue={defaults.preferredSiteId}
          required
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} — {site.city}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-3">
        <Checkbox
          name="emailOptIn"
          defaultChecked={defaults.emailOptIn}
          label={labels.emailOptIn}
        />
        <Checkbox
          name="reminderOptIn"
          defaultChecked={defaults.reminderOptIn}
          label={labels.reminderOptIn}
        />
      </div>

      <SaveButton label={labels.save} saving={labels.saving} />
    </form>
  );
}

/* ------------------------------ Sécurité ------------------------------- */

export function PasswordForm({
  labels,
}: {
  labels: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    hint: string;
    submit: string;
    saving: string;
  };
}) {
  const [state, formAction] = useActionState(updatePasswordAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <Field
        label={labels.currentPassword}
        htmlFor="currentPassword"
        error={errors.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.currentPassword)}
        />
      </Field>

      <Field
        label={labels.newPassword}
        htmlFor="newPassword"
        error={errors.newPassword}
        hint={labels.hint}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.newPassword)}
        />
      </Field>

      <Field
        label={labels.confirmPassword}
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

      <SaveButton label={labels.submit} saving={labels.saving} />
    </form>
  );
}

/** Révoque toutes les sessions : utile si le compte a été utilisé ailleurs. */
export function LogoutEverywhereForm({ label }: { label: string }) {
  return (
    <form action={logoutEverywhereAction}>
      <Button type="submit" variant="danger">
        {label}
      </Button>
    </form>
  );
}
