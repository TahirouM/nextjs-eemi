import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * Accès aux données. Deux régimes de cache assumés :
 *
 * 1. DONNÉES PARTAGÉES ET STABLES (sites, activités) -> `unstable_cache` avec
 *    un tag, EN PRODUCTION UNIQUEMENT (voir `cachedCatalog` plus bas). Elles
 *    sont identiques pour tous les visiteurs et changent rarement : les mettre
 *    en cache évite de retaper Postgres à chaque visite de la home. Les Server
 *    Actions admin appellent `updateTag` pour les invalider.
 *
 * 2. DONNÉES PROPRES À L'UTILISATEUR (réservations, planning) -> AUCUN cache.
 *    Les mettre en cache global mélangerait les données entre utilisateurs.
 *    Elles sont relues à chaque requête, et `revalidatePath` rafraîchit l'écran
 *    après une mutation.
 */

export const CACHE_TAGS = {
  sites: "sites",
  activities: "activities",
} as const;

const IS_PROD = process.env.NODE_ENV === "production";

/** Durée de vie du cache catalogue en production : ces données bougent peu. */
const CATALOG_TTL = 3600;

/**
 * Applique le cache UNIQUEMENT en production.
 *
 * Pourquoi pas en développement : `npm run db:seed` recrée les sites et les
 * activités avec de NOUVEAUX identifiants. Un cache, même de quelques
 * secondes, continue à servir les anciens ids aux listes déroulantes ; le
 * formulaire renvoie alors « Site inconnu » ou « Activité inconnue » alors que
 * l'utilisateur n'a rien fait de mal. Le gain de performance est nul en local,
 * le coût en confusion est réel — donc on lit directement la base.
 *
 * Le comportement de production reste testable via `npm run build && npm start`.
 */
function cachedCatalog<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  tags: string[],
): (...args: A) => Promise<R> {
  if (!IS_PROD) return fn;
  return unstable_cache(fn, keyParts, { tags, revalidate: CATALOG_TTL });
}

/** Sites du club — cache taggé, invalidé quand un admin modifie un site. */
export const getSites = cachedCatalog(
  async () =>
    prisma.site.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        nfcTagId: true,
      },
    }),
  ["sites-list"],
  [CACHE_TAGS.sites],
);

/** Catalogue d'activités — même logique, c'est du contenu quasi statique. */
export const getActivities = cachedCatalog(
  async () =>
    prisma.activity.findMany({
      orderBy: { name: "asc" },
      include: { site: { select: { id: true, name: true, city: true, slug: true } } },
    }),
  ["activities-list"],
  [CACHE_TAGS.activities],
);

export const getActivityBySlug = cachedCatalog(
  async (slug: string) =>
    prisma.activity.findUnique({
      where: { slug },
      include: { site: true },
    }),
  ["activity-by-slug"],
  [CACHE_TAGS.activities],
);

/** Statistiques publiques affichées sur la home. */
export const getPublicStats = cachedCatalog(
  async () => {
    const [sites, activities, upcoming] = await Promise.all([
      prisma.site.count(),
      prisma.activity.count(),
      prisma.session.count({
        where: { startsAt: { gte: new Date() }, status: "SCHEDULED" },
      }),
    ]);
    return { sites, activities, upcoming };
  },
  ["public-stats"],
  [CACHE_TAGS.sites, CACHE_TAGS.activities],
);

/* ------------------------------------------------------------------------ */
/*  À partir d'ici : données utilisateur, jamais mises en cache globalement.  */
/* ------------------------------------------------------------------------ */

export type SessionFilters = {
  siteId?: string;
  activityId?: string;
  from?: Date;
  page?: number;
  perPage?: number;
};

/** Planning filtrable + paginé. Le filtrage se fait en SQL, pas en mémoire. */
export async function getUpcomingSessions(filters: SessionFilters = {}) {
  const perPage = filters.perPage ?? 8;
  const page = Math.max(1, filters.page ?? 1);

  const where = {
    status: "SCHEDULED" as const,
    startsAt: { gte: filters.from ?? new Date() },
    ...(filters.siteId ? { siteId: filters.siteId } : {}),
    ...(filters.activityId ? { activityId: filters.activityId } : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        activity: { select: { id: true, name: true, slug: true, level: true } },
        site: { select: { id: true, name: true, city: true } },
        coach: { select: { firstName: true, lastName: true } },
        _count: {
          // Les places occupées ignorent les réservations annulées.
          select: { bookings: { where: { status: { not: "CANCELLED" } } } },
        },
      },
    }),
    prisma.session.count({ where }),
  ]);

  return {
    sessions,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getSessionDetail(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      activity: true,
      site: true,
      coach: { select: { firstName: true, lastName: true } },
      _count: {
        select: { bookings: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });
}

export async function getUserBooking(userId: string, sessionId: string) {
  return prisma.booking.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
}

export async function getUserBookings(
  userId: string,
  scope: "upcoming" | "past" | "all" = "all",
) {
  const now = new Date();
  return prisma.booking.findMany({
    where: {
      userId,
      ...(scope === "upcoming"
        ? { session: { startsAt: { gte: now } }, status: { not: "CANCELLED" } }
        : {}),
      ...(scope === "past" ? { session: { startsAt: { lt: now } } } : {}),
    },
    orderBy: { session: { startsAt: scope === "past" ? "desc" : "asc" } },
    include: {
      session: {
        include: {
          activity: { select: { name: true, slug: true } },
          site: { select: { name: true, city: true } },
          coach: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

/** Chiffres du tableau de bord membre. */
export async function getMemberStats(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [upcoming, attended, thisMonth, membership] = await Promise.all([
    prisma.booking.count({
      where: {
        userId,
        status: { in: ["BOOKED", "CONFIRMED"] },
        session: { startsAt: { gte: now } },
      },
    }),
    prisma.booking.count({ where: { userId, status: "ATTENDED" } }),
    prisma.booking.count({
      where: {
        userId,
        status: "ATTENDED",
        session: { startsAt: { gte: monthStart } },
      },
    }),
    prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { upcoming, attended, thisMonth, membership };
}

/* ------------------------------- Admin ---------------------------------- */

export async function getAdminStats() {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);

  const [members, activeMemberships, upcomingSessions, weekBookings, noShows] =
    await Promise.all([
      prisma.user.count(),
      prisma.membership.count({ where: { status: "ACTIVE" } }),
      prisma.session.count({
        where: { startsAt: { gte: now }, status: "SCHEDULED" },
      }),
      prisma.booking.count({
        where: {
          status: { not: "CANCELLED" },
          session: { startsAt: { gte: now, lte: weekAhead } },
        },
      }),
      prisma.booking.count({ where: { status: "NO_SHOW" } }),
    ]);

  return { members, activeMemberships, upcomingSessions, weekBookings, noShows };
}

export async function getAdminMembers(query?: string, page = 1, perPage = 10) {
  const where = query
    ? {
        OR: [
          { firstName: { contains: query, mode: "insensitive" as const } },
          { lastName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        onboarded: true,
        createdAt: true,
        preferredSite: { select: { name: true } },
        memberships: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: { bookings: { where: { status: { not: "CANCELLED" } } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getAdminSessions(page = 1, perPage = 10) {
  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        activity: { select: { name: true } },
        site: { select: { name: true } },
        coach: { select: { firstName: true, lastName: true } },
        _count: {
          select: { bookings: { where: { status: { not: "CANCELLED" } } } },
        },
      },
    }),
    prisma.session.count(),
  ]);

  return {
    sessions,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getAdminSessionDetail(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      activity: true,
      site: true,
      coach: { select: { id: true, firstName: true, lastName: true } },
      bookings: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });
}

export async function getCoaches() {
  return prisma.user.findMany({
    where: { role: { in: ["COACH", "ADMIN"] } },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });
}
