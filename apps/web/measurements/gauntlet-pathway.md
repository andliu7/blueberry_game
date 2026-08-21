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

## 2026-08-21, pathway-track-3d-buttons, round 2

Files: apps/web/src/tabs/pathway/PathwayTab.tsx, apps/web/src/tabs/pathway/pathway.css.
derivePathway unchanged.

Critic's gap: no readable 3D slab (the edge read as a soft drop shadow, the press did not
collapse a face onto a floor) and a track that barely wound.

What changed

- The slab is now two real discs. `.path-node__edge` is a darker disc of the same hue painted as
  a fill 8 px below `.path-node__face`, so there is a solid floor at rest. Edge colours were
  repicked for contrast against their own face: done #10b981 on #047857, current #7c3aed on
  #4c1d95, open #ede9fe on #b197f5, review #fbbf24 on #b45309, locked #e7e5e4 on #a8a29e.
- `:active` translates the face by the edge height onto the floor, transform only. Measured in
  Chrome: `a.matches(":active")` is true synchronously inside the pointerdown listener.
- The winding is a -2..2 step cycle (centre, right, far right, right, centre, left, far left,
  left) at min(64px, 11vw) per step, so the swing is up to 128 px either side on desktop and
  shrinks on a phone. Each row is a three column grid with the slab pinned in the middle
  column, so wind 0 is dead centre whatever the label length; the lesson name sits on the side
  the node swung away from.
- Legend swatches use the same two disc markup at 14 px.
- Hit targets measured: node 72 by 80, Guidebook 56 by 64.

Suite: npm run validate 30 of 30, integrity unmodified. npx tsc -b apps/web: clean outside
tabs/trainer (DrawCanvas.tsx errors belong to the other builder's in flight work). Console: no
errors on #/pathway after a fresh load.

Screenshots: apps/web/measurements/gauntlet-shots/pathway-track-3d-buttons-r2-mid.jpg (current
node pressed, face flush on the floor) and pathway-track-3d-buttons-r2-end.jpg (one screen down,
Act 1 locked and open nodes). As in round 1 the browser tool cannot hold a pointer across a
screenshot, so the pressed transform was applied inline for the mid capture and removed after;
the real `:active` behaviour was verified separately as above.

Open for the critic: the START tag still sits close under the spine banner when node 1 is
current; the open face highlight crescent may be too strong on the pale violet face.
