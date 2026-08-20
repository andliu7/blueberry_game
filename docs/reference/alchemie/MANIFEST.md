# Reference artifact manifest: Alchemie Mechanisms

Critics compare against the files listed here. A critic never compares against the app name, never
against a prose description, and never from memory. A critic that cannot open its assigned file
reports that and stops.

This file exists because a bar that lives only in a human's head is, from an agent's point of view,
a vague bar, and a vague bar makes a critic approve everything. That is the single most common way
this pattern fails.

`OBSERVATIONS.md` in this directory records structured observations already taken from these
captures. It is a supplement, not a substitute. Prose lets a critic reason; pixels let it compare.

## Scope

Interaction patterns are fair reference. Alchemie's assets, visual design, problem sets, and
authored content are theirs. These artifacts inform how the interaction behaves. They are not
copied, traced, or reproduced, and they are not redistributed. This directory stays out of any
public build output. Add it to the deploy workflow's exclusion list.

## Required, drop the files in and tick the row

Filenames are prescriptive. Rename captures to match so critic instructions can reference them by
path without a lookup step.

| File | Shows | Axis | Present |
|---|---|---|---|
| `01-mechanism-canvas-full.png` | Full mechanisms problem screen, uncropped, teal gradient | Visual modernity, ergonomics | [x] |
| `02-warning-triangle-bond.png` | Yellow warning triangle on a bond between two carbons | Feedback specificity | [x] |
| `03-warning-triangle-atom.png` | Yellow warning triangle over an atom, atom dimmed | Feedback specificity | [x] |
| `04-error-spiky-atom.png` | Black spiky exploded outline on an atom in error state | Feedback specificity | [x] |
| `05-bond-break-particles.png` | Yellow particle burst at a breaking bond midpoint | Ergonomics, motion | [x] |
| `06-carbocation-badge.png` | Circled plus badge on a cationic carbon, with its ring | Visual modernity | [x] |
| `07-goal-achieved.png` | Goal Achieved panel, bottom right | Feedback specificity | [x] |
| `08-intro-modal.png` | Intro 4 tutorial modal with its static raster image | Onboarding | [x] |
| `09-orbital-3d.png` | 3D sp3 and p orbital lobes, green and purple, black background | 3D justification | [x] |
| `10-formula-keyboard.png` | Net ionic builder with element tiles and superscript toggle | Ergonomics counterexample | [x] |

## Optional, high value

| File | Shows | Why |
|---|---|---|
| `v01-arrow-draw.mp4` | Screen recording of drawing one arrow end to end | Timing and easing cannot be read off a still |
| `v02-wrong-then-retry.mp4` | Wrong action, feedback appearing, retry | Recovery pacing, and whether any text ever appears |
| `frames/` | Extracted frames from the above | Lets a critic compare specific moments |

The second recording matters most. Every still capture so far shows the same undifferentiated
warning triangle, which is the basis of the feedback-specificity claim. A recording is what would
show whether a sentence appears later in the interaction and the claim needs revising. Capture it
before trusting the claim.

## Measured observations

Measured, not estimated. The captures are 2556 by 1179 px, an iPhone 14 Pro class panel in landscape
at 3x, so pixels divide by 3 to give points. Segmented with PIL and numpy during Phase 2 while
building the synthetic fingertip model. Method is recorded beside each number and the layouts are
reproduced in `packages/interaction/src/geometry/reference-layouts.ts`.

- Atom sphere diameter, in points: **71.5** (bbox over 5 atoms in 2 captures, range 71.3 to 71.7)
- Bond handle diameter, in points: **15.7** (two independent methods agreeing to 0.1: a width profile
  down a C=O capsule showing a 9.3 shaft bulging to 15.67 at both ends, and the pulled-off handle in
  `extra/x02` isolated at 15.7 by 16.0, circularity 0.98). That is 0.22 of an atom diameter, which
  confirms OBSERVATIONS.md's prose "roughly a quarter" as a number
- Centre to centre distance, bond handle to its nearest atom, in points: **41.4** (41.5 and 41.3 on
  the two handles of a double bond)
- Tightest spacing between two independently tappable targets, in points: **29.2**, the two handles
  of a double bond. Lone pair dots are 15.8 across on a 59.5 orbit, 25.2 apart within a pair
- Approximate time from action to feedback, in ms, from the recording: `____` **still unmeasured.**
  Both optional recordings are missing and a still cannot carry a duration
- **Number of distinct wrong-answer presentations observed across all captures:** **2**, not the 1
  this file originally estimated. The yellow warning triangle, and a separate black spiky exploded
  atom outline which this manifest already gives its own row at slot 04. They co-occur but are
  distinct presentations. The offending atom is also dimmed, which may be a third channel or part of
  the same state
- Number of those that name a cause in words rather than a symbol: **0**. No text appears in any
  error state in any capture. This is the number the feedback axis is calibrated on and it survives
- Body text contrast ratio sampled from `08-intro-modal.png`: `____` **still unmeasured**

The last three rows are the ones that matter. Feedback specificity is the axis where beating the bar
is most achievable and most valuable to a student, and it is the easiest to quantify: count their
distinct failure presentations, then build more, each naming a specific cause in a sentence.

Observation from the captures reviewed so far puts the second-to-last row at one and the last row at
zero. If a recording contradicts that, correct it here and tell the orchestrator, because the win
condition on that axis is calibrated against these two numbers.

## Provenance

Filed 2026-08-19 from raw captures staged in `reference images/` at the repository root. Original
capture filename on the left, manifest slot on the right, so a disputed reading can be traced back.

| Source capture | Slot |
|---|---|
| `IMG_1641.png` | `01-mechanism-canvas-full.png` |
| `IMG_1650.png` | `02-warning-triangle-bond.png` |
| `IMG_1648.png` | `03-warning-triangle-atom.png` |
| `Screenshot 2026-08-19 054525.png` | `04-error-spiky-atom.png` |
| `IMG_1649.png` | `05-bond-break-particles.png` |
| `IMG_1647.png` | `06-carbocation-badge.png` |
| `IMG_1644.png` | `07-goal-achieved.png` |
| `IMG_1640.png` | `08-intro-modal.png` |
| `Screenshot 2026-08-19 053917.png` | `09-orbital-3d.png` |
| `Screenshot 2026-08-19 053927.png` | `10-formula-keyboard.png` |

## Supplementary captures, in `extra/`

Not required by the table above. Filed because they show behaviour the ten do not, and two of them
show the single most useful thing in the whole set for Phase 2.

| File | Shows | Why it matters |
|---|---|---|
| `x01-drag-inflight-dashed-guide.png` | A drag in flight, dashed white guide from a carbocation to a distant nucleophile | The dashed in flight guide Phase 2 has to build. Not visible in any required slot |
| `x02-bond-handle-drag.png` | A bond end handle pulled off its atom, dashed cyan guide, dragged handle glowing | Confirms the bond end handle is the drag target, not the bond body. This is the ergonomics claim |
| `x03-goal-achieved-arriving.png` | Goal Achieved panel partway through its entrance | Panel animates in from the right edge rather than appearing |
| `x04-goal-achieved-oxocarbenium.png` | Success state on a larger multi species scene | Shows the success dim applies to the whole canvas |
| `x05-3d-builder-ar.png` | A sixth mode, 3D builder with an AR toggle, LOAD and SAVE, element palette | Not recorded in `OBSERVATIONS.md`. See the open item below |
| `x06-3d-builder-rotated.png` | Same mode, rotated | Free rotation, no snapping observed |
| `x07-3d-builder-rotated-2.png` | Same mode, rotated again | As above |
| `x08-equation-balancing.png` | Equation balancing, split canvas, periodic table sidebar | Corroborates mode 4 in `OBSERVATIONS.md` |
| `x09-stoichiometry-dimensional-analysis.png` | Factor label chain, red strikethrough unit cancellation | Corroborates mode 2 in `OBSERVATIONS.md` |

## Not Alchemie

`docs/reference/competitors/` holds App Store captures of two other products, filed separately so no
critic mistakes them for the bar. `orgosolver-03-skill-tree-progression.png` is the one worth reading
before Phase 4, because it is a worked example of level progression and unlock state.

## Open items

Both recordings in the optional table above are still missing, and the measured observations below
are still blank. The recordings are what would settle whether the feedback count of one is real or
an artifact of still captures.
