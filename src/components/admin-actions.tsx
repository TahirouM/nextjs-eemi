"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
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
            <Pending label={t("present")} pendingLabel="…" />
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
            <Pending label={t("absent")} pendingLabel="…" />
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
  const t = useTranslations("admin");
  const [state, formAction] = useActionState(cancelSessionAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <Button type="submit" variant="danger" className="w-full">
          <Pending label={t("cancelSession")} pendingLabel={t("cancellingSession")} />
        </Button>
      </form>

      <p className="text-xs text-ink-soft">
        {t("cancelSessionWarning")}
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
  const t = useTranslations("admin");
  const tStatus = useTranslations("status");
  const [state, formAction] = useActionState(updateMembershipStatusAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="userId" value={userId} />
        <Select name="status" defaultValue={current} className="text-sm">
          <option value="PENDING">{tStatus("pending")}</option>
          <option value="ACTIVE">{tStatus("active")}</option>
          <option value="SUSPENDED">{tStatus("suspended")}</option>
          <option value="EXPIRED">{tStatus("expired")}</option>
        </Select>
        <Button type="submit" variant="secondary">
          <Pending label={t("apply")} pendingLabel="…" />
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
  const t = useTranslations("admin");
  const tStatus = useTranslations("status");
  const [state, formAction] = useActionState(updateUserRoleAction, null);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="userId" value={userId} />
        <Select name="role" defaultValue={current} className="text-sm">
          <option value="MEMBER">{tStatus("member")}</option>
          <option value="COACH">{tStatus("coach")}</option>
          <option value="ADMIN">{tStatus("admin")}</option>
        </Select>
        <Button type="submit" variant="secondary">
          <Pending label={t("apply")} pendingLabel="…" />
        </Button>
      </form>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
    </div>
  );
}
