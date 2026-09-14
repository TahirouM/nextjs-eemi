"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui";

/**
 * Filtres du planning.
 *
 * L'état des filtres vit dans l'URL (`?siteId=…&activityId=…`), pas dans un
 * useState : le filtre est ainsi partageable, gardé au rafraîchissement et
 * restauré par le bouton Retour. C'est le serveur qui refiltre la liste en SQL,
 * ce composant ne fait que réécrire l'URL.
 *
 * `useTransition` garde l'ancienne liste visible et lisible pendant que la
 * nouvelle se charge, au lieu de vider l'écran à chaque changement.
 */
export function SessionFilters({
  sites,
  activities,
}: {
  sites: Array<{ id: string; name: string; city: string }>;
  activities: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Tout changement de filtre renvoie à la page 1 : rester page 3 sur un
    // résultat qui n'a plus que 2 pages afficherait une liste vide.
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className="mb-6 grid gap-3 sm:grid-cols-2"
      data-pending={isPending ? "" : undefined}
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <div>
        <label htmlFor="filter-site" className="mb-1 block text-sm font-medium">
          Salle
        </label>
        <Select
          id="filter-site"
          value={searchParams.get("siteId") ?? ""}
          onChange={(e) => update("siteId", e.target.value)}
        >
          <option value="">Toutes les salles</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} — {site.city}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="filter-activity" className="mb-1 block text-sm font-medium">
          Discipline
        </label>
        <Select
          id="filter-activity"
          value={searchParams.get("activityId") ?? ""}
          onChange={(e) => update("activityId", e.target.value)}
        >
          <option value="">Toutes les disciplines</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
