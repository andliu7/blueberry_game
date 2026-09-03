/**
 * The guidebook page: the concept surface behind the node sheet's hamburger.
 *
 * Reference: blueberry_r5-guidebook_1788286119.png. The format is locked by
 * docs/DESIGN-GOALS.md: a text-and-image explainer, a key-idea callout card,
 * and a numbered worked-example strip; body text in the neutral content face
 * (no .title-face on anything a student reads as content). The draft text in
 * the reference image is model gibberish; the layout is what binds.
 *
 * THE COPY IS PLACEHOLDER, and the page says so. Every GuidebookContent this
 * phase can produce carries placeholder:true (see guidebookContent.ts), and a
 * placeholder page renders the gate-mark pill so a draft can never pass as a
 * reviewed lesson. When authored copy lands after the human gate, the flag
 * flips in data and the pill leaves with it; nothing here changes.
 *
 * The figures are deliberately abstract line art (a ring, an arrow, shapes),
 * not a drawn mechanism: a specific mechanism drawing in a generic component
 * would be wrong chemistry on most of the 192 nodes it renders for.
 */

import { Berry } from "../mascot/Berry";
import type { GuidebookContent, StepGlyph } from "./guidebookContent";
import "./pathway-sheet.css";

/** Pointer-down-first activation, same contract as the sheet's buttons. */
function pressHandlers(act: () => void) {
  return {
    onPointerDown: () => act(),
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      act();
    },
  };
}

function BackGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BadgeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 8.5l5-3 5 3v6l-5 3-5-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7" cy="8.5" r="2" fill="currentColor" />
      <circle cx="17" cy="14.5" r="2" fill="currentColor" />
    </svg>
  );
}

/** A hexagon ring at (cx, cy): the one structure glyph every node shares. */
function ringPoints(cx: number, cy: number, r: number): string {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * The explainer figure: structure, arrow, abstract outcome shapes, echoing
 * the reference's schematic card. Colour goes through tokens only, and every
 * shape is decoration inside one labelled figure, never a lone mark.
 */
function ExplainerFigure() {
  return (
    <svg viewBox="0 0 200 90" role="img" aria-label="Schematic: a starting structure transforms into products">
      <polygon points={ringPoints(42, 45, 24)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 45h34m0 0l-8-6m8 6l-8 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="138" cy="34" r="11" fill="var(--chip-face)" stroke="currentColor" strokeWidth="2" />
      <rect x="158" y="26" width="26" height="15" rx="4" fill="var(--tab-active)" stroke="currentColor" strokeWidth="2" />
      <polygon points="146,68 162,42 178,68" fill="var(--secondary)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The worked-example strip's art: one glyph per step with arrows between,
 * numbered to match the captions below it. Wide art scrolls in its own box.
 */
function StripArt({ glyphs }: { readonly glyphs: readonly StepGlyph[] }) {
  const stepWidth = 96;
  const width = glyphs.length * stepWidth + 24;
  return (
    <svg viewBox={`0 0 ${width} 84`} aria-hidden>
      {glyphs.map((glyph, i) => {
        // Every step shares the ring; "arrows" adds the push in progress and
        // "product" adds the landed substituent. "substrate" is the bare ring.
        const cx = 44 + i * stepWidth;
        return (
          <g key={i}>
            <text x={cx - 26} y={16} fontSize="12" fontWeight="700" fill="currentColor">
              {i + 1}.
            </text>
            <polygon points={ringPoints(cx, 50, 20)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            {glyph === "arrows" ? (
              <path
                d={`M${cx + 14} 30c12 -8 22 0 18 12m0 0l1 -7m-1 7l-7 -2`}
                fill="none"
                stroke="var(--primary-ink)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : null}
            {glyph === "product" ? <circle cx={cx + 17} cy={33} r={7} fill="var(--chip-face)" stroke="currentColor" strokeWidth="2" /> : null}
            {i < glyphs.length - 1 ? (
              <path
                d={`M${cx + 30} 50h${stepWidth - 62}m0 0l-7 -5m7 5l-7 5`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export interface GuidebookProps {
  readonly content: GuidebookContent;
  readonly onBack: () => void;
  readonly reducedMotion: boolean;
}

export function Guidebook({ content, onBack, reducedMotion }: GuidebookProps) {
  const glyphs = content.workedExample.steps.map((step) => step.glyph);
  return (
    <article className="gb-page" data-placeholder-copy={content.placeholder ? "human-gate" : undefined} aria-label={`Guidebook: ${content.title}`}>
      <button type="button" className="gb-back press" aria-label="Back" {...pressHandlers(onBack)}>
        <BackGlyph />
      </button>

      <header className="gb-head">
        <h1 className="text-scale-2xl font-bold leading-tight">{content.title}</h1>
        <span className="gb-badge text-scale-xs">
          <BadgeGlyph />
          {content.badge}
        </span>
      </header>

      {content.placeholder ? <p className="gb-draft text-scale-xs">{content.gateMark}</p> : null}

      <p className="gb-intro text-scale-base">{content.intro}</p>

      <div className="gb-figrow">
        <figure className="gb-figure">
          <ExplainerFigure />
        </figure>
        <aside className="gb-callout" aria-label="Key idea">
          <p className="gb-callout__cap text-scale-xs">Key idea</p>
          <p className="gb-callout__body text-scale-sm">{content.keyIdea}</p>
        </aside>
      </div>

      <h2 className="gb-worked title-face text-scale-lg font-bold">
        <Berry mood="focused" reducedMotion={reducedMotion} sizePx={28} />
        {content.workedExample.heading}
      </h2>

      <section className="gb-strip" aria-label={content.workedExample.heading}>
        <div className="gb-strip__art">
          <StripArt glyphs={glyphs} />
        </div>
        <ol className="gb-steps text-scale-sm">
          {content.workedExample.steps.map((step) => (
            <li key={step.n}>
              <span className="gb-steps__n text-scale-xs" aria-hidden>
                {step.n}
              </span>
              {step.caption}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
