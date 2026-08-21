import type { HTMLAttributes, ReactNode } from "react";

/** The house card: white on the cream ground, 12px radius, hairline border. */
export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }) {
  return (
    <div
      {...rest}
      className={`rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** A small pill of text. Used for difficulty, course, and answer kind labels. */
export function Pill({ children, tone = "muted" }: { readonly children: ReactNode; readonly tone?: "muted" | "primary" | "good" }) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "good"
        ? "bg-[color:var(--good-soft)] text-[color:var(--good)]"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-scale-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
