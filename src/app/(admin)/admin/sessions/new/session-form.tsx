"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createSessionAction } from "@/actions/admin";
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

type Option = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Création…" : "Créer la séance"}
    </Button>
  );
}

export function SessionForm({
  activities,
  sites,
  coaches,
  defaultStartsAt,
}: {
  activities: Option[];
  sites: Option[];
  coaches: Option[];
  defaultStartsAt: string;
}) {
  const [state, formAction] = useActionState(createSessionAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Activité" htmlFor="activityId" error={errors.activityId}>
          <Select id="activityId" name="activityId" required defaultValue="">
            <option value="" disabled>
              Choisir une activité
            </option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Salle" htmlFor="siteId" error={errors.siteId}>
          <Select id="siteId" name="siteId" required defaultValue="">
            <option value="" disabled>
              Choisir une salle
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Coach"
        htmlFor="coachId"
        error={errors.coachId}
        hint="Facultatif : peut être désigné plus tard."
      >
        <Select id="coachId" name="coachId" defaultValue="">
          <option value="">À confirmer</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Début"
          htmlFor="startsAt"
          error={errors.startsAt}
          hint="Doit être dans le futur."
        >
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStartsAt}
            aria-invalid={Boolean(errors.startsAt)}
          />
        </Field>

        <Field label="Durée (min)" htmlFor="durationMin" error={errors.durationMin}>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            min={15}
            max={300}
            step={5}
            defaultValue={60}
            required
          />
        </Field>

        <Field label="Places" htmlFor="capacity" error={errors.capacity}>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            defaultValue={12}
            required
          />
        </Field>
      </div>

      <Field
        label="Consignes"
        htmlFor="notes"
        error={errors.notes}
        hint="Facultatif. Affiché aux membres sur la page de la séance."
      >
        <Textarea id="notes" name="notes" rows={3} maxLength={500} />
      </Field>

      <SubmitButton />
    </form>
  );
}
