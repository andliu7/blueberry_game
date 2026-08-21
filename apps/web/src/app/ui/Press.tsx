/**
 * The one button. Every control in the shell is this or is styled like it.
 *
 * The press contract in CLAUDE.md: the pressed state renders on pointer down,
 * before any work happens. The `.press` class in theme.css does that through
 * `:active`, which the browser paints the same frame the pointer lands, with
 * no JavaScript in the path. `busy` continues the acknowledgement as a loading
 * affordance when the action takes time, so nothing ever waits silently.
 *
 * The minimum size is 44 by 44, the hit target floor in the Budgets table.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "reward";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm",
  secondary: "border border-border bg-card text-foreground shadow-sm",
  ghost: "bg-transparent text-foreground",
  reward: "bg-gradient-to-r from-accent-from to-accent-to text-white shadow-md",
};

export interface PressProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  /** The action is running. The button stays pressed-looking and says so. */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

export function Press({
  variant = "primary",
  busy = false,
  className = "",
  children,
  disabled,
  ...rest
}: PressProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`press inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[9px] px-5 text-scale-base font-semibold disabled:opacity-60 ${VARIANT_CLASS[variant]} ${busy ? "is-busy" : ""} ${className}`}
    >
      {busy ? <span className="busy-dot" aria-hidden /> : null}
      {children}
    </button>
  );
}
