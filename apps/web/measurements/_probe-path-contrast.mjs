/**
 * The contrast arithmetic for the pathway values this pass introduced or
 * moved, computed rather than assumed, per the FILL-ONLY rule's own wording
 * ("measured, not assumed") and CLAUDE.md's contrast gate.
 *
 * This is a PROBE, not the gate. measurements/contrast-audit.mjs is the gate
 * and it walks the built app; it is blocked in this tree on a route another
 * piece owns mid-flight, so this narrows to the pairs this piece is
 * responsible for and reports them honestly. Nothing here loosens anything.
 *
 * WALL CLOCKS: none.
 */

const srgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
};
const lum = (hex) => {
  const [r, g, b] = srgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const CREAM = "#fbf3e6";
const NIGHT = "#171a2e";

const PAIRS = [
  ["trail ribbon on the cream ground", "#6b73a8", CREAM, 3.0, "graphic"],
  ["trail rim on the cream ground", "#55597f", CREAM, 3.0, "graphic"],
  ["done ribbon rim on the cream ground", "#3f8c28", CREAM, 3.0, "graphic"],
  ["terrace / cloud / hump ink on the cream ground", "#8a7a5c", CREAM, 3.0, "graphic"],
  ["queued chip cut edge on the cream ground", "#6f78b3", CREAM, 3.0, "graphic"],
  ["queued chip ink on its own face", "#3a4166", "#dfe2f0", 4.5, "text"],
  ["dim chip ink on its own face", "#3a4166", "#ccd1e9", 4.5, "text"],
  ["night trail ribbon on the night ground", "#7c86c8", NIGHT, 3.0, "graphic"],
  ["night trail rim on the night ground", "#6f74a3", NIGHT, 3.0, "graphic"],
];

let worst = Infinity;
let failed = 0;
for (const [what, fg, bg, floor, kind] of PAIRS) {
  const r = ratio(fg, bg);
  worst = Math.min(worst, r - floor);
  const ok = r >= floor;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2)}:1  floor ${floor.toFixed(1)} (${kind})  ${what}`);
}
console.log(`\n${PAIRS.length} pairs, ${failed} under floor, thinnest margin ${worst.toFixed(2)}`);
process.exit(failed === 0 ? 0 : 1);
