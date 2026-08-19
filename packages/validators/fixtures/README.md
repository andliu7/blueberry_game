# Conservation fixture corpus

Every file here ending in `.fixture.json` is one mechanism pathway plus a declaration of what
the six conservation checks are supposed to say about it. This README is the only file in this
directory that is not a fixture, and it is on the allowlist in
`src/checks/conservation/fixture-schema.ts` (`NON_FIXTURE_FILES`). Anything else that is neither
a fixture nor on that list is reported as a stray file and fails the run, because a fixture saved
as `.json` instead of `.fixture.json` would sit here verifying nothing while inflating the count.

## Format

The authoritative definition is `src/checks/conservation/fixture-schema.ts`. It is a strict
parser: unknown keys are rejected everywhere, so a typo in `justification` or `mustFail` fails
loudly instead of silently downgrading a negative control into an ordinary fixture. The summary
below is a reading aid, not a second source of truth.

```jsonc
{
  "schemaVersion": 1,            // must equal FIXTURE_SCHEMA_VERSION
  "id": "...",                   // must equal the filename without .fixture.json
  "title": "...",                // one sentence, what the step is
  "expect": {
    "kind": "good" | "broken",
    "mustFail": [],              // check names this fixture is declared to break
    "note": ""                   // required when kind is "broken", says what is wrong
  },
  "pathway": {
    "id": "...",
    "route": "sn2",              // a MechanismRoute from chem-core routes.ts
    "steps": [
      {
        "id": "step-1",
        "identity": {
          "elementaryStep": "concerted_substitution",   // an ElementaryStepKind
          "route": "sn2",                               // optional
          "reactionCenters": ["C1"]
        },
        "arrows": [                                     // optional, defaults to []
          {
            "id": "a1",
            "electrons": 2,                             // 1 or 2, defaults to 2
            "source": { "kind": "lonePair", "atomId": "Br1" },
            "sink":   { "kind": "betweenAtoms", "atomIds": ["Br1", "C1"] }
          }
        ],
        "from": { "id": "s0", "members": [], "spectators": [] },
        "to":   { "id": "s1", "members": [], "spectators": [] }
      }
    ]
  }
}
```

A source is one of `{ kind: "lonePair" | "singleElectron", atomId }` or
`{ kind: "bond", bondId }`. A sink is one of `{ kind: "atom", atomId }` or
`{ kind: "betweenAtoms", atomIds: [a, b] }`. Bond ids are resolved against the `from` state, so
a bond source must name a bond that exists there.

A member is `{ role, species }`, where `role` is a `SpeciesRole` and `species` is
`{ id, label?, atoms, bonds? }`. An atom is `{ id, element, formalCharge?, lonePairs?,
unpairedElectrons?, implicitHydrogens?, isotope? }`, all numeric fields defaulting to 0. A bond
is `{ id, a, b, order? }` with order defaulting to 1.

A spectator declaration is `{ speciesId, reason, justification, declaredBy }`, where `reason`
is a `SpectatorReason`. `justification` and `declaredBy` may be empty strings at the parser
level so that the negative control for `conservation-spectator-declaration` can be written. The
check, not the parser, is what rejects an empty one.

### Rules the corpus is held to

Set in `src/checks/conservation/family.ts`:

- A **good** fixture must produce no violation from any of the six checks.
- A **broken** fixture must produce at least one violation from every check it names in
  `mustFail`, and **no** violation from any check it does not name. A negative control that
  does not fire is a check that is not proven to work. A violation that was not declared means
  the declaration is not describing the fixture.
- A check with no negative control anywhere in the corpus fails. Deleting the fixture that
  proves a check works does not quietly turn that check into decoration.
- An empty corpus fails.

Consequence worth stating plainly: `mustFail` is an exact list, not a wish. Where a fixture
names more than one check, the extra names are not sloppiness, they are the cascade written down
so an adversary can argue with it.

### Which cascades are unavoidable

These are properties of the arithmetic, not of any one fixture, and they are why four of the
broken fixtures below name more than one check.

- **A mass break is always an electron flow break.** A nuclide difference either lives in the
  explicit atom list, in which case `observedDeltas` reports an atom added or removed, or it
  lives in implicit hydrogen counts, in which case it is an `implicitHydrogens` mismatch, since
  no arrow can declare an implicit hydrogen delta. There is no third place for it to hide.
- **A charge break is always an electron flow break** whenever mass holds. Under a conserved
  nuclide multiset, `valenceElectronCount` is a fixed sum minus charge, so the two are the same
  equation seen from two sides. This is stated at the top of `charge.ts`.
- **A proton arriving from outside the multiset breaks mass as well**, and normally charge too.
  `proton-transfer.ts` says so in its own header. Check 5 earns its place by naming the cause,
  not by being independent.
- **An implicit hydrogen change cannot break mass alone while charge and valence both hold.**
  If every atom's declared charge agrees with its structure, removing one implicit hydrogen
  lowers that atom's bond order sum by one and therefore raises its derived formal charge by
  one. The multiset total stays put only if some nonbonding count moves the other way, which is
  why the S5 fixture below leaves an unpaired electron behind rather than simply deleting a
  hydrogen.

## The corpus

Four good fixtures, eight broken. Every one of the six checks has at least one negative control.
Three checks have a control that fires on that check and nothing else: `conservation-valence`,
`conservation-electron-flow`, and `conservation-spectator-declaration`.

### Good

| Fixture | What it proves |
|---|---|
| `good-deprotonation-of-methanol-by-hydroxide` | An explicit hydrogen proton transfer conserves everything, and the two arrows account for the whole structural change. |
| `good-protonation-of-acetone-by-hydronium` | Protonation does not conserve charge on the substrate alone, and does conserve it over the multiset. This is the modelling decision in CLAUDE.md working. |
| `good-heterolysis-of-protonated-tert-butanol` | An ionisation with one arrow, where an atom moves out of the substrate into a separate leaving group species, still balances. |
| `good-sn2-with-spectator-counterion` | A declared spectator that really does sit out changes no total, whether it is counted or not. |

### Broken

| Fixture | `mustFail` | What it proves |
|---|---|---|
| `broken-valence-nitromethane-drawn-with-pentavalent-nitrogen` | valence | The octet ceiling fires on a period two nitrogen carrying ten valence electrons, with every conservation total intact. Isolates the octet arm from the formal charge arm, since each atom's declared charge still agrees with its own structure. |
| `broken-mass-methane-loses-a-hydrogen-that-lives-only-in-the-implicit-count` | mass, electron-flow, proton-transfer | `docs/VERIFICATION.md` S5. The explicit atom list is identical on both sides, so a mass check walking explicit atoms reports conservation and only the implicit hydrogen term sees the loss. Fires the S5 diagnostic line, which can only appear on a fixture where the naive implementation would have passed. Charge and valence stay green. |
| `broken-charge-tert-butyl-chloride-ionises-without-giving-the-pair-to-chlorine` | charge, electron-flow | The bonding pair is never handed to the leaving group, so the multiset charge goes from 0 to +2 with mass untouched and every atom internally consistent. The paired electron flow failure is the documented charge and electron identity. |
| `broken-electron-flow-sn2-drawn-without-the-leaving-group-arrow` | electron-flow | The fixture `BUILD-PROMPT.md` asks for: balances on mass and charge while violating electron bookkeeping. Correct products, correct totals, one missing arrow. The only fixture here that fails a single check while every conservation total is intact. |
| `broken-proton-transfer-acetone-protonated-with-no-acid-in-the-state` | mass, charge, electron-flow, proton-transfer | The acid written above the arrow instead of drawn. Exercises the imbalance arm of check 5: one hydrogen gained, none released by any species present, cause `proton_source_not_in_state`. The widest declared cascade in the corpus, and the note on the fixture explains each name. |
| `broken-proton-transfer-isobutylene-protonated-by-an-acid-declared-a-spectator` | mass, charge, proton-transfer | The same boundary rule from the other side. The acid is drawn and the chemistry is right; it is the declaration that is wrong, marking the acid bulk medium and so excluding it from the multiset. Exercises the spectator arm of check 5, which the acetone fixture cannot reach, because hydrogens gained and hydrogens released balance exactly. Electron flow stays green, so this also shows the deltas half of the family is not what catches a boundary violation. |
| `broken-spectator-counterion-excluded-without-a-justification` | spectator-declaration | The hygiene arm. Correct chemistry, correct totals, and an exclusion nobody can argue with later. This is the fixture `fixture-schema.ts` keeps `asString` rather than `asNonEmptyString` for. |
| `broken-spectator-declaration-hiding-a-reduced-sodium-counterion` | spectator-declaration, electron-flow | The attack arm, assertion 5. A well formed declaration hides a one electron reduction of the counterion. The participating members balance perfectly; put the spectator back and charge and valence electrons each move by one. Electron flow is declared because `observedDeltas` walks all members, spectators included, which is the reason the deltas half is not fooled even when the totals half is. |

## Adding a fixture

1. Write real chemistry. A placeholder molecule proves nothing about a chemistry check.
2. Break exactly one thing on purpose. A fixture that fails four checks for four unrelated
   reasons cannot tell you which check caught what.
3. Run the suite. If a check fires that you did not declare, either the fixture is broken in a
   second way you did not intend, or the cascade is real and belongs in `mustFail` with a line
   in `note` saying why.
4. Never edit a check to make a fixture pass. That is the non-negotiable in CLAUDE.md, and it
   applies to checks written in the same session.
