"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { completeOnboardingAction } from "@/actions/profile";
import { Alert, Button, Checkbox, Field, Input, Select } from "@/components/ui";

/**
 * Onboarding en trois étapes.
 *
 * Justification du rendu client : la progression entre les étapes est un état
 * purement local (`step`) qui change à chaque clic sans qu'aucune donnée ne
 * soit écrite. Le faire côté serveur imposerait un aller-retour réseau par
 * étape pour zéro bénéfice.
 *
 * Point important : les trois étapes appartiennent à UN SEUL <form>. Les champs
 * des étapes masquées restent montés (cachés en CSS), donc tout est envoyé en
 * une seule Server Action à la fin. Rien n'est écrit en base avant la
 * validation finale.
 */

type Site = { id: string; name: string; city: string };

const STEPS = ["Votre salle", "Votre profil", "Votre formule"] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Terminer l'inscription"}
    </Button>
  );
}

/** Étape où se trouve chaque champ, pour renvoyer l'utilisateur au bon endroit. */
const FIELD_STEP: Record<string, number> = {
  preferredSiteId: 0,
  phone: 1,
  birthDate: 1,
  plan: 2,
  reminderOptIn: 2,
};

export function OnboardingForm({ sites }: { sites: Site[] }) {
  const [state, formAction] = useActionState(completeOnboardingAction, null);
  const [step, setStep] = useState(0);
  const errors = state?.errors ?? {};

  /*
    Le formulaire est validé d'un bloc à la dernière étape, mais une erreur
    peut concerner un champ d'une étape précédente (un site supprimé entre
    l'affichage de la page et l'envoi, par exemple). Sans ce rappel, le
    message s'afficherait sur une étape masquée : l'utilisateur verrait le
    bouton ne « rien faire » sans aucune explication.
  */
  const hiddenStepErrors = Object.entries(errors)
    .filter(([field]) => field !== "_form" && FIELD_STEP[field] !== step)
    .map(([field, message]) => ({ field, message, step: FIELD_STEP[field] ?? 0 }));

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Indicateur de progression, annoncé aux lecteurs d'écran. */}
      <ol className="flex gap-2" aria-label="Progression de l'inscription">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <div
              className={`h-1 rounded-full ${
                index <= step ? "bg-accent" : "bg-surface-sunk"
              }`}
            />
            <p
              className={`mt-2 text-xs ${
                index === step ? "font-medium" : "text-ink-soft"
              }`}
            >
              {index + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      {hiddenStepErrors.length > 0 && (
        <Alert tone="error">
          <span>
            Corrigez l&apos;étape {hiddenStepErrors[0].step + 1} (
            {STEPS[hiddenStepErrors[0].step]}) : {hiddenStepErrors[0].message}.
          </span>{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setStep(hiddenStepErrors[0].step)}
          >
            Y retourner
          </button>
        </Alert>
      )}

      {/* Étape 1 — salle de référence */}
      <div hidden={step !== 0} className="space-y-4">
        <div>
          <h2 className="font-semibold">Dans quelle salle venez-vous ?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ce sera votre salle par défaut. Votre adhésion donne accès aux
            trois, vous pourrez changer à tout moment.
          </p>
        </div>

        <Field
          label="Salle de référence"
          htmlFor="preferredSiteId"
          error={errors.preferredSiteId}
        >
          <Select id="preferredSiteId" name="preferredSiteId" required defaultValue="">
            <option value="" disabled>
              Choisissez une salle
            </option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} — {site.city}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Étape 2 — informations de contact */}
      <div hidden={step !== 1} className="space-y-4">
        <div>
          <h2 className="font-semibold">Quelques informations</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Facultatif, mais utile au club pour vous joindre en cas
            d&apos;annulation de séance.
          </p>
        </div>

        <Field
          label="Téléphone"
          htmlFor="phone"
          error={errors.phone}
          hint="Facultatif."
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
          />
        </Field>

        <Field
          label="Date de naissance"
          htmlFor="birthDate"
          error={errors.birthDate}
          hint="Facultatif. Certaines activités ont un âge minimum."
        >
          <Input id="birthDate" name="birthDate" type="date" />
        </Field>
      </div>

      {/* Étape 3 — formule et préférences */}
      <div hidden={step !== 2} className="space-y-4">
        <div>
          <h2 className="font-semibold">Votre formule</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Aucun paiement n&apos;est demandé dans cette version.
          </p>
        </div>

        <Field label="Formule d'adhésion" htmlFor="plan" error={errors.plan}>
          <Select id="plan" name="plan" defaultValue="standard">
            <option value="standard">Standard — 4 séances par semaine</option>
            <option value="premium">Premium — séances illimitées</option>
          </Select>
        </Field>

        <Checkbox
          name="reminderOptIn"
          defaultChecked
          label="M'envoyer un rappel avant mes séances"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-4">
        <Button
          type="button"
          variant="quiet"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Retour
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Continuer
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}
