"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { checkInAction } from "@/actions/bookings";
import {
  cancelSessionAction,
  updateMembershipStatusAction,
  updateUserRoleAction,
} from "@/actions/admin";
import { Alert, Button, Select } from "@/components/ui";

/** Actions du back-office : elles affichent toutes leur retour serveur. */

function Pending({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? pendingLabel : label}</>;
}

/* ------------------------ Pointage de présence ------------------------- */

export function CheckInButtons({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [state, formAction] = useActionState(checkInAction, null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="present" value="true" />
          <Button
            type="submit"
            variant={status === "ATTENDED" ? "primary" : "secondary"}
            className="px-3 py-1 text-xs"
          >
            <Pending label="Présent" pendingLabel="…" />
          </Button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="present" value="false" />
          <Button
            type="submit"
            variant={status === "NO_SHOW" ? "danger" : "secondary"}
            className="px-3 py-1 text-xs"
          >
            <Pending label="Absent" pendingLabel="…" />
          </Button>
        </form>
      </div>

      {state?.error && (
        <p role="alert" className="text-xs text-stop">
          {state.error}
        </p>
      )}
    </div>
  );
}

/* ------------------------- Annulation de séance ------------------------ */

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useActionState(cancelSessionAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <Button type="submit" variant="danger" className="w-full">
          <Pending label="Annuler la séance" pendingLabel="Annulation…" />
        </Button>
      </form>

      <p className="text-xs text-ink-soft">
        Toutes les inscriptions seront annulées. Action irréversible.
      </p>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}

/* --------------------------- Statut d'adhésion ------------------------- */

export function MembershipStatusForm({
  userId,
  current,
}: {
  userId: string;
  current: string;
}) {
  const [state, formAction] = useActionState(updateMembershipStatusAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="userId" value={userId} />
        <Select name="status" defaultValue={current} className="text-sm">
          <option value="PENDING">En attente</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspendue</option>
          <option value="EXPIRED">Expirée</option>
        </Select>
        <Button type="submit" variant="secondary">
          <Pending label="Appliquer" pendingLabel="…" />
        </Button>
      </form>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}

/* -------------------------------- Rôle --------------------------------- */

export function RoleForm({
  userId,
  current,
}: {
  userId: string;
  current: string;
}) {
  const [state, formAction] = useActionState(updateUserRoleAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="userId" value={userId} />
        <Select name="role" defaultValue={current} className="text-sm">
          <option value="MEMBER">Membre</option>
          <option value="COACH">Coach</option>
          <option value="ADMIN">Administrateur</option>
        </Select>
        <Button type="submit" variant="secondary">
          <Pending label="Appliquer" pendingLabel="…" />
        </Button>
      </form>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}
