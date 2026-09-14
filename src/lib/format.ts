import type { BookingStatus, MembershipStatus, SessionStatus } from "@prisma/client";

/**
 * Formatage centralisé. Le fuseau est forcé sur Europe/Paris pour que le rendu
 * serveur et le rendu client produisent exactement la même chaîne : sinon React
 * signale une erreur d'hydratation dès que la machine n'est pas sur ce fuseau.
 */

const TZ = "Europe/Paris";

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(date);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

export function formatDateTime(date: Date) {
  return `${formatDate(date)} à ${formatTime(date)}`;
}

/** Valeur pour un <input type="datetime-local">. */
export function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  BOOKED: "Réservée",
  CONFIRMED: "Confirmée",
  ATTENDED: "Présent",
  NO_SHOW: "Absent",
  CANCELLED: "Annulée",
};

export const bookingStatusTone: Record<
  BookingStatus,
  "neutral" | "accent" | "success" | "warning" | "danger"
> = {
  BOOKED: "accent",
  CONFIRMED: "accent",
  ATTENDED: "success",
  NO_SHOW: "warning",
  CANCELLED: "neutral",
};

export const membershipStatusLabel: Record<MembershipStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  EXPIRED: "Expirée",
};

export const membershipStatusTone: Record<
  MembershipStatus,
  "neutral" | "accent" | "success" | "warning" | "danger"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  EXPIRED: "neutral",
};

export const sessionStatusLabel: Record<SessionStatus, string> = {
  SCHEDULED: "Programmée",
  CANCELLED: "Annulée",
  DONE: "Terminée",
};

export const roleLabel: Record<string, string> = {
  MEMBER: "Membre",
  COACH: "Coach",
  ADMIN: "Administrateur",
};

export const levelLabel: Record<string, string> = {
  all: "Tous niveaux",
  intermediate: "Intermédiaire",
  advanced: "Confirmé",
};

/**
 * Distance à vol d'oiseau (formule de haversine), en km.
 * Utilisée par la page publique "sites" pour classer les salles.
 * C'est exactement le calcul que la future app React Native réutilisera avec
 * la position GPS réelle du téléphone.
 */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
