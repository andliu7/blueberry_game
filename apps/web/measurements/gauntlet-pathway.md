# Gauntlet log: the pathway tab

One entry per builder pass. The bar is docs/reference/competitors/inspirations/duolingo path or track.png
and progress & buttons.png for the track, with orgosolver-03-skill-tree-progression.png as the
committed worked example for the graph. Blueberry tokens throughout.

## 2026-08-21, pathway-track-3d-buttons, round 1

Files: apps/web/src/tabs/pathway/PathwayTab.tsx, apps/web/src/tabs/pathway/pathway.css (new).
derivePathway is byte for byte unchanged; everything new sits below it.

What changed

- Track nodes are 68 px round faces on a 6 px darker edge (box-shadow, no blur). `:active`
  drops the face by translateY(6px) and collapses the shadow, transform and box-shadow only, so
  the pressed frame is the pointer down frame with no JavaScript in the path. Measured in Chrome:
  `a.matches(":active")` is true synchronously inside the mousedown listener on a real click.
- Per state colours through `--node-face` / `--node-edge` / `--node-ink`: done emerald with a
  check, current purple with a star, halo and floating START tag, open white with the number,
  review amber with a star, locked grey with a lock glyph. Dark variant swaps only the colour
  blocks.
- Unit banners cut the track where the act changes (ACTS from the curriculum package; courses
  without acts render one banner named after the course). Each carries the act label and a
  Guidebook button linking to the course page.
- Hit targets: node 68 px, Guidebook 44 by 56 minimum. `:focus-visible` ring on nodes.
  Reduced motion: transition 1 ms, START bob off.

Suite: npx tsc -b apps/web clean on every file outside tabs/trainer (two errors in
tabs/trainer/TrainerTab.tsx belong to the other builder's in flight work on that tab).
npm run validate: 30 of 30, integrity unmodified. Console: no errors on #/pathway.

Screenshots: apps/web/measurements/gauntlet-shots/pathway-track-3d-buttons-r1-mid.jpg (current
node pressed) and pathway-track-3d-buttons-r1-end.jpg (one screen down, into Act 1). Note on the
mid shot: the browser tool cannot hold a pointer across a screenshot, so the two declarations of
the `.path-node--press:active` rule were applied inline for the capture and removed after; the
real `:active` behaviour was verified separately as above.

Open for the critic: the START tag sits close under the spine banner when the first node is the
current one; the winding amplitude (64 px) may want to be larger on wide screens.
