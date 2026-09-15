import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { getActivities, getCoaches, getSites } from "@/lib/queries";
import { Panel, PageHeader } from "@/components/ui";
import { toDateTimeLocal } from "@/lib/format";
import { SessionForm } from "./session-form";

export const metadata: Metadata = {
  title: "Créer une séance",
  robots: { index: false, follow: false },
};

export default async function NewSessionPage() {
  // `requireAdmin` et non `requireStaff` : la création de séance est réservée
  // aux administrateurs, alors que le layout laisse entrer les coachs.
  await requireAdmin();

  const [activities, sites, coaches] = await Promise.all([
    getActivities(),
    getSites(),
    getCoaches(),
  ]);

  // Valeur par défaut : demain 18h, pour ne pas proposer une date déjà passée.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  return (
    <>
      <Link
        href="/admin/sessions"
        className="text-sm text-ink-soft hover:text-ink"
      >
        ← Retour aux séances
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Créer une séance"
          description="La séance sera immédiatement ouverte à la réservation."
        />
      </div>

      <Panel className="max-w-3xl">
        <SessionForm
          activities={activities.map((a) => ({
            id: a.id,
            label: `${a.name} — ${a.site.name}`,
          }))}
          sites={sites.map((s) => ({ id: s.id, label: `${s.name} — ${s.city}` }))}
          coaches={coaches.map((c) => ({
            id: c.id,
            label: `${c.firstName} ${c.lastName}`,
          }))}
          defaultStartsAt={toDateTimeLocal(tomorrow)}
        />
      </Panel>
    </>
  );
}
