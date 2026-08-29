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
      // primary-ink, not primary: --primary is a surface colour with white on
      // it, and as ink on a card it measured 3.63:1 in dark against a 4.5
      // floor. The split into --primary and --primary-ink exists for exactly
      // this, and DESIGN-TOKENS.md records why.
      ? "bg-primary/10 text-primary-ink"
      : tone === "good"
        ? "bg-[color:var(--good-soft)] text-[color:var(--good)]"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-scale-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
