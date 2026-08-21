/**
 * The flat berry. Imported from the sibling repo's blueberry-mark.tsx per
 * docs/INHERITED-DECISIONS.md D4: the mascot is imported, never rebuilt.
 *
 * Two edits from the original, both mechanical: the `cn` helper is replaced by
 * string concatenation because this app does not carry clsx, and the `loved`
 * hearts variant is dropped because nothing in this shell presses the mark.
 * The art, the gradient ids, and the mood CSS contract (`.bb-eyes[data-mood]`
 * in mascot.css) are unchanged so a student sees the same character.
 */

import type { BerryMood } from "./berryMood";

const LOBE =
  "M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z";

export function BlueberryMark({
  className = "",
  eyes = false,
  mood,
}: {
  readonly className?: string;
  readonly eyes?: boolean;
  readonly mood?: BerryMood;
}) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Blueberry" className={`block ${className}`}>
      <defs>
        <radialGradient id="bb-berry" cx="33%" cy="27%" r="84%">
          <stop offset="0%" stopColor="#bdefff" />
          <stop offset="28%" stopColor="#3fa9ff" />
          <stop offset="66%" stopColor="#3d63f5" />
          <stop offset="100%" stopColor="#2b2fb0" />
        </radialGradient>
        <linearGradient id="bb-calyx" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#4a6cff" />
          <stop offset="100%" stopColor="#2a2496" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="34" r="23" fill="url(#bb-berry)" />
      <ellipse cx="19" cy="26" rx="6" ry="4.1" fill="#ffffff" opacity="0.26" transform="rotate(-30 19 26)" />

      <g fill="url(#bb-calyx)" transform="translate(32 15.5) scale(1 0.62)">
        <path d={LOBE} />
        <path d={LOBE} transform="rotate(72)" />
        <path d={LOBE} transform="rotate(144)" />
        <path d={LOBE} transform="rotate(216)" />
        <path d={LOBE} transform="rotate(288)" />
        <circle r="3.6" fill="#241f7a" />
      </g>

      {eyes ? (
        <g className="bb-eyes" data-mood={mood}>
          <g className="bb-blush" fill="#fb7185">
            <ellipse cx="19.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
            <ellipse cx="44.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
          </g>
          <g className="bb-eye-open">
            <ellipse cx="23.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
            <ellipse cx="40.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
            <ellipse cx="22.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
            <ellipse cx="39.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
          </g>
          <g className="bb-eye-kind" fill="none" stroke="#0b0b14" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19.2 34.6 Q23.5 29.5 27.8 34.6" />
            <path d="M36.2 34.6 Q40.5 29.5 44.8 34.6" />
          </g>
          <path
            className="bb-smile"
            d="M26.5 42.4 Q32 46.2 37.5 42.4"
            fill="none"
            stroke="#0b0b14"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      ) : null}
    </svg>
  );
}
