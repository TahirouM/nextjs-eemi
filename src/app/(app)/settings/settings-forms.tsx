"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updatePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/actions/profile";
import { logoutEverywhereAction } from "@/actions/auth";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
} from "@/components/ui";

/**
 * Les trois formulaires de réglages.
 *
 * Chacun écrit réellement en base et rend un retour explicite (succès ou
 * erreur) : le brief insiste sur ce point — une page de réglages qui ne
 * modifie rien n'est pas une page de réglages.
 */

function SaveButton({ label = "Enregistrer" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : label}
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
}: {
  defaults: { firstName: string; lastName: string; phone: string };
}) {
  const [state, formAction] = useActionState(updateProfileAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={errors.firstName}>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={defaults.firstName}
            required
            aria-invalid={Boolean(errors.firstName)}
          />
        </Field>

        <Field label="Nom" htmlFor="lastName" error={errors.lastName}>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={defaults.lastName}
            required
            aria-invalid={Boolean(errors.lastName)}
          />
        </Field>
      </div>

      <Field label="Téléphone" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaults.phone}
          placeholder="06 12 34 56 78"
          aria-invalid={Boolean(errors.phone)}
        />
      </Field>

      <SaveButton />
    </form>
  );
}

/* ----------------------------- Préférences ----------------------------- */

export function PreferencesForm({
  sites,
  defaults,
}: {
  sites: Array<{ id: string; name: string; city: string }>;
  defaults: {
    preferredSiteId: string;
    emailOptIn: boolean;
    reminderOptIn: boolean;
  };
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <Field
        label="Salle de référence"
        htmlFor="preferredSiteId"
        error={errors.preferredSiteId}
        hint="Utilisée pour vous proposer des séances sur votre tableau de bord."
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
          label="Recevoir les actualités du club par email"
        />
        <Checkbox
          name="reminderOptIn"
          defaultChecked={defaults.reminderOptIn}
          label="Recevoir un rappel avant mes séances"
        />
      </div>

      <SaveButton />
    </form>
  );
}

/* ------------------------------ Sécurité ------------------------------- */

export function PasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Feedback state={state} />

      <Field
        label="Mot de passe actuel"
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
        label="Nouveau mot de passe"
        htmlFor="newPassword"
        error={errors.newPassword}
        hint="8 caractères minimum."
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
        label="Confirmer le nouveau mot de passe"
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

      <SaveButton label="Modifier le mot de passe" />
    </form>
  );
}

/** Révoque toutes les sessions : utile si le compte a été utilisé ailleurs. */
export function LogoutEverywhereForm() {
  return (
    <form action={logoutEverywhereAction}>
      <Button type="submit" variant="danger">
        Déconnecter tous mes appareils
      </Button>
    </form>
  );
}
