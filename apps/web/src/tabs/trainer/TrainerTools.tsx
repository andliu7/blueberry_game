/**
 * The trainer's tool button and its three tools. Owner spec, 2026-08-26: "a
 * toggleable button (like 3 dots or a plus that becomes an X)" opening
 * (1) scratchpaper that dims the screen, drawable but sealed off from the
 * canvas below, (2) the periodic table as a quick-reference popup card,
 * (3) a 3D model of where you are at.
 *
 * The scratchpad is a plain <canvas> under pointer events: strokes are ink,
 * nothing else, cleared by its own button. The overlay is a real barrier by
 * construction, a fixed element over everything, so "can't really interact
 * with anything until you close out of it" is a property of the DOM order
 * rather than a discipline. Escape closes every tool; the periodic card and
 * the 3D card are native <dialog>-shaped popups sharing one frame.
 */

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { MechanismStep } from "@blueberry/chem-core";
import type { StepScene } from "../../render/layout/stepScene";

const PeriodicTab = lazy(() => import("../periodic/PeriodicTab"));
const Scene3D = lazy(() => import("../../render/three/Scene3D"));

type Tool = "scratchpad" | "periodic" | "three" | null;

export function TrainerTools({ step, scene, progress, reducedMotion }: { readonly step: MechanismStep; readonly scene: StepScene; readonly progress: number; readonly reducedMotion: boolean }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTool(null);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (next: Tool) => {
    setTool(next);
    setOpen(false);
  };

  return (
    <>
      {/* The plus that becomes an X, bottom right of the canvas card. */}
      <div className="absolute bottom-4 right-4 flex flex-col-reverse items-end gap-2">
        <button
          type="button"
          className="press flex min-h-12 min-w-12 items-center justify-center rounded-full border border-border bg-card text-scale-xl shadow-md"
          aria-expanded={open}
          aria-label={open ? "Close tools" : "Open tools"}
          onPointerDown={() => setOpen((prev) => !prev)}
        >
          <span
            className="inline-block font-semibold text-foreground"
            style={{ transform: open ? "rotate(45deg)" : "none", transition: reducedMotion ? "none" : "transform 140ms ease-out" }}
          >
            +
          </span>
        </button>
        {open ? (
          <div className="fade-in flex flex-col items-end gap-2">
            <ToolButton label="Scratchpaper" onPick={() => pick("scratchpad")} />
            <ToolButton label="Periodic table" onPick={() => pick("periodic")} />
            <ToolButton label="3D view" onPick={() => pick("three")} />
          </div>
        ) : null}
      </div>

      {tool === "scratchpad" ? <Scratchpad onClose={() => setTool(null)} /> : null}
      {tool === "periodic" ? (
        <ToolCard title="Periodic table" onClose={() => setTool(null)}>
          <Suspense fallback={<p className="p-6 text-scale-sm text-muted-foreground">Loading the table…</p>}>
            <PeriodicTab selected={null} />
          </Suspense>
        </ToolCard>
      ) : null}
      {tool === "three" ? (
        <ToolCard title="Where you are, in 3D" onClose={() => setTool(null)}>
          <div className="h-80">
            <Suspense fallback={<p className="p-6 text-scale-sm text-muted-foreground">Loading the model…</p>}>
              <Scene3D step={step} scene={scene} progress={progress} reducedMotion={reducedMotion} />
            </Suspense>
          </div>
        </ToolCard>
      ) : null}
    </>
  );
}

function ToolButton({ label, onPick }: { readonly label: string; readonly onPick: () => void }) {
  return (
    <button type="button" className="press min-h-11 rounded-full border border-border bg-card px-4 text-scale-sm font-semibold text-foreground shadow-md" onPointerDown={onPick}>
      {label}
    </button>
  );
}

/** One frame for the popup tools: card centred over a dimmed page. */
function ToolCard({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title} onPointerDown={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-background p-4 shadow-lg" onPointerDown={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-scale-lg font-semibold text-foreground">{title}</h3>
          <button type="button" className="press min-h-11 min-w-11 rounded-full border border-border bg-card font-semibold" aria-label="Close" onPointerDown={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * The scratchpaper: the screen dims, strokes are the only interaction, and
 * the work is gone when it closes, like real scratch paper leaving the exam
 * hall. Resolution matches devicePixelRatio so pen strokes stay sharp.
 */
function Scratchpad({ onClose }: { readonly onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * scale;
    canvas.height = canvas.clientHeight * scale;
    const context = canvas.getContext("2d");
    if (context !== null) {
      context.scale(scale, scale);
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#f5f4f1";
    }
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60" role="dialog" aria-modal="true" aria-label="Scratchpaper">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const p = point(event);
          drawing.current = { id: event.pointerId, ...p };
        }}
        onPointerMove={(event) => {
          const state = drawing.current;
          if (state === null || state.id !== event.pointerId) return;
          const context = event.currentTarget.getContext("2d");
          if (context === null) return;
          const p = point(event);
          context.beginPath();
          context.moveTo(state.x, state.y);
          context.lineTo(p.x, p.y);
          context.stroke();
          drawing.current = { id: state.id, ...p };
        }}
        onPointerUp={() => {
          drawing.current = null;
        }}
      />
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          className="press min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-scale-sm font-semibold text-white"
          onPointerDown={(event) => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
            event.stopPropagation();
          }}
        >
          Clear
        </button>
        <button type="button" className="press min-h-11 rounded-full border border-white/30 bg-white/10 px-4 text-scale-sm font-semibold text-white" aria-label="Close scratchpaper" onPointerDown={onClose}>
          Close ×
        </button>
      </div>
    </div>
  );
}
