/**
 * What a graded attempt says back. Every result explains itself, correct ones
 * included, per the feedback section of CLAUDE.md.
 *
 * The tier decides the source of the copy, never the tone:
 *   correct             the problem's authored solution
 *   matched_distractor  Tier 2, the authored explanation for that exact mistake
 *   named_cause         Tier 1, the curriculum cause registry's copy
 *   unmatched_wrong     Tier 3, logged; here it says so and offers the chat tab
 *   indeterminate       the shell sent something the checker could not read
 *
 * Colour: --good for correct, the soft purple card for everything else. There
 * is no red on this screen. The student is learning, not being marked down.
 */

import { curriculumCause, type GradingResult } from "@blueberry/curriculum";
import { hrefForTab } from "../app/routes";

function Explain({ what, why, next }: { readonly what: string; readonly why: string; readonly next: string }) {
  return (
    <dl className="mt-2 flex flex-col gap-2 text-scale-sm">
      <div>
        <dt className="font-semibold text-foreground">What happened</dt>
        <dd className="text-muted-foreground">{what}</dd>
      </div>
      <div>
        <dt className="font-semibold text-foreground">Why</dt>
        <dd className="text-muted-foreground">{why}</dd>
      </div>
      <div>
        <dt className="font-semibold text-foreground">Look at</dt>
        <dd className="text-muted-foreground">{next}</dd>
      </div>
    </dl>
  );
}

export function Feedback({ result }: { readonly result: GradingResult }) {
  switch (result.kind) {
    case "correct":
      return (
        <section className="fade-in rounded-2xl border border-good/40 bg-good-soft p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-good-ink">That is it.</h3>
          <Explain what={result.explanation.whatHappened} why={result.explanation.why} next={result.explanation.lookAt} />
        </section>
      );
    case "matched_distractor":
      return (
        <section className="fade-in rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">Not yet, and this is a common road.</h3>
          <Explain what={result.explanation.whatHappened} why={result.explanation.why} next={result.explanation.lookAt} />
        </section>
      );
    case "named_cause": {
      // The registry's `summary` is engine facing by contract (causes.ts says
      // never shown to a student), so the card leads with `teaches`, which is
      // the idea to check, and the checker's detail, which names the value.
      // Authored student copy per curriculum cause is an open item in STATUS.
      const cause = curriculumCause(result.cause);
      return (
        <section className="fade-in rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">Close, and there is one idea to check.</h3>
          <p className="mt-2 text-scale-sm text-muted-foreground">{cause.teaches}</p>
          {result.detail !== "" ? <p className="mt-2 text-scale-xs text-muted-foreground">{result.detail}</p> : null}
        </section>
      );
    }
    case "unmatched_wrong":
      return (
        <section className="fade-in rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">Not the answer, and not one we anticipated.</h3>
          <p className="mt-2 text-scale-sm text-muted-foreground">
            That is useful: it means this exact answer needs its own explanation written, and it
            has been logged so one gets authored. Until then,{" "}
            <a href={hrefForTab("chat")} className="font-semibold text-primary underline">
              ask Blueberry
            </a>{" "}
            about it, or look at the solution below.
          </p>
        </section>
      );
    case "indeterminate":
      return (
        <section className="fade-in rounded-2xl border border-border bg-muted p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">We could not read that answer.</h3>
          <p className="mt-2 text-scale-sm text-muted-foreground">{result.detail}</p>
        </section>
      );
    default: {
      const unreachable: never = result;
      return <>{unreachable}</>;
    }
  }
}
