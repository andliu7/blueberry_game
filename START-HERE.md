# Start here

Two things live in this file: how to get Claude Code running against this repository, and the prompt
to paste once it is.

---

## Part 1: getting off GitHub Desktop and onto the CLI

You do not have to give up GitHub Desktop. Keep it. It is a good safety net: Claude Code edits files
and stages commits, you look at the diff in Desktop before pushing, and nothing reaches GitHub that
you have not seen. Plenty of experienced people work exactly that way.

What the CLI adds is that the agent can create, edit, delete, and move files directly, and run git
itself, instead of handing you a zip.

### One-time setup

Install Node if you do not have it, from nodejs.org, then in PowerShell:

```
npm install -g @anthropic-ai/claude-code
```

Clean up the two files left behind by the earlier transfer, which the desktop bridge could write but
not delete:

```
cd C:\Users\zeusa\Downloads\Projects\blueberry_game
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Remove-Item _scaffold.zip -ErrorAction SilentlyContinue
```

Point the folder at GitHub. The `git init` that ran through the bridge left a repository with no
remote, so:

```
git remote add origin https://github.com/andliu7/blueberry_game.git
git add -A
git commit -m "Contracts, inherited decisions, design tokens, and reference manifest"
git push -u origin main
```

If any of that errors in a way you do not recognise, the simplest reset is to delete the `.git`
folder entirely, clone the repo fresh through GitHub Desktop into a new folder, and copy these files
into it. Nothing here is precious; it is ten markdown files.

Then start the agent:

```
cd C:\Users\zeusa\Downloads\Projects\blueberry_game
claude
```

It reads `CLAUDE.md` automatically on startup. That is why the contracts live in a file with that
name rather than in a prompt you have to remember to paste.

### Three habits worth having from day one

- **Branch per phase.** `git checkout -b phase-0`. If a phase goes wrong, you throw away a branch
  instead of untangling main.
- **Read the diff before you push.** This is what GitHub Desktop is genuinely good at. An agent that
  edited forty files when you expected four is a thing you want to see.
- **`dist/` stays in `.gitignore`.** The sibling repo learned this the expensive way and its `.git`
  is 34 MB against a packed size of 862 KiB. See D1.

---

## Part 2: what to paste

Everything between the rules. It is short on purpose: the substance lives in files the agent reads
itself, which is more reliable than a long paste that drifts from what is on disk.

---

Build Blueberry Mechanisms: an organic chemistry mechanism engine, a game-mode web app, and a
standalone Expo app over one engine.

Read `CLAUDE.md`, `docs/INHERITED-DECISIONS.md`, and `docs/VERIFICATION.md` before anything else.
They hold the contracts, thirteen decisions already made on measured evidence in the sibling
repository, and the seven blockers an earlier draft of this plan contained so you do not reintroduce
one. Then follow `BUILD-PROMPT.md`, running its preflight first and stopping if any item fails.

The bar is Alchemie's Mechanisms. Compare against the captures committed in
`docs/reference/alchemie/`, by filename, never from memory. A critic that cannot open its assigned
file reports that and stops rather than reconstructing the bar from a description.

Break each phase into the smallest pieces that can be judged on their own. For each piece, fan out a
builder and a separate critic with fresh context. The critic runs the executable checks, puts our
output beside the bar with the labels stripped, says which one is better, and names the single
biggest remaining gap. Then it goes back to the builder. Builders never grade their own work.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

Loop on each piece until its numeric exit condition is met or five iterations pass, then stop and
report what you believe the blocker is. Never weaken a check, loosen a tolerance, or shrink a
fixture set to reach green. Never loop on aesthetics, since there is no exit condition for looks
good; those are human gates and each phase names its own.

I am strong in Python and Java and weak in React and TypeScript. Explain the why of a structural
decision before writing the code for it, name any non-obvious React pattern in one line with what it
is for, and if I ask for something that is a bad idea say so and say what you would do instead.
Prefer boring and well maintained over clever.

Windows PowerShell 5.1, so no `&&`, real curl is `curl.exe`, and file commands are the PowerShell
ones. No em dashes anywhere.

Keep `STATUS.md` updating as the work evolves so I can watch it.

Fan out subagents and ultracode.

---

## Part 3: what is blocking Phase 0 right now

Three things, all yours to supply.

1. **The Alchemie reference images.** Drop the captures into `docs/reference/alchemie/` under the
   filenames listed in `MANIFEST.md`. This is the single most important one. Without them a critic
   reconstructs the bar from memory and approves nearly anything, which is the most common way this
   whole pattern fails.
2. **The FILL block in `CLAUDE.md`.** Supabase test project ref, two seeded test account emails for
   the RLS attack test, and the local path to the Blueberry repo.
3. **Python with RDKit importable.** The validator suite runs it as a sidecar oracle. It never ships
   to the browser.

## Part 4: the one thing to run in parallel

The phases here end in a green validator suite and a passing corpus, not in something you can click.
That is deliberate, because a loop with no numeric exit does not terminate, but it means the first
browser-visible thing is a while away.

So run the spike from `MECHANISM_TRAINER_PROMPT.md` alongside Phase 0, on a throwaway branch: render
Ketcher, subscribe to `ketcher.editor.subscribe('change', ...)`, pull live atom coordinates out, and
keep a plain SVG dot glued to one specific carbon while you drag the structure around.

If that works, most of the rest is assembly. If Ketcher does not expose atom positions in a way you
can hook into, the architecture is wrong and you want to know in week one rather than in November,
because curved arrows have to anchor to atom 7 and not to pixel (240, 180).
