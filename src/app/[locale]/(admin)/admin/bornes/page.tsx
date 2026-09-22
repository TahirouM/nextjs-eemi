import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderQrSvg } from "@/lib/qrcode";
import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Bornes QR · Administration",
  robots: { index: false, follow: false },
};

/**
 * Générateur d'affiches QR — une par salle du club.
 *
 * ## À quoi ça sert
 *
 * L'application mobile valide la présence en scannant un QR code affiché à
 * l'entrée de la salle. Cette page produit ce QR : le club l'imprime, le
 * plastifie, et le pose à l'accueil. C'est le pendant physique de
 * `POST /api/check-in`.
 *
 * ## Ce que le QR contient
 *
 * Exactement l'identifiant de borne du site (`Site.nfcTagId`), et rien
 * d'autre. Pas d'URL, pas de jeton, pas de donnée personnelle :
 *
 *   - un identifiant de salle n'est pas un secret. Le connaître ne permet
 *     RIEN : le serveur exige en plus une session authentifiée, une
 *     réservation dans cette salle, un créneau ouvert, et une position
 *     cohérente. Photographier l'affiche ne donne donc aucun pouvoir ;
 *   - un contenu court tient dans une petite version de QR, donc des modules
 *     plus gros, donc une lecture plus fiable de loin et de biais — ce qui
 *     compte quand on scanne une affiche murale en arrivant, sac à l'épaule.
 *
 * ## Rendu
 *
 * Le SVG est calculé ICI, sur le serveur, au rendu de la page. Aucun
 * JavaScript de génération n'est envoyé au navigateur, et l'impression ne
 * dépend d'aucun script : un SVG est vectoriel, donc net à n'importe quelle
 * taille de papier.
 */
export default async function AdminBornesPage() {
  const [t, sites] = await Promise.all([
    getTranslations("admin"),
    prisma.site.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        postalCode: true,
        nfcTagId: true,
      },
    }),
  ]);

  // Les pages du groupe (admin) sont déjà protégées par le layout ; on
  // revérifie ici pour que la protection ne dépende pas d'un fichier voisin.
  await requireStaff();

  const withTag = sites.filter(
    (site): site is typeof site & { nfcTagId: string } => site.nfcTagId !== null,
  );
  const withoutTag = sites.filter((site) => site.nfcTagId === null);

  return (
    <>
      <PageHeader
        title={t("qrTitle")}
        description={t("qrDescription")}
        action={<PrintButton label={t("qrPrint")} />}
      />

      {withTag.length === 0 ? (
        <EmptyState title={t("qrNoSite")} description={t("qrNoSiteText")} />
      ) : (
        /*
          Une affiche par salle. À l'écran, deux colonnes sur grand écran ;
          à l'impression, une affiche par page (voir les règles `print:` plus
          bas) — on ne coupe jamais un QR entre deux feuilles.
        */
        <div className="grid gap-6 lg:grid-cols-2 print:block">
          {withTag.map((site) => (
            <BornePoster
              key={site.id}
              site={site}
              labels={{
                instructions: t("qrInstructions"),
                tagLabel: t("qrTagLabel"),
                appName: t("qrAppName"),
              }}
            />
          ))}
        </div>
      )}

      {/*
        Une salle sans identifiant de borne ne peut pas recevoir d'affiche.
        On le signale plutôt que de l'omettre en silence : sinon l'administrateur
        imprime la pile, la pose dans les salles, et découvre le trou seulement
        quand un membre n'arrive pas à pointer.
      */}
      {withoutTag.length > 0 && (
        <Panel sunk className="mt-8 print:hidden">
          <p className="text-sm font-medium">{t("qrMissingTitle")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("qrMissingText")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {withoutTag.map((site) => (
              <li
                key={site.id}
                className="rounded-full border border-rule bg-surface-sunk px-3 py-1 text-xs"
              >
                {site.name}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/**
 * Affiche imprimable d'une salle.
 *
 * Hiérarchie visuelle pensée pour la lecture À DISTANCE, debout dans un hall :
 * le nom de la salle se lit de loin, le QR occupe le centre, la consigne tient
 * en une ligne, et l'identifiant technique est relégué en bas en petit — utile
 * au personnel pour la saisie manuelle de secours, invisible pour le membre.
 */
function BornePoster({
  site,
  labels,
}: {
  site: {
    name: string;
    city: string;
    address: string;
    postalCode: string;
    nfcTagId: string;
  };
  labels: { instructions: string; tagLabel: string; appName: string };
}) {
  /*
    Correction d'erreur Q (25 % de la surface restaurable) : une affiche posée
    dans un hall de gymnase prend la poussière, les traces de doigts et les
    reflets. H corrigerait davantage mais au prix d'une matrice plus dense,
    donc de modules plus petits — ce qui dégrade la lecture de loin, le cas
    d'usage réel ici. Q est le compromis juste.
  */
  const svg = renderQrSvg(site.nfcTagId, { level: "Q" });

  return (
    <article className="break-inside-avoid rounded-xl border border-rule p-6 print:break-after-page print:border-0 print:p-0">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
          {labels.appName}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-balance print:text-4xl">
          {site.name}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {site.address}, {site.postalCode} {site.city}
        </p>
      </header>

      {/*
        Le SVG vient de notre propre encodeur : aucune entrée utilisateur ne
        transite par `dangerouslySetInnerHTML`. Le seul contenu variable est
        `nfcTagId`, qui n'est jamais interpolé dans le markup — il est encodé
        en modules noirs et blancs, puis rendu comme un unique `<path>` dont
        les coordonnées sont des nombres.
      */}
      <div
        className="mx-auto mt-6 aspect-square w-full max-w-[260px] print:max-w-[380px]"
        dangerouslySetInnerHTML={{ __html: svg }}
        role="img"
        aria-label={`${labels.tagLabel} ${site.name}`}
      />

      <footer className="mt-6 text-center">
        <p className="text-pretty text-sm font-medium">{labels.instructions}</p>
        {/*
          `nums` : chasse fixe. C'est un code destiné à être recopié
          caractère par caractère lors d'une saisie manuelle, pas du texte.
        */}
        <p className="nums mt-4 text-xs text-ink-soft">
          {labels.tagLabel} <span className="font-medium">{site.nfcTagId}</span>
        </p>
      </footer>
    </article>
  );
}
