/**
 * Tests de l'encodeur QR — `src/lib/qrcode.ts`.
 *
 * Lancement : `npm run test:qr` (aucun serveur ni base de données requis).
 *
 * ## Pourquoi ce test existe
 *
 * L'encodeur est écrit à la main. Une erreur dans une table normative
 * (polynôme générateur, répartition des blocs de correction, motifs
 * d'alignement) produit un QR qui a l'air PARFAITEMENT NORMAL à l'œil nu mais
 * qu'aucun téléphone ne décode. Une relecture visuelle ne peut pas attraper
 * ça ; seul un décodage réel le peut.
 *
 * ## Comment il s'y prend
 *
 * Nos QR sont décodés par une implémentation INDÉPENDANTE — `jsQR`, un
 * décodeur qui ne partage pas une ligne avec notre encodeur. Si nous nous
 * écartons de la norme, il échoue. C'est exactement le verdict qui nous
 * intéresse, puisque c'est un scanner de téléphone qui lira l'affiche.
 *
 * Le SVG est d'abord rendu dans un vrai navigateur (Playwright) puis
 * photographié dans un canvas : on teste donc la chaîne complète — encodage,
 * rendu SVG, rastérisation — et pas seulement la matrice en mémoire.
 *
 * Remarque : le `BarcodeDetector` natif du navigateur aurait été un décodeur
 * encore plus proche du terrain, mais il n'existe pas sur macOS (API limitée à
 * Android, ChromeOS et Windows). `jsQR` donne la même garantie partout.
 */
import { chromium } from "playwright";
import jsQR from "jsqr";

import { renderQrSvg, encodeQrMatrix } from "../src/lib/qrcode.ts";

/**
 * Cas couverts, choisis pour leur valeur de preuve plutôt que pour le nombre :
 * les identifiants réels du club, les quatre niveaux de correction, les bornes
 * de longueur, et les caractères qui déclenchent un encodage multi-octets.
 */
const CASES = [
  { content: "nfc-bastille-entree", level: "Q", why: "identifiant de borne réel" },
  { content: "nfc-republique-entree", level: "Q", why: "seconde salle" },
  { content: "nfc-borne-non-enregistree", level: "Q", why: "cas du tag inconnu" },
  { content: "a", level: "L", why: "contenu minimal, correction la plus légère" },
  { content: "nfc-bastille-entree", level: "L", why: "même contenu, correction L" },
  { content: "nfc-bastille-entree", level: "M", why: "même contenu, correction M" },
  { content: "nfc-bastille-entree", level: "H", why: "même contenu, correction H" },
  {
    content: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    level: "M",
    why: "contenu long : force une version supérieure",
  },
  {
    content: "clubsport://check-in?tag=nfc-bastille-entree",
    level: "Q",
    why: "forme URL, au cas où le contenu évoluerait",
  },
  { content: "séance-café-noël", level: "Q", why: "accents : encodage UTF-8 multi-octets" },
];

const browser = await chromium.launch();
const page = await browser.newPage();

/**
 * Rend le SVG dans la page, le photographie, et renvoie les pixels bruts.
 * `damage` permet d'effacer un rectangle après coup, pour simuler une tache.
 */
async function rasterize(svg, pixels, damage = null) {
  const { data, width, height } = await page.evaluate(
    async ({ svg, pixels, damage }) => {
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      try {
        const img = new Image();
        img.width = pixels;
        img.height = pixels;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("SVG illisible par le navigateur"));
          img.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = pixels;
        canvas.height = pixels;
        const ctx = canvas.getContext("2d");
        // Fond blanc explicite : un canvas neuf est TRANSPARENT, et la
        // transparence se lit en noir — le QR serait alors inversé.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pixels, pixels);
        ctx.drawImage(img, 0, 0, pixels, pixels);

        if (damage) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(damage.x, damage.y, damage.w, damage.h);
        }

        const image = ctx.getImageData(0, 0, pixels, pixels);
        return {
          data: Array.from(image.data),
          width: image.width,
          height: image.height,
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { svg, pixels, damage },
  );

  return { data: Uint8ClampedArray.from(data), width, height };
}

/** Décode une image rastérisée. Renvoie le texte, ou `null` si indécodable. */
async function decode(svg, pixels, damage = null) {
  const { data, width, height } = await rasterize(svg, pixels, damage);
  return jsQR(data, width, height)?.data ?? null;
}

let pass = 0;
let fail = 0;

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name, detail ? `-> ${detail}` : "");
  }
}

console.log("\nDécodage par jsQR (implémentation indépendante)");
for (const { content, level, why } of CASES) {
  let decoded;
  try {
    decoded = await decode(renderQrSvg(content, { level }), 600);
  } catch (error) {
    check(`[${level}] ${why}`, false, error.message);
    continue;
  }
  check(
    `[${level}] ${why}`,
    decoded === content,
    `attendu ${JSON.stringify(content)}, obtenu ${JSON.stringify(decoded)}`,
  );
}

/*
  Lisibilité à petite taille. Une affiche imprimée puis scannée de loin réduit
  le QR à quelques centaines de pixels dans le capteur : réussir à 600 px ne
  prouve pas qu'il passe encore à 160 px. Si ce test tombe, c'est le signe
  qu'une version inutilement grande est choisie pour un contenu court.
*/
console.log("\nLisibilité à petite taille (160 px)");
for (const level of ["L", "M", "Q", "H"]) {
  const content = "nfc-bastille-entree";
  const decoded = await decode(renderQrSvg(content, { level }), 160);
  check(`160 px, correction ${level}`, decoded === content, `obtenu ${JSON.stringify(decoded)}`);
}

/*
  Résistance aux dégâts : c'est la RAISON d'être du niveau de correction, donc
  elle mérite d'être démontrée et pas seulement affirmée. On efface un carré au
  centre — l'équivalent d'une tache ou d'un autocollant sur l'affiche — et on
  vérifie que la correction H rattrape la perte là où L échouerait.
*/
console.log("\nRésistance à une tache centrale");
{
  const content = "nfc-bastille-entree";
  const damage = { x: 250, y: 250, w: 100, h: 100 };
  const decoded = await decode(renderQrSvg(content, { level: "H" }), 600, damage);
  check(
    "correction H : tache de 100 px rattrapée",
    decoded === content,
    `obtenu ${JSON.stringify(decoded)}`,
  );
}

/* Propriétés structurelles, vérifiables sans décodeur. */
console.log("\nStructure de la matrice");
{
  const matrix = encodeQrMatrix("nfc-bastille-entree", "Q");
  const size = matrix.length;

  check("matrice carrée", matrix.every((row) => row.length === size), `taille ${size}`);
  check("taille normative (4n+17)", (size - 17) % 4 === 0 && size >= 21, `taille ${size}`);

  // Les trois motifs de repérage : un carré noir 7×7 à bord plein.
  const finderOk = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ].every(([r, c]) =>
    [0, 6].every((i) => matrix[r + i][c] && matrix[r][c + i] && matrix[r + 6][c + i]),
  );
  check("trois motifs de repérage présents", finderOk);

  check("module noir obligatoire en (taille-8, 8)", matrix[size - 8][8] === true);

  // Un QR quasi entièrement noir ou blanc signalerait un masquage raté.
  const dark = matrix.flat().filter(Boolean).length;
  const ratio = dark / (size * size);
  check(
    "répartition noir/blanc plausible",
    ratio > 0.3 && ratio < 0.7,
    `${(ratio * 100).toFixed(1)} % de modules noirs`,
  );

  // Deux contenus différents doivent donner deux matrices différentes :
  // garde-fou contre un encodage qui ignorerait ses entrées.
  const other = encodeQrMatrix("nfc-republique-entree", "Q");
  check(
    "deux contenus donnent deux matrices distinctes",
    JSON.stringify(matrix) !== JSON.stringify(other),
  );

  // Déterminisme : deux appels identiques doivent produire la même affiche.
  check(
    "encodage déterministe",
    JSON.stringify(encodeQrMatrix("nfc-bastille-entree", "Q")) === JSON.stringify(matrix),
  );
}

/* Cas d'erreur : un contenu impossible doit échouer franchement. */
console.log("\nGestion des erreurs");
{
  let threw = false;
  try {
    renderQrSvg("");
  } catch {
    threw = true;
  }
  check("contenu vide refusé", threw);

  threw = false;
  try {
    renderQrSvg("x".repeat(500), { level: "H" });
  } catch {
    threw = true;
  }
  check("contenu trop long refusé", threw);
}

await browser.close();
console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail === 0 ? 0 : 1);
