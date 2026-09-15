import Link from "next/link";

/**
 * Pagination rendue côté serveur : ce sont de simples liens `<a>`.
 * Aucun JavaScript nécessaire, et chaque page a sa propre URL partageable.
 */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    search.set("page", String(target));
    return `${basePath}?${search.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-4"
    >
      <p className="text-sm text-ink-soft">
        Page {page} sur {pageCount} · {total} résultat{total > 1 ? "s" : ""}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-sunk"
          >
            Précédent
          </Link>
        ) : (
          <span className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm text-ink-soft opacity-50">
            Précédent
          </span>
        )}

        {page < pageCount ? (
          <Link
            href={hrefFor(page + 1)}
            className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-sunk"
          >
            Suivant
          </Link>
        ) : (
          <span className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm text-ink-soft opacity-50">
            Suivant
          </span>
        )}
      </div>
    </nav>
  );
}
