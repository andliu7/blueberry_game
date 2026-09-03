/**
 * The deck tray's logic, with no React in it. Read this header before
 * trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-deck-tray in docs/reference/design-goals:
 * named reaction cards fanned in an arc, each carrying a skeletal structure
 * above its name and its mastery dots below, over a violet tray labelled with
 * the count and the deck's name. This file computes the fan's geometry and the
 * words on it; DeckTray.tsx owns the pixels. Split so a test can ask "is the
 * fan symmetric" without a DOM.
 *
 * THE FAN IS A HAND OF CARDS, and its geometry follows from that reading:
 * slots spread symmetrically around a straight centre, tilting outward and
 * sinking toward the edges, the way fingers hold them.
 *
 * THE HAND FITS THE PHONE BY ARITHMETIC, NOT BY HOPE. fanLayout takes the
 * CONTAINER width, works in px, and solves for the step: the outermost card's
 * rotated half width (width times cos plus height times sin, over two, the
 * exact horizontal bounding box of a rectangle rotated about its centre) plus
 * its offset must sit inside half the container minus a gutter. Rotation is
 * about the card's CENTRE so that bound is the true extent; the arc's droop is
 * an explicit translateY instead of a low transform origin.
 *
 * THE SECOND FLOOR, ADDED AFTER THE ROUND 2 CRITIC, AND IT IS THE POINT OF
 * THIS FILE. The fit solve above is a CEILING and nothing was a floor, so a
 * seven card hand on a 390px phone legally squeezed to a 22 to 28px step
 * against a 112px card: the arc fitted, and five of its six names were
 * occluded to a tenth of themselves. The critic measured 10 to 14 percent of
 * each name visible and one name readable, where the committed image reads
 * six. A fan whose names cannot be read is not "named reaction cards fanned".
 *
 * So the step now also has a MINIMUM, and the minimum is derived rather than
 * picked. Card i is overlapped from the RIGHT only (z-index rises with index,
 * so its left neighbour sits under it), which makes card i's visible band
 *
 *     [centre - W/2, centre - W/2 + step]
 *
 * and the centred name box is [centre - S/2, centre + S/2]. The band contains
 * the name exactly when S <= W (the name fits the card at all) and
 *
 *     step >= (W + S) / 2                          the FAN name floor
 *
 * which is `fanNameFloor()` below and is what `fanCapacity` solves for. When a
 * container cannot pay that price for FAN_MAX cards it is DEALT FEWER, which
 * is the honest trade: the tray label still carries the true count and
 * DeckTray prints how many the fan is showing. Measured capacities, from the
 * test: 4 cards at 320px, 5 at the 390px reference phone, 6 at the 448px
 * column cap.
 *
 * WHY NOT SIX AT 390. Six names across 390px leaves about 58px of step,
 * against a 68px floor. Getting six would mean a 48px label budget, and
 * "Williamson" measures 63px at the 12px bold caption size DESIGN-TOKENS
 * gives this type, so six names at 390 means six cut names. The committed
 * image gets six by letting its labels overhang their cards, which is the
 * reference cheating and is not copied. Five whole names is the honest number
 * at that width, and the arithmetic that says so is above rather than hidden
 * in a magic constant.
 *
 * THE NAME ON A CARD is one line. A composed reaction card's name is its
 * setup, because that is the side the student would recognise it by; any
 * other card goes by its front. Both are truncated on a word boundary where
 * one exists, because a fanned card is a spine label, not the reading copy.
 *
 * Pure: no storage, no clock, no React. The container width arrives as an
 * argument; DeckTray measures it and re-lays-out when the phone rotates.
 */

import type { Card } from "../types";

/** The ceiling on how many cards the fan ever deals. `fanCapacity` lowers it. */
export const FAN_MAX = 7;

/**
 * One fanned card's box, in px. DeckTray sets the element's width and height
 * FROM THESE CONSTANTS rather than from Tailwind classes, so the geometry and
 * the paint cannot drift apart at all; the previous build guarded that pairing
 * with a test instead, which only catches drift after someone commits it.
 */
export const FAN_CARD_W = 68;
export const FAN_CARD_H = 90;

/** Per-card tilt cap in degrees, and the whole hand's tilt span. */
export const FAN_ROT_MAX = 12;
export const FAN_ROT_SPAN = 36;

/** Per-card horizontal step cap, px. Reached only by small hands. */
export const FAN_X_STEP_MAX = 76;

/** Breathing room between the outermost card's extent and the frame, px. */
export const FAN_EDGE_GUTTER = 4;

/**
 * The width budget a fanned card's NAME gets, px, and the reason the fan deals
 * fewer cards on a narrow phone. Every title is cut to fit it (`trayTitle`),
 * so it is a real bound on the painted label rather than a hope about one.
 *
 * 68 is chosen against three numbers and has margin on all three: the widest
 * name the committed image draws is "Williamson" at 63.10px, the step a hand
 * of five gets at the 390px reference phone is 72.4px, and a hand of six at
 * the 448px column cap gets 69.5px. The floor derived from it, 68px, sits
 * under both steps and well over the 57.9px a hand of six would get at 390.
 */
export const FAN_NAME_STRIP = 68;

/**
 * ADVANCE WIDTHS AT 12px BOLD IN THE SYSTEM STACK, px, MEASURED IN THE REAL
 * BUILD rather than estimated. A character-count cap cannot bound a pixel
 * width in a proportional face: at this size "i" is 3.42px and "W" is
 * 12.06px, so an eleven character cap admits labels between 38px and 133px,
 * and the round 2 build's fan overflowed its own strip by exactly that
 * mistake. These are getBoundingClientRect widths of one glyph each, rendered
 * with .fan__name's own classes in a built page; the sum reproduces measured
 * strings to better than half a percent ("Diels-Alder" 62.92 computed against
 * 62.84 measured, "cyclopenten…" 79.38 against 79.13).
 *
 * The font is the system stack, so these are Segoe UI Bold's metrics on the
 * reference machine and will differ by a few percent on SF or Roboto. That is
 * why FAN_NAME_STRIP keeps margin rather than sitting on the exact step, and
 * why the ellipsis (10.95px, the widest non-letter here) is counted in full.
 */
const GLYPH_PX: Readonly<Record<string, number>> = Object.freeze({
  a: 6.47, b: 7.45, c: 5.77, d: 7.44, e: 6.5, f: 4.61, g: 7.44, h: 7.23,
  i: 3.42, j: 3.42, k: 6.72, l: 3.42, m: 11, n: 7.27, o: 7.34, p: 7.45,
  q: 7.44, r: 4.78, s: 5.28, t: 4.67, u: 7.27, v: 6.52, w: 9.58, x: 6.64,
  y: 6.47, z: 5.75,
  A: 8.44, B: 7.7, C: 7.5, D: 8.86, E: 6.39, F: 6.25, G: 8.53, H: 9.2,
  I: 3.81, J: 5.34, K: 7.8, L: 6.14, M: 11.48, N: 9.48, O: 9.11, P: 7.38,
  Q: 9.11, R: 7.84, S: 6.73, T: 7.03, U: 8.69, V: 8.02, W: 12.06, X: 7.88,
  Y: 7.3, Z: 7.3,
  "0": 6.91, "1": 6.91, "2": 6.91, "3": 6.91, "4": 6.91,
  "5": 6.91, "6": 6.91, "7": 6.91, "8": 6.91, "9": 6.91,
  " ": 3.28, ".": 3.27, ",": 3.27, "-": 4.86, "+": 8.48, "(": 4.44,
  ")": 4.44, "[": 4.44, "]": 4.44, "/": 5.33, ":": 3.27, ";": 3.27,
  "’": 3.48, "…": 10.95, "%": 10.41,
});

/** What an unmeasured character is charged. The digit width, a safe middle. */
const GLYPH_FALLBACK = 6.91;

/** The ellipsis a cut name ends with, and it is the widest mark in the table. */
const ELLIPSIS = "…";

/** How wide `text` paints on a fanned card, px. See GLYPH_PX. */
export function nameWidthPx(text: string): number {
  let width = 0;
  for (const ch of text) width += GLYPH_PX[ch] ?? GLYPH_FALLBACK;
  return width;
}

/** The width the layout assumes when nothing has measured yet: the reference
    phone. A first paint laid out for 390 then corrected by a measurement is
    right on the reference device and close everywhere else. */
export const FAN_REFERENCE_WIDTH = 390;

/** How steeply the hand droops toward its edges, px per slot squared. */
export const FAN_DROOP_RATE = 6;

export interface FanSlot {
  /** translateX from the fan's centre, px. Negative is left. */
  readonly x: number;
  /** translateY, px. Zero at the hand's edges, negative (raised) mid-hand. */
  readonly y: number;
  /** Rotation about the card's centre, degrees. Negative is anticlockwise. */
  readonly rot: number;
}

/**
 * Half the horizontal bounding box of the card rotated by `rotDeg` about its
 * centre. This is the exact extent, not an estimate, which is what lets the
 * fit be an inequality a test can hold a ruler to.
 */
export function rotatedHalfWidth(rotDeg: number): number {
  const theta = (Math.abs(rotDeg) * Math.PI) / 180;
  return (FAN_CARD_W * Math.cos(theta) + FAN_CARD_H * Math.sin(theta)) / 2;
}

/**
 * The smallest step at which a fanned card's whole name is still visible past
 * the card stacked on top of it. Derived in the header; not a taste value.
 */
export function fanNameFloor(): number {
  return (FAN_CARD_W + FAN_NAME_STRIP) / 2;
}

/** The outermost card's tilt for a hand of `count`. Shared by step and layout. */
function outerRotation(count: number): number {
  if (count <= 1) return 0;
  return Math.min(FAN_ROT_MAX, FAN_ROT_SPAN / (count - 1)) * ((count - 1) / 2);
}

/**
 * The horizontal step a hand of `count` gets inside `containerWidth`: the fit
 * ceiling from the header's solve, capped again at FAN_X_STEP_MAX so a hand of
 * two does not sprawl. Non-increasing in `count`, which is what lets
 * fanCapacity stop at the first size that clears the floor.
 */
export function fanStep(count: number, containerWidth: number): number {
  if (count <= 1) return 0;
  const half = (count - 1) / 2;
  const room = containerWidth / 2 - FAN_EDGE_GUTTER - rotatedHalfWidth(outerRotation(count));
  return Math.min(FAN_X_STEP_MAX, Math.max(0, room) / half);
}

/**
 * How many cards this width can deal and still have every name readable: the
 * largest hand whose step clears `fanNameFloor()`. One card always fits, since
 * a lone card is not overlapped by anything.
 */
export function fanCapacity(containerWidth: number = FAN_REFERENCE_WIDTH): number {
  const floor = fanNameFloor();
  for (let count = FAN_MAX; count > 1; count -= 1) {
    if (fanStep(count, containerWidth) >= floor) return count;
  }
  return 1;
}

/**
 * Where card `index` of `count` sits inside `containerWidth`. Symmetric by
 * construction: slot i is the mirror of slot count-1-i, and an odd hand's
 * middle card is dead centre, upright, and highest, which is what makes the
 * arc read as held rather than strewn. The outermost card's extent fits the
 * container by the solve in the header; every inner card has both a smaller
 * offset and a shallower tilt, so it fits a fortiori.
 */
export function fanLayout(
  count: number,
  index: number,
  containerWidth: number = FAN_REFERENCE_WIDTH,
): FanSlot {
  if (count <= 1) return { x: 0, y: 0, rot: 0 };
  const half = (count - 1) / 2;
  const offset = index - half;
  const rotStep = Math.min(FAN_ROT_MAX, FAN_ROT_SPAN / (count - 1));

  return {
    x: offset * fanStep(count, containerWidth),
    y: -FAN_DROOP_RATE * (half * half - offset * offset),
    rot: offset * rotStep,
  };
}

/**
 * The hand: the deck's first cards, in its own order, capped by BOTH the
 * ceiling and the width's legibility capacity. The second cap is the round 2
 * fix: a narrow phone deals fewer cards rather than dealing seven unreadable
 * ones.
 */
export function fanCards(
  cards: readonly Card[],
  containerWidth: number = FAN_REFERENCE_WIDTH,
): readonly Card[] {
  return cards.slice(0, Math.min(FAN_MAX, fanCapacity(containerWidth)));
}

/**
 * The one-line name a fanned card carries, cut to FAN_NAME_STRIP. See the
 * header for whose text it takes, and GLYPH_PX for why the cut is by width
 * rather than by character count.
 *
 * A cut prefers a WORD BOUNDARY, but only one that keeps at least half the
 * budget: "Which carbon does..." becomes "Which…" rather than "Which car…",
 * while a long single word is cut mid-word rather than thrown away entirely.
 */
export function trayTitle(card: Card): string {
  const name = (card.sides !== undefined ? card.sides.setup : card.front).trim();
  if (nameWidthPx(name) <= FAN_NAME_STRIP) return name;

  const budget = FAN_NAME_STRIP - nameWidthPx(ELLIPSIS);
  let width = 0;
  let cut = 0;
  for (const ch of name) {
    const next = width + (GLYPH_PX[ch] ?? GLYPH_FALLBACK);
    if (next > budget) break;
    width = next;
    cut += ch.length;
  }
  const prefix = name.slice(0, cut);
  const lastSpace = prefix.lastIndexOf(" ");
  const word = lastSpace > 0 && nameWidthPx(prefix.slice(0, lastSpace)) >= budget / 2
    ? prefix.slice(0, lastSpace)
    : prefix;
  return `${word.trimEnd()}${ELLIPSIS}`;
}

/** The violet tray's label, exactly the committed image's shape: "24 · Name". */
export function trayLabel(count: number, deckTitle: string): string {
  return `${count} · ${deckTitle}`;
}
