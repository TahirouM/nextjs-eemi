/**
 * Visuels du site public.
 *
 * Les photos sont associées aux données par SLUG, jamais par position dans un
 * tableau : `npm run db:seed` recrée les activités avec de nouveaux ids et
 * dans un ordre qui peut changer. Le slug est la seule clé stable (il est
 * `@unique` en base).
 *
 * Toutes les URLs pointent vers images.unsplash.com, le seul domaine autorisé
 * dans `next.config.ts`. Les paramètres `w` et `q` bornent l'image SOURCE que
 * Next.js télécharge avant de l'optimiser : sans eux, il irait chercher
 * l'original (plusieurs mégaoctets) pour le redimensionner ensuite.
 */

function unsplash(id: string, width: number) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`;
}

/**
 * Une activité dont le slug n'est pas connu ici retombe sur ce visuel plutôt
 * que sur un trou dans la grille : le seed peut ajouter une discipline sans
 * casser la page d'accueil.
 */
const FALLBACK = unsplash("1701272873248-ee041b51b02b", 1000);

/** Visuel par slug d'activité — voir `prisma/seed.ts`. */
const ACTIVITY_IMAGES: Record<string, string> = {
  "yoga-vinyasa": unsplash("1588286840104-8957b019727f", 1000),
  "escalade-bloc": unsplash("1775655111255-706378cdf2ca", 1000),
  hiit: unsplash("1517130038641-a774d04afb3c", 1000),
  "natation-technique": unsplash("1782573174941-431fad74a9dc", 1000),
  "boxe-loisir": unsplash("1636581563711-cd454f1bf99a", 1000),
  pilates: unsplash("1747239069226-55382c570116", 1000),
};

export function activityImage(slug: string) {
  return ACTIVITY_IMAGES[slug] ?? FALLBACK;
}

/**
 * Visuel par slug de salle. Chaque salle est montrée par son équipement le
 * plus caractéristique : le mur d'escalade à Bastille, le bassin à Nation, le
 * parquet du gymnase à Montreuil.
 */
const SITE_IMAGES: Record<string, string> = {
  "paris-bastille": unsplash("1730659071194-4c833ac5da4e", 800),
  "paris-nation": unsplash("1558658862-77693bcc4e97", 800),
  montreuil: unsplash("1609513677385-5d2b049d9431", 800),
};

export function siteImage(slug: string) {
  return SITE_IMAGES[slug] ?? FALLBACK;
}

/**
 * Photo du héros : un gymnase vide, parquet et lumière latérale. Deux raisons
 * de ce choix — c'est la référence visuelle du système (le parquet et les
 * lignes peintes au sol), et le sujet n'occupe pas le centre, donc le texte
 * posé par-dessus reste lisible.
 */
export const HERO_IMAGE = unsplash("1701272873248-ee041b51b02b", 1920);

/**
 * Section « Comment ça se passe » : un coach qui parle à son groupe. C'est le
 * moment que décrit la troisième étape (« le coach valide votre présence »),
 * plutôt qu'une vue d'équipement, qui ne montrerait pas l'encadrement.
 */
export const HOW_IMAGE = unsplash("1772206605293-3fadeaa944e1", 900);

/**
 * Page des tarifs : un cours collectif en salle. La page parle d'adhésion —
 * elle doit montrer ce à quoi l'adhésion donne accès, pas un visuel abstrait
 * de prix.
 */
export const PRICING_IMAGE = unsplash("1517130038641-a774d04afb3c", 1600);
