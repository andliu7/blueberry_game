/**
 * One card, front and back. Read this header before trusting anything in this
 * file.
 *
 * THE SHAPE IS THE REFERENCE'S SHAPE, and it is worth naming what was taken.
 * docs/reference/competitors/orgosolver-02-flashcard-decks.png, right hand
 * phone: a small grey kind label at the top under a hairline, the structure
 * drawn large in the middle, tag chips, then the question, then a quiet "tap
 * to reveal" line at the bottom right. That layout puts the picture where the
 * eye lands first and the instruction where it is needed last, which is the
 * right order for a card you are trying to answer in your head.
 *
 * WHAT IS OURS AND NOT THEIRS: the third field. A card here carries `why` as
 * well as an answer, so the back TEACHES rather than only confirming. That is
 * the field cards/types.ts exists to protect and it is the reason a card
 * reviewed cold six weeks later still explains itself.
 *
 * ONE ELEMENT, TWO FACES, and this is deliberate. Front and back are the same
 * bordered box with the back's content revealed inside it, not two boxes that
 * swap. A flip animation looks good once and costs a student the answer's
 * position on screen every single time, and the reveal is a moment where they
 * are comparing what they thought against what is written.
 *
 * The whole card is a button when it is unrevealed, so tapping anywhere
 * reveals. `.press` gives the pointer-down acknowledgement in CSS with no
 * JavaScript in the way, which is what CLAUDE.md's under 100 ms contract asks
 * for; the reveal itself then runs on click so a keyboard reaches it too.
 */

import type { Card } from "../types";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import { structureOnCard } from "./cardStructure";

/** The small label above the rule. Says where this card came from. */
function sourceLabel(card: Card): string {
  switch (card.source.kind) {
    case "lesson":
      return "From a lesson";
    case "mistake":
      return "From a miss";
    case "import":
      return card.source.deckName;
    default: {
      const unreachable: never = card.source;
      return unreachable;
    }
  }
}

/** Concept tags, without the machine readable ones the surfaces use. */
function visibleTags(card: Card): readonly string[] {
  return card.tags.filter((tag) => !tag.includes(":")).slice(0, 4);
}

/**
 * The structure block. Fixed height rather than intrinsic, so the question
 * below it sits in the same place on every card and a student's eye does not
 * have to re-find it between cards.
 */
function CardStructureBlock({ card }: { readonly card: Card }) {
  const structure = structureOnCard(card);
  if (structure === null) return null;
  return (
    <div className="h-40 w-full sm:h-48" aria-hidden={false}>
      {/* progress 0 draws the reactants with no arrows. See cardStructure.ts. */}
      <MoleculeSvg step={structure.step} scene={structure.scene} progress={0} reducedMotion={false} />
    </div>
  );
}

export interface CardFaceProps {
  readonly card: Card;
  readonly revealed: boolean;
  readonly onReveal: () => void;
}

export function CardFace({ card, revealed, onReveal }: CardFaceProps) {
  const tags = visibleTags(card);

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <span className="text-scale-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {sourceLabel(card)}
        </span>
      </div>

      <CardStructureBlock card={card} />

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-0.5 text-scale-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-scale-lg font-semibold leading-snug text-card-foreground">{card.front}</p>

      {revealed ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="whitespace-pre-line text-scale-lg font-semibold leading-snug text-[color:var(--good)]">
            {card.back}
          </p>
          {card.why.trim().length > 0 && (
            <p className="whitespace-pre-line text-scale-sm leading-normal text-muted-foreground">{card.why}</p>
          )}
        </div>
      ) : (
        <p className="mt-auto text-right text-scale-sm text-muted-foreground">Tap to reveal the answer</p>
      )}
    </>
  );

  const shell = "flex min-h-[22rem] w-full flex-col gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left";

  if (revealed) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button type="button" className={`press ${shell}`} onClick={onReveal} aria-label="Reveal the answer">
      {body}
    </button>
  );
}
