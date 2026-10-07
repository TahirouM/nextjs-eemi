/**
 * Build sans base de données — utilisé par l'image Docker.
 *
 * Un seul endroit interroge PostgreSQL pendant `next build` : le sitemap,
 * pré-rendu. Sur Vercel la base est joignable au build, c'est sans
 * conséquence.
 *
 * Dans `docker build`, il n'y a pas de base. Et il ne doit pas y en avoir :
 * une image est un artefact indépendant de l'environnement, construite une
 * fois puis lancée contre n'importe quelle base avec `DATABASE_URL` fourni au
 * RUN. Le Dockerfile pose donc `BUILD_WITHOUT_DB=1`, et le sitemap devient
 * dynamique : il est lu en base à chaque requête au lieu d'être figé au build.
 *
 * Seules des variables lues ici, jamais de secret : `BUILD_WITHOUT_DB` n'est
 * qu'un interrupteur.
 */
export const buildWithoutDb = process.env.BUILD_WITHOUT_DB === "1";
