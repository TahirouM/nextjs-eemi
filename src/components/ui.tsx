import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

/**
 * Primitives d'interface.
 *
 * Parti pris visuel : on s'inspire d'un planning imprimé punaisé dans un hall
 * de gymnase. Conséquences concrètes :
 *   - pas de « carte » flottante partout : des blocs posés, séparés par des
 *     filets nets, et l'ombre réservée aux éléments réellement superposés ;
 *   - le rayon d'arrondi encode la hiérarchie (2px pour les surfaces, 0 pour
 *     les filets, plein rond seulement pour les pastilles d'état) ;
 *   - les chiffres comparables passent en chasse fixe (classe `.nums`).
 *
 * Tous ces composants sont des Server Components : ils ne produisent que du
 * markup, donc zéro JavaScript envoyé au navigateur.
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------------------------------------- Panel --- */

/** Bloc de contenu. `sunk` pour les zones secondaires (rails, encarts). */
export function Panel({
  sunk,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { sunk?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-rule p-5",
        // `glass` porte le flou + l'ombre ; le fond translucide vient du jeton.
        sunk ? "bg-surface-sunk" : "glass",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Titre de bloc. Le filet sous le titre sépare l'en-tête du contenu, comme
 * la ligne d'un tableau de planning.
 */
export function PanelTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------- Button --- */

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-45",
  secondary:
    "border border-rule-strong bg-surface-solid/60 text-ink backdrop-blur-sm hover:bg-surface-solid/90 disabled:opacity-45",
  quiet: "text-ink-soft hover:bg-surface-sunk hover:text-ink disabled:opacity-45",
  danger:
    "border border-stop/45 bg-stop-wash text-stop hover:border-stop disabled:opacity-45",
};

/*
  `transition-colors` et non `transition` : la règle des guidelines interdit
  d'animer « all », qui déclenche des recalculs inutiles sur des propriétés
  qu'on ne voulait pas animer.
*/
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(buttonBase, buttonStyles[variant], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={cx(buttonBase, buttonStyles[variant], className)}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Badge --- */

type BadgeTone = "neutral" | "accent" | "go" | "warn" | "stop" | "court";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunk text-ink-soft border-rule",
  accent: "bg-accent-wash text-accent border-accent/30",
  go: "bg-go-wash text-go border-go/30",
  warn: "bg-warn-wash text-warn border-warn/30",
  stop: "bg-stop-wash text-stop border-stop/30",
  court: "bg-court-wash text-court border-court/30",
};

/**
 * Pastille d'état. La couleur ne porte jamais l'information seule : le texte
 * la nomme toujours, pour rester lisible en cas de daltonisme.
 */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Field --- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {/*
        `role="alert"` + `aria-live` : l'erreur apparaît après coup, un lecteur
        d'écran doit l'annoncer sans que l'utilisateur ait à la chercher.
      */}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex gap-1.5 text-xs font-medium text-stop"
        >
          <span aria-hidden="true">↳</span>
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  "w-full rounded-lg border border-rule-strong bg-surface-solid/70 px-3 py-2 text-sm text-ink outline-none transition-colors duration-150 hover:border-ink-soft focus:border-accent focus:bg-surface-solid";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cx(controlBase, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return <select className={cx(controlBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cx(controlBase, className)} {...props} />;
}

/** La case et son intitulé forment une seule cible cliquable, sans zone morte. */
export function Checkbox({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: string }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-sm py-1 text-sm transition-colors duration-150 hover:text-ink",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-sm border-rule-strong accent-[var(--accent)]"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------ États d'interface --- */

/**
 * Écran vide : on explique la situation ET on propose l'action suivante.
 * Un vide n'est pas une impasse, c'est une invitation à agir.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-rule-strong bg-surface-sunk px-6 py-12 text-center">
      <p className="font-display font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-pretty text-sm text-ink-soft">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Chargement impossible",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stop/35 bg-stop-wash px-6 py-8 text-center">
      <p className="font-display font-semibold text-stop">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-pretty text-sm text-stop/90">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-lg bg-surface-sunk", className)}
      aria-hidden="true"
    />
  );
}

/**
 * En-tête de page. `text-balance` évite qu'un titre se termine par un mot
 * orphelin sur sa propre ligne.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule pb-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-pretty text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Retour d'une Server Action. Annoncé aux lecteurs d'écran à son apparition. */
export function Alert({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cx(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "success"
          ? "border-go/30 bg-go-wash text-go"
          : "border-stop/30 bg-stop-wash text-stop",
      )}
    >
      {children}
    </p>
  );
}

/**
 * Statistique. Le chiffre est l'élément visuel, l'intitulé le suit en petit :
 * c'est l'inverse de l'étiquette en capitales posée au-dessus, qui est le
 * réflexe par défaut.
 */
export function Stat({
  value,
  label,
  detail,
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div className="border-l-2 border-rule pl-4">
      <p className="nums font-display text-3xl font-bold leading-none">
        {value}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{label}</p>
      {detail && <div className="mt-1.5">{detail}</div>}
    </div>
  );
}
