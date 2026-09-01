/**
 * The short form video slot inside a lesson, per the content pipeline rules in
 * CLAUDE.md: never autoplaying with sound, always skippable, transcript stored
 * with the video, and the lesson stands without it.
 *
 * Today no video exists, so this renders the slot with the real chrome and
 * says "Template" on its face, the same honesty the sibling repo's
 * lesson-video.tsx practises: a convincing placeholder that is not marked as
 * one is a trap for whoever opens the page next. When a clip lands, `src`
 * becomes a real URL and the <video> element below takes over: `muted` by
 * default, `controls` on, no `autoplay` attribute, ever.
 */

import { useState } from "react";

export interface LessonVideoProps {
  readonly title: string;
  readonly src?: string;
  readonly transcript?: string;
  readonly onSkip: () => void;
}

export function LessonVideo({ title, src, transcript, onSkip }: LessonVideoProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-foreground/90">
        {src !== undefined ? (
          <video src={src} controls muted playsInline preload="metadata" className="h-full w-full" aria-label={title}>
            {transcript !== undefined ? <track kind="captions" label="Transcript" /> : null}
          </video>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-background">
            <span className="rounded-full border border-background/40 px-3 py-1 text-scale-xs font-semibold uppercase tracking-wide">
              Template
            </span>
            <p className="text-scale-base font-semibold">{title}</p>
            <p className="text-scale-xs opacity-80">About one minute, one concept, from Kai. Not filmed yet.</p>
          </div>
        )}
        <button
          type="button"
          onPointerDown={onSkip}
          className="press absolute right-3 top-3 min-h-11 rounded-full border-2 border-border bg-card px-4 text-scale-sm font-semibold text-foreground"
        >
          Skip video
        </button>
      </div>
      <figcaption className="flex items-center justify-between text-scale-xs text-muted-foreground">
        <span>{title}</span>
        <button type="button" className="press min-h-11 px-2 font-semibold text-primary" onPointerDown={() => setShowTranscript((s) => !s)}>
          {showTranscript ? "Hide transcript" : "Transcript"}
        </button>
      </figcaption>
      {showTranscript ? (
        <p className="rounded-xl bg-muted p-3 text-scale-sm text-muted-foreground">
          {transcript ?? "The transcript is stored with the video and arrives with it."}
        </p>
      ) : null}
    </figure>
  );
}
