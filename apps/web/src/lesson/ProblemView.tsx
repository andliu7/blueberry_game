/**
 * One authored problem on screen, in whichever of the five answer kinds it is.
 *
 * The curriculum package already separates the authored AnswerSpec from the
 * student's AnswerState, so this component's only job is to turn touches into
 * an AnswerState and hand it up. It never grades: the lesson does, through
 * gradeAttempt, so grading stays in one place and this stays a view.
 *
 * The five kinds, and what each renders:
 *   multiple_choice  a list of pressable options
 *   major_product    the candidate products, then the reasons (a two part pick)
 *   numeric          a text field and a unit field
 *   reagents         one or more reagent fields, ordered when the spec is a sequence
 *   structure        handed to the trainer; this shell cannot draw a structure yet
 *
 * The structure kind is the honest gap: the interaction package has a
 * structure draft and chem-core can compare constitutions, but a structure
 * EDITOR on this canvas is Ketcher territory (docs/INHERITED-DECISIONS.md D2)
 * and that route is lazy by budget. Until it exists, a structure problem says
 * so and lets the student skip without penalty.
 */

import { useState } from "react";
import type { AnswerState, Problem } from "@blueberry/curriculum";
import { Press } from "../app/ui/Press";

export interface ProblemViewProps {
  readonly problem: Problem;
  /** True once graded; the inputs lock so the feedback refers to a fixed answer. */
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
  readonly onSkip: () => void;
}

export function ProblemView({ problem, locked, onSubmit, onSkip }: ProblemViewProps) {
  const answer = problem.answer;
  switch (answer.kind) {
    case "multiple_choice":
      return (
        <OptionList
          options={answer.options}
          locked={locked}
          onPick={(optionId) => onSubmit({ kind: "multiple_choice", optionId })}
        />
      );
    case "major_product":
      return <MajorProduct candidates={answer.candidates} reasons={answer.reasons} locked={locked} onSubmit={onSubmit} />;
    case "numeric":
      return <NumericInput unitHint={answer.unit} locked={locked} onSubmit={onSubmit} />;
    case "reagents":
      return (
        <ReagentsInput stepCount={answer.mode === "sequence" ? answer.steps.length : 1} sequence={answer.mode === "sequence"} locked={locked} onSubmit={onSubmit} />
      );
    case "structure":
      return (
        <div className="rounded-2xl border border-dashed border-border p-4 text-scale-sm text-muted-foreground">
          <p>
            This one asks you to draw a structure. The drawing canvas for structures arrives with
            the editor route; for now this question is skipped without counting against you.
          </p>
          <Press variant="secondary" className="mt-3" onPointerDown={onSkip} disabled={locked}>
            Skip this one
          </Press>
        </div>
      );
    case "ordering":
    case "matching":
      // The ordering and matching answer kinds arrived with the beats work
      // (apps/web/src/beats/), which carries its own runners for them. Until
      // the lesson player is wired to those runners, this problem is skipped
      // without counting, the same contract as the structure kind above.
      return (
        <div className="rounded-2xl border border-dashed border-border p-4 text-scale-sm text-muted-foreground">
          <p>
            This one is a {answer.kind === "ordering" ? "put-in-order" : "matching"} question. Its
            board lives in the beats runner and is not wired into lessons yet, so it is skipped
            without counting against you.
          </p>
          <Press variant="secondary" className="mt-3" onPointerDown={onSkip} disabled={locked}>
            Skip this one
          </Press>
        </div>
      );
    default: {
      const unreachable: never = answer;
      return <>{unreachable}</>;
    }
  }
}

function OptionList({
  options,
  locked,
  onPick,
}: {
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-2" role="list">
      {options.map((option, index) => {
        const active = picked === option.id;
        return (
          <li key={option.id}>
            <button
              type="button"
              disabled={locked}
              aria-pressed={active}
              onPointerDown={() => {
                if (locked) return;
                setPicked(option.id);
              }}
              onClick={() => {
                if (locked) return;
                onPick(option.id);
              }}
              className={`press flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left text-scale-base ${
                active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground"
              } disabled:opacity-70`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-scale-xs font-bold text-muted-foreground">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MajorProduct({
  candidates,
  reasons,
  locked,
  onSubmit,
}: {
  readonly candidates: readonly { readonly id: string; readonly text: string }[];
  readonly reasons: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [candidateId, setCandidate] = useState<string | null>(null);
  const [reasonId, setReason] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-scale-sm font-semibold text-muted-foreground">Which product wins?</h3>
        <OptionList options={candidates} locked={locked} onPick={setCandidate} />
      </div>
      {candidateId !== null ? (
        <div className="fade-in">
          <h3 className="mb-2 text-scale-sm font-semibold text-muted-foreground">And why?</h3>
          <OptionList options={reasons} locked={locked} onPick={setReason} />
        </div>
      ) : null}
      <Press
        disabled={locked || candidateId === null || reasonId === null}
        onPointerDown={() => {
          if (candidateId === null) return;
          onSubmit({ kind: "major_product", candidateId, reasonId });
        }}
      >
        Check
      </Press>
    </div>
  );
}

function NumericInput({
  unitHint,
  locked,
  onSubmit,
}: {
  readonly unitHint: string | null;
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [text, setText] = useState("");
  const [unit, setUnit] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked || text.trim() === "") return;
        onSubmit({ kind: "numeric", text: text.trim(), unit: unit.trim() === "" ? null : unit.trim() });
      }}
    >
      {/* A PLACEHOLDER IS NOT A LABEL, and the S3 capture is why this changed.
          "Value, with the right number of sig figs" and "unit, e.g. atm" were
          both wider than the boxes that held them, so the two fields shipped
          reading "Value, with the ri" and "unit, e.g." on a phone: a hint the
          student cannot finish reading teaches nothing and looks unfinished.
          The hints are one caption under the row now, where they have the full
          width, and the placeholders are short enough to fit at 390px. */}
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={text}
          disabled={locked}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="Value"
          aria-label="Numeric answer"
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-input bg-card px-4 text-scale-base font-mono"
        />
        <input
          value={unit}
          disabled={locked}
          onChange={(event) => setUnit(event.currentTarget.value)}
          placeholder={unitHint === null ? "Unit" : unitHint}
          aria-label="Unit"
          className="min-h-12 w-24 shrink-0 rounded-xl border-2 border-input bg-card px-3 text-scale-base font-mono"
        />
      </div>
      <p className="text-scale-xs text-muted-foreground">
        {unitHint === null
          ? "Sig figs count here, so keep the ones the question gives you."
          : `Sig figs count here, so keep the ones the question gives you. The unit goes in the second box, ${unitHint} for this one.`}
      </p>
      <button type="submit" disabled={locked || text.trim() === ""} className="press min-h-11 rounded-2xl border-2 border-[color:var(--primary-edge)] bg-primary px-5 font-semibold text-primary-foreground disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">
        Check
      </button>
    </form>
  );
}

function ReagentsInput({
  stepCount,
  sequence,
  locked,
  onSubmit,
}: {
  readonly stepCount: number;
  readonly sequence: boolean;
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [steps, setSteps] = useState<string[]>(() => Array.from({ length: stepCount }, () => ""));
  const complete = steps.every((step) => step.trim() !== "");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked || !complete) return;
        onSubmit({
          kind: "reagents",
          steps: steps.map((step) => ({
            reagents: step
              .split(/[,+]/)
              .map((reagent) => reagent.trim())
              .filter((reagent) => reagent !== ""),
          })),
        });
      }}
    >
      <p className="text-scale-xs text-muted-foreground">
        {sequence ? "In order. " : ""}Separate reagents in one step with commas.
      </p>
      {steps.map((step, index) => (
        <label key={index} className="flex items-center gap-2">
          {sequence ? <span className="w-6 text-scale-sm font-semibold text-muted-foreground">{index + 1}.</span> : null}
          <input
            value={step}
            disabled={locked}
            onChange={(event) => {
              const next = [...steps];
              next[index] = event.currentTarget.value;
              setSteps(next);
            }}
            placeholder="e.g. NaBH4, MeOH"
            aria-label={sequence ? `Step ${index + 1} reagents` : "Reagents"}
            className="min-h-12 flex-1 rounded-xl border border-input bg-card px-4 text-scale-base font-mono"
          />
        </label>
      ))}
      <button type="submit" disabled={locked || !complete} className="press min-h-11 rounded-2xl border-2 border-[color:var(--primary-edge)] bg-primary px-5 font-semibold text-primary-foreground disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">
        Check
      </button>
    </form>
  );
}
