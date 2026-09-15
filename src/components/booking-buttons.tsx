"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { bookSessionAction, cancelBookingAction } from "@/actions/bookings";
import { Alert, Button } from "@/components/ui";

/**
 * Boutons de réservation / annulation.
 *
 * Client Components : ils doivent afficher le retour de la Server Action
 * (« Séance complète », « Réservation confirmée ») et un état d'envoi, sans
 * recharger la page. La liste de séances qui les entoure reste, elle, rendue
 * côté serveur.
 */

function Submit({
  label,
  pendingLabel,
  variant = "primary",
  disabled,
  full,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  full?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      className={full ? "w-full" : undefined}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function BookButton({
  sessionId,
  disabled,
  full,
}: {
  sessionId: string;
  disabled?: boolean;
  full?: boolean;
}) {
  const t = useTranslations("sessions");
  const [state, formAction] = useActionState(bookSessionAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <Submit
          label={t("book")}
          pendingLabel={t("booking")}
          disabled={disabled}
          full={full}
        />
      </form>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}

export function CancelButton({
  bookingId,
  full,
}: {
  bookingId: string;
  full?: boolean;
}) {
  const t = useTranslations("sessions");
  const [state, formAction] = useActionState(cancelBookingAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <Submit
          label={t("cancel")}
          pendingLabel={t("cancelling")}
          variant="danger"
          full={full}
        />
      </form>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}
