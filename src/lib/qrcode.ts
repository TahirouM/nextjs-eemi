/**
 * Encodeur QR Code — implémentation locale, sans dépendance.
 *
 * ## Pourquoi pas une librairie npm
 *
 * Le besoin est étroit et figé : transformer un identifiant de borne
 * (`nfc-bastille-entree`, une vingtaine de caractères ASCII) en une matrice de
 * modules noirs et blancs, rendue en SVG par un Server Component. Pas de
 * canvas, pas de logo incrusté, pas de rendu client.
 *
 * Une librairie apporterait ici un paquet, sa chaîne de dépendances et sa
 * surface de mise à jour pour environ 200 lignes réellement utilisées. Le code
 * ci-dessous est autonome, s'exécute uniquement au build/rendu serveur, et
 * n'envoie aucun JavaScript au navigateur — le SVG part déjà dessiné.
 *
 * ## Périmètre assumé
 *
 * - mode OCTET (byte) uniquement : couvre tout l'ASCII, donc tous les
 *   identifiants de borne, sans coder les modes numérique/alphanumérique qui
 *   ne servaient qu'à gagner quelques versions ;
 * - versions 1 à 10 (jusqu'à 57 chiffres/lettres en correction Q) : très
 *   au-delà de la longueur d'un identifiant de borne ;
 * - niveau de correction d'erreur paramétrable, Q par défaut (25 % de la
 *   surface restaurable). C'est le bon compromis pour une affiche plastifiée
 *   posée à l'entrée d'une salle : elle prend la poussière, les traces de
 *   doigts et les reflets.
 *
 * Si un jour un contenu plus long doit être encodé (une URL signée, par
 * exemple), il suffit d'étendre les tables `VERSIONS` et `ALIGNMENT_PATTERNS`.
 * Le reste de l'algorithme ne bouge pas.
 *
 * Référence : ISO/IEC 18004. Les tables reproduites ici (polynômes
 * générateurs, blocs de correction, motifs d'alignement) viennent de cette
 * norme ; elles sont figées et ne se déduisent pas, d'où leur présence en dur.
 */

/** Niveau de correction d'erreur, du plus léger au plus robuste. */
export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

/**
 * Pour chaque version (taille), et pour chaque niveau de correction :
 * `[ nombre d'octets de correction par bloc, nombre de blocs groupe 1,
 *    nombre de blocs groupe 2 ]`.
 *
 * Les blocs du groupe 2 contiennent exactement un octet de données de plus que
 * ceux du groupe 1 — c'est ainsi que la norme répartit un nombre d'octets qui
 * ne tombe pas juste.
 */
const VERSIONS: Record<
  number,
  Record<ErrorCorrectionLevel, [number, number, number]>
> = {
  1: { L: [7, 1, 0], M: [10, 1, 0], Q: [13, 1, 0], H: [17, 1, 0] },
  2: { L: [10, 1, 0], M: [16, 1, 0], Q: [22, 1, 0], H: [28, 1, 0] },
  3: { L: [15, 1, 0], M: [26, 1, 0], Q: [18, 2, 0], H: [22, 2, 0] },
  4: { L: [20, 1, 0], M: [18, 2, 0], Q: [26, 2, 0], H: [16, 4, 0] },
  5: { L: [26, 1, 0], M: [24, 2, 0], Q: [18, 2, 2], H: [22, 2, 2] },
  6: { L: [18, 2, 0], M: [16, 4, 0], Q: [24, 4, 0], H: [28, 4, 0] },
  7: { L: [20, 2, 0], M: [18, 4, 0], Q: [18, 2, 4], H: [26, 4, 1] },
  8: { L: [24, 2, 0], M: [22, 2, 2], Q: [22, 4, 2], H: [26, 4, 2] },
  9: { L: [30, 2, 0], M: [22, 3, 2], Q: [20, 4, 4], H: [24, 4, 4] },
  10: { L: [18, 2, 2], M: [26, 4, 1], Q: [24, 6, 2], H: [28, 6, 2] },
};

/**
 * Nombre total d'octets (données + correction) disponibles par version.
 * Se déduirait de la taille de la matrice, mais la norme le tabule : on la
 * suit plutôt que de recalculer une valeur normative.
 */
const TOTAL_CODEWORDS: Record<number, number> = {
  1: 26,
  2: 44,
  3: 70,
  4: 100,
  5: 134,
  6: 172,
  7: 196,
  8: 242,
  9: 292,
  10: 346,
};

/**
 * Centres des motifs d'alignement, par version. Ces petits carrés 5×5 aident
 * le décodeur à corriger la déformation de perspective quand le QR est
 * photographié de biais — cas normal pour une affiche murale scannée à bout de
 * bras.
 */
const ALIGNMENT_PATTERNS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

/** Champ de Galois GF(256) : tables d'exponentielles et de logarithmes. */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    // Multiplication par 2 dans GF(256), modulo le polynôme 0x11d.
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  // Duplication : évite un modulo à chaque multiplication.
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Polynôme générateur de Reed-Solomon pour `degree` octets de correction. */
function generatorPolynomial(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= gfMultiply(poly[j], 1);
      next[j + 1] ^= gfMultiply(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/**
 * Octets de correction d'erreur d'un bloc : reste de la division polynomiale
 * des données par le polynôme générateur.
 */
function errorCorrectionBytes(data: number[], ecCount: number): number[] {
  const generator = generatorPolynomial(ecCount);
  const remainder = [...data, ...new Array<number>(ecCount).fill(0)];

  for (let i = 0; i < data.length; i += 1) {
    const factor = remainder[i];
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      remainder[i + j] ^= gfMultiply(generator[j], factor);
    }
  }

  return remainder.slice(data.length);
}

/** Écriture bit à bit dans un tableau d'octets. */
class BitBuffer {
  private bits: number[] = [];

  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  get length() {
    return this.bits.length;
  }

  /** Complète par des zéros jusqu'à l'octet plein, puis renvoie les octets. */
  toBytes(): number[] {
    const padded = [...this.bits];
    while (padded.length % 8 !== 0) padded.push(0);

    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) byte = (byte << 1) | padded[i + j];
      bytes.push(byte);
    }
    return bytes;
  }
}

/**
 * Plus petite version capable de contenir `byteLength` octets au niveau de
 * correction demandé. On prend toujours la plus petite : plus la matrice est
 * grossière, plus le QR reste lisible imprimé petit et photographié de loin.
 */
function chooseVersion(
  byteLength: number,
  level: ErrorCorrectionLevel,
): number {
  for (let version = 1; version <= 10; version += 1) {
    const [ecPerBlock, group1, group2] = VERSIONS[version][level];
    const blocks = group1 + group2;
    const dataCapacity = TOTAL_CODEWORDS[version] - ecPerBlock * blocks;

    // 4 bits d'indicateur de mode + l'indicateur de longueur (8 bits en mode
    // octet jusqu'à la version 9, 16 bits ensuite).
    const headerBits = 4 + (version < 10 ? 8 : 16);
    if (byteLength * 8 + headerBits <= dataCapacity * 8) return version;
  }

  throw new Error(
    `Contenu trop long pour un QR code de version 10 (${byteLength} octets).`,
  );
}

/**
 * Sérialise le contenu : en-tête, données, remplissage, puis découpage en
 * blocs entrelacés avec leurs octets de correction.
 *
 * L'entrelacement (un octet de chaque bloc à tour de rôle) est ce qui rend le
 * QR résistant aux dégâts localisés : une rayure détruit un fragment de
 * chaque bloc plutôt qu'un bloc entier, et chaque bloc reste réparable.
 */
function encodeData(
  content: string,
  version: number,
  level: ErrorCorrectionLevel,
): number[] {
  const bytes = Array.from(new TextEncoder().encode(content));
  const [ecPerBlock, group1Count, group2Count] = VERSIONS[version][level];
  const blockCount = group1Count + group2Count;
  const dataCapacity = TOTAL_CODEWORDS[version] - ecPerBlock * blockCount;

  const buffer = new BitBuffer();
  buffer.put(0b0100, 4); // Indicateur de mode : octet.
  buffer.put(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) buffer.put(byte, 8);

  // Terminateur : jusqu'à 4 bits à zéro, tronqué si la capacité est atteinte.
  const terminator = Math.min(4, dataCapacity * 8 - buffer.length);
  if (terminator > 0) buffer.put(0, terminator);

  const data = buffer.toBytes();
  // Remplissage normatif : alternance 0xEC / 0x11 jusqu'à saturation.
  const PAD = [0xec, 0x11];
  while (data.length < dataCapacity) data.push(PAD[data.length % 2]);

  // Répartition en blocs : ceux du groupe 2 portent un octet de plus.
  const group1Size = Math.floor(dataCapacity / blockCount);
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];

  let offset = 0;
  for (let i = 0; i < blockCount; i += 1) {
    const size = i < group1Count ? group1Size : group1Size + 1;
    const block = data.slice(offset, offset + size);
    offset += size;
    dataBlocks.push(block);
    ecBlocks.push(errorCorrectionBytes(block, ecPerBlock));
  }

  const result: number[] = [];
  const maxDataLength = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of ecBlocks) result.push(block[i]);
  }

  return result;
}

/** Matrice de modules : `true` = module noir. `null` = pas encore écrit. */
type Matrix = (boolean | null)[][];

/** Carré de repérage 7×7 posé dans trois coins : c'est ce que l'appareil photo cherche en premier. */
function placeFinderPattern(matrix: Matrix, row: number, col: number) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || y >= matrix.length || x < 0 || x >= matrix.length) continue;

      const onOuterRing = r === 0 || r === 6 || c === 0 || c === 6;
      const inInnerBlock = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[y][x] = onOuterRing || inInnerBlock;
    }
  }
}

function placeAlignmentPatterns(matrix: Matrix, version: number) {
  const centers = ALIGNMENT_PATTERNS[version];
  const size = matrix.length;

  for (const row of centers) {
    for (const col of centers) {
      // Les trois coins portent déjà un motif de repérage : on n'écrase pas.
      const nearFinder =
        (row <= 8 && col <= 8) ||
        (row <= 8 && col >= size - 9) ||
        (row >= size - 9 && col <= 8);
      if (nearFinder) continue;

      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          matrix[row + r][col + c] =
            Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        }
      }
    }
  }
}

/** Lignes pointillées reliant les motifs de repérage : donnent l'échelle au décodeur. */
function placeTimingPatterns(matrix: Matrix) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = dark;
    if (matrix[i][6] === null) matrix[i][6] = dark;
  }
}

/** Réserve les cases de l'information de format, écrites après le masquage. */
function reserveFormatAreas(matrix: Matrix) {
  const size = matrix.length;
  for (let i = 0; i < 9; i += 1) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = 0; i < 8; i += 1) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }
  // Module toujours noir, imposé par la norme.
  matrix[size - 8][8] = true;
}

/** Les huit masques normatifs. Le meilleur est choisi par pénalité. */
const MASKS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * Pénalité d'un masque selon les quatre règles de la norme. Plus le score est
 * bas, plus le motif est « désordonné » — donc facile à décoder, car aucune
 * zone ne ressemble par accident à un motif de repérage.
 */
function maskPenalty(matrix: boolean[][]): number {
  const size = matrix.length;
  let penalty = 0;

  // Règle 1 : suites de 5 modules identiques ou plus, en ligne et en colonne.
  for (let i = 0; i < size; i += 1) {
    for (const readRow of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        const current = readRow ? matrix[i][j] : matrix[j][i];
        const previous = readRow ? matrix[i][j - 1] : matrix[j - 1][i];
        if (current === previous) {
          run += 1;
        } else {
          if (run >= 5) penalty += run - 2;
          run = 1;
        }
      }
      if (run >= 5) penalty += run - 2;
    }
  }

  // Règle 2 : blocs 2×2 d'une seule couleur.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Règle 3 : séquence 1:1:3:1:1 imitant un motif de repérage.
  const pattern = [true, false, true, true, true, false, true];
  const quiet = [false, false, false, false];
  const matches = (cells: boolean[], start: number, seq: boolean[]) =>
    seq.every((v, k) => cells[start + k] === v);

  for (let i = 0; i < size; i += 1) {
    const row = matrix[i];
    const col = matrix.map((line) => line[i]);
    for (const cells of [row, col]) {
      for (let j = 0; j <= size - 7; j += 1) {
        if (!matches(cells, j, pattern)) continue;
        const before = j >= 4 && matches(cells, j - 4, quiet);
        const after = j + 11 <= size && matches(cells, j + 7, quiet);
        if (before || after) penalty += 40;
      }
    }
  }

  // Règle 4 : écart au 50 % de modules noirs.
  const dark = matrix.flat().filter(Boolean).length;
  const ratio = (dark * 100) / (size * size);
  penalty += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return penalty;
}

/** Bits d'information de format : niveau de correction + masque, protégés par BCH(15,5). */
function formatBits(level: ErrorCorrectionLevel, mask: number): number {
  const levelBits: Record<ErrorCorrectionLevel, number> = {
    L: 0b01,
    M: 0b00,
    Q: 0b11,
    H: 0b10,
  };

  const data = (levelBits[level] << 3) | mask;
  let bch = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((bch >> i) & 1) bch ^= 0b10100110111 << (i - 10);
  }
  // XOR normatif : garantit qu'un format valide n'est jamais entièrement nul.
  return ((data << 10) | bch) ^ 0b101010000010010;
}

function placeFormatInformation(
  matrix: boolean[][],
  level: ErrorCorrectionLevel,
  mask: number,
) {
  const bits = formatBits(level, mask);
  const size = matrix.length;

  /**
   * `i` numérote les bits dans l'ordre de LECTURE de la norme : `i = 0` désigne
   * le bit de POIDS FORT des 15 bits de format, `i = 14` le poids faible.
   *
   * L'inversion est facile à commettre et coûteuse à diagnostiquer : un format
   * écrit à l'envers produit une matrice d'apparence parfaitement normale —
   * motifs de repérage, cadencement et densité tous corrects — que plus aucun
   * décodeur n'accepte, puisqu'il y lit un mauvais niveau de correction et un
   * mauvais numéro de masque. Rien ne se voit à l'œil nu ; seul un décodage
   * réel le révèle. C'est `tests/qrcode.mjs` qui garde cette convention.
   */
  const bit = (i: number) => ((bits >> (14 - i)) & 1) === 1;

  // Première copie, autour du motif de repérage haut-gauche.
  for (let i = 0; i <= 5; i += 1) matrix[8][i] = bit(i);
  matrix[8][7] = bit(6);
  matrix[8][8] = bit(7);
  matrix[7][8] = bit(8);
  for (let i = 9; i <= 14; i += 1) matrix[14 - i][8] = bit(i);

  // Seconde copie, répartie sur les deux autres coins : une seule copie
  // illisible (pliure, reflet) ne doit pas rendre le QR indécodable.
  for (let i = 0; i <= 7; i += 1) matrix[size - 1 - i][8] = bit(i);
  for (let i = 8; i <= 14; i += 1) matrix[8][size - 15 + i] = bit(i);
}

/**
 * Construit la matrice complète d'un contenu.
 *
 * Renvoie un tableau de lignes de booléens (`true` = noir), sans marge : la
 * zone de silence est ajoutée au rendu, où l'on connaît l'unité de dessin.
 */
export function encodeQrMatrix(
  content: string,
  level: ErrorCorrectionLevel = "Q",
): boolean[][] {
  if (content.length === 0) {
    throw new Error("Contenu vide : rien à encoder.");
  }

  const byteLength = new TextEncoder().encode(content).length;
  const version = chooseVersion(byteLength, level);
  const size = version * 4 + 17;

  const matrix: Matrix = Array.from({ length: size }, () =>
    new Array<boolean | null>(size).fill(null),
  );

  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, 0, size - 7);
  placeFinderPattern(matrix, size - 7, 0);
  placeAlignmentPatterns(matrix, version);
  placeTimingPatterns(matrix);

  // Snapshot AVANT réservation du format : ces cases ne sont pas des données,
  // mais elles ne doivent pas non plus être masquées.
  const isFunction = matrix.map((row) => row.map((cell) => cell !== null));
  reserveFormatAreas(matrix);
  const isReserved = matrix.map((row) => row.map((cell) => cell !== null));

  // Parcours en zigzag : colonnes par paires, de droite à gauche, en
  // alternant le sens vertical. La colonne 6 (timing) est sautée.
  const codewords = encodeData(content, version, level);
  let bitIndex = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;

    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;

      for (const offset of [0, 1]) {
        const x = col - offset;
        if (isReserved[row][x]) continue;

        const byte = codewords[bitIndex >> 3];
        // Les octets de remplissage manquants valent 0 : la norme autorise
        // quelques bits résiduels en fin de matrice.
        const bit = byte === undefined ? false : ((byte >> (7 - (bitIndex % 8))) & 1) === 1;
        matrix[row][x] = bit;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  // Les huit masques sont évalués, le moins pénalisé est retenu.
  let best: boolean[][] | null = null;
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < MASKS.length; mask += 1) {
    const candidate = matrix.map((row, r) =>
      row.map((cell, c) => {
        const value = cell ?? false;
        // Seuls les modules de DONNÉES sont masqués.
        return isFunction[r][c] || isReserved[r][c]
          ? value
          : value !== MASKS[mask](r, c);
      }),
    );

    placeFormatInformation(candidate, level, mask);
    const penalty = maskPenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      best = candidate;
    }
  }

  // `best` est nécessairement défini : la boucle tourne au moins une fois.
  const chosen = best as boolean[][];
  placeFormatInformation(chosen, level, bestMask);
  return chosen;
}

/**
 * Rend un contenu en SVG autonome.
 *
 * Choix de rendu :
 *   - un seul `<path>` plutôt qu'un `<rect>` par module : sur une version 3,
 *     cela fait passer le markup d'environ 800 éléments à un seul, ce qui
 *     compte quand la page affiche une affiche par salle ;
 *   - `shape-rendering="crispEdges"` : sans lui, l'anticrénelage grise le bord
 *     des modules et dégrade la lecture à petite taille ;
 *   - zone de silence de 4 modules, imposée par la norme : sans elle, un
 *     décodeur peut ne pas isoler le code de ce qui l'entoure ;
 *   - pas d'attribut `width`/`height` : seul `viewBox` est posé, donc le SVG
 *     s'adapte à son conteneur CSS, écran comme impression.
 */
export function renderQrSvg(
  content: string,
  options: { level?: ErrorCorrectionLevel; quietZone?: number } = {},
): string {
  const { level = "Q", quietZone = 4 } = options;
  const matrix = encodeQrMatrix(content, level);
  const size = matrix.length;
  const total = size + quietZone * 2;

  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (!matrix[row][col]) {
        col += 1;
        continue;
      }
      // Les modules noirs consécutifs sont fusionnés en un seul segment.
      let run = 1;
      while (col + run < size && matrix[row][col + run]) run += 1;
      parts.push(`M${col + quietZone} ${row + quietZone}h${run}v1h-${run}z`);
      col += run;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"`,
    ` shape-rendering="crispEdges" role="img">`,
    `<rect width="${total}" height="${total}" fill="#ffffff"/>`,
    `<path d="${parts.join("")}" fill="#000000"/>`,
    `</svg>`,
  ].join("");
}
