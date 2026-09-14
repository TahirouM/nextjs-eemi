import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

/**
 * Primitives d'interface partagées. Ce sont des Server Components par défaut
 * (aucun `"use client"`) : ils ne font que produire du markup, donc ils ne
 * coûtent aucun JavaScript au navigateur.
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Card --- */

export function Card({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "rounded-xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------- Button --- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-border bg-surface hover:bg-surface-muted disabled:opacity-50",
  ghost: "hover:bg-surface-muted disabled:opacity-50",
  danger:
    "border border-danger/40 bg-danger-soft text-danger hover:opacity-90 disabled:opacity-50",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed";

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

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
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
  const describedBy = [
    error ? `${htmlFor}-error` : null,
    hint ? `${htmlFor}-hint` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {/* role="alert" : le lecteur d'écran annonce l'erreur dès son apparition. */}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}
      <span hidden data-described-by={describedBy.join(" ")} />
    </div>
  );
}

const controlBase =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent";

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

export function Checkbox({
  label,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded border-border accent-[var(--accent)]"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------ États d'interface --- */

/** Liste vide : on explique ET on propose l'action suivante. */
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
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Une erreur est survenue",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-6 py-8 text-center">
      <p className="font-medium text-danger">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-danger/90">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Squelette de chargement, utilisé par les fichiers loading.tsx. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-lg bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Feedback succès/erreur après une Server Action. */
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
      className={cx(
        "rounded-lg px-3 py-2 text-sm",
        tone === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
      )}
    >
      {children}
    </p>
  );
}
