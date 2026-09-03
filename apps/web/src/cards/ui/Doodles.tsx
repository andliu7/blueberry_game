/**
 * The deck tiles' structure doodles: four tiny line-art molecules, drawn in
 * currentColor so they take whatever ink the tile gives them. They are
 * DECORATION, not chemistry: no doodle is generated from a deck's contents,
 * none claims to depict a specific compound, and every one is aria-hidden.
 * The reference landing draws a different sketch per tile so the grid reads
 * as a shelf of different things; `doodleFor` in landing.ts picks which one
 * a deck gets, stably, so a tile keeps its face across visits.
 *
 * Drawn by hand here rather than through MoleculeSvg because MoleculeSvg
 * renders a real MechanismStep, and inventing a fake step per deck to feed it
 * would be more code in service of less honesty.
 */

const STROKE = 1.6;

/** A benzene ring with a methyl stub. */
function Ring() {
  return (
    <>
      <polygon points="24,7 38,15 38,31 24,39 10,31 10,15" />
      <circle cx="24" cy="23" r="8.5" />
      <path d="M38 15 L47 10" />
    </>
  );
}

/** A carboxylic acid on a short zigzag. */
function Acid() {
  return (
    <>
      <path d="M6 34 L15 26 L24 34 L33 26" />
      <path d="M33 26 L33 14" />
      <path d="M36.5 26 L36.5 16" />
      <path d="M33 26 L43 31" />
      <text x="44" y="35" fontSize="9" stroke="none" fill="currentColor">
        OH
      </text>
    </>
  );
}

/** A ketone beside a small ring. */
function Ketone() {
  return (
    <>
      <polygon points="14,18 24,12 34,18 34,30 24,36 14,30" />
      <path d="M34 18 L44 13" />
      <path d="M44 13 L44 4" />
      <path d="M47 13 L47 6" />
    </>
  );
}

/** An alkene zigzag with a bromine label, the fan card's own sketch. */
function Alkene() {
  return (
    <>
      <path d="M5 32 L14 24 L23 32 L32 24 L41 32" />
      <path d="M15.5 27.5 L22 33.5" />
      <path d="M32 24 L32 13" />
      <text x="27" y="10" fontSize="9" stroke="none" fill="currentColor">
        Br
      </text>
    </>
  );
}

const DOODLES = [Ring, Acid, Ketone, Alkene] as const;

export interface DeckDoodleProps {
  /** From landing.ts's doodleFor. Wrapped defensively, never trusted blindly. */
  readonly variant: number;
  readonly className?: string;
}

export function DeckDoodle({ variant, className = "h-10 w-12" }: DeckDoodleProps) {
  const Doodle = DOODLES[((variant % DOODLES.length) + DOODLES.length) % DOODLES.length] ?? Ring;
  return (
    <svg
      viewBox="0 0 52 44"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <Doodle />
    </svg>
  );
}

/** The auto marker: a lightning bolt in a warm chip. See landing.ts markers. */
export function AutoBolt({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-[color:var(--warn-ink-strong)] bg-[color:var(--warn-soft-solid)] ${className}`}
    >
      <svg viewBox="0 0 12 14" className="h-3 w-3" fill="var(--warn-ink-strong)" stroke="none">
        <path d="M7 0 L1 8 H5 L4.4 14 L11 5.5 H6.6 Z" />
      </svg>
    </span>
  );
}
