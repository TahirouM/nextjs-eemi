import type { BookingStatus, MembershipStatus, SessionStatus } from "@prisma/client";

/**
 * Formatage centralisé. Le fuseau est forcé sur Europe/Paris pour que le rendu
 * serveur et le rendu client produisent exactement la même chaîne : sinon React
 * signale une erreur d'hydratation dès que la machine n'est pas sur ce fuseau.
 */

const TZ = "Europe/Paris";

/**
 * Les dates suivent la langue affichée : « mardi 15 septembre » en français,
 * « Tuesday, 15 September » en anglais. `Intl` s'en charge — on ne code jamais
 * un format de date à la main.
 *
 * Le fuseau reste forcé sur Europe/Paris : les séances ont lieu à Paris, quelle
 * que soit la langue ou le lieu depuis lequel on consulte le planning. Cela
 * garantit aussi que le rendu serveur et le rendu client produisent la même
 * chaîne, sans erreur d'hydratation.
 */
type Lang = "fr" | "en";

function tag(locale: Lang = "fr") {
  return locale === "en" ? "en-GB" : "fr-FR";
}

export function formatDate(date: Date, locale: Lang = "fr") {
  return new Intl.DateTimeFormat(tag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(date);
}

export function formatShortDate(date: Date, locale: Lang = "fr") {
  return new Intl.DateTimeFormat(tag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

export function formatTime(date: Date, locale: Lang = "fr") {
  return new Intl.DateTimeFormat(tag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);
}

/** Valeur pour un <input type="datetime-local">. */
export function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const bookingStatusKey: Record<BookingStatus, string> = {
  BOOKED: "booked",
  CONFIRMED: "confirmed",
  ATTENDED: "attended",
  NO_SHOW: "noShow",
  CANCELLED: "cancelled",
};

export const bookingStatusTone: Record<
  BookingStatus,
  "neutral" | "accent" | "go" | "warn" | "stop" | "court"
> = {
  BOOKED: "accent",
  CONFIRMED: "accent",
  ATTENDED: "go",
  NO_SHOW: "warn",
  CANCELLED: "neutral",
};

export const membershipStatusKey: Record<MembershipStatus, string> = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  EXPIRED: "expired",
};

export const membershipStatusTone: Record<
  MembershipStatus,
  "neutral" | "accent" | "go" | "warn" | "stop" | "court"
> = {
  PENDING: "warn",
  ACTIVE: "go",
  SUSPENDED: "stop",
  EXPIRED: "neutral",
};

export const sessionStatusKey: Record<SessionStatus, string> = {
  SCHEDULED: "scheduled",
  CANCELLED: "cancelled",
  DONE: "done",
};

export const roleKey: Record<string, string> = {
  MEMBER: "member",
  COACH: "coach",
  ADMIN: "admin",
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
