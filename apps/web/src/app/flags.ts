/**
 * Feature flags for the three surfaces that are built and not open yet.
 *
 * Owner amendment of 2026-08-28: leaderboards, AI chat and tutor messaging come
 * out of the tab bar and go behind a flag "rather than being deleted", and
 * every route still resolves so a deep link does not 404.
 *
 * A flag here decides ONE thing: whether the app LINKS to a surface. It never
 * decides whether the surface renders, because a student who typed the hash or
 * followed an old link has to land somewhere honest. The route always resolves;
 * with the flag off it renders the surface's own "not open yet" state.
 *
 * This is a CLIENT flag and it is deliberately not an entitlement. CLAUDE.md:
 * anything that costs money or gates access is enforced server side, and a
 * client side check is a suggestion. Nothing behind these flags costs money
 * today; when chat does, Phase 7's Edge Function meters it and this file is
 * still only deciding whether a link is drawn.
 *
 * Two ways to turn one on, both non-secret:
 *   ?flags=chat,leaderboards   for a capture script, a critic, or a demo
 *   localStorage["blueberry.flags"] = "chat"   for a device that has to keep it
 *
 * The URL wins, so a capture never inherits whatever the last session stored.
 */

export type FlagId = "leaderboards" | "chat" | "messages";

const FLAG_IDS: readonly FlagId[] = ["leaderboards", "chat", "messages"];

const STORAGE_KEY = "blueberry.flags";

function parseList(raw: string | null): ReadonlySet<FlagId> {
  const on = new Set<FlagId>();
  if (raw === null) return on;
  for (const part of raw.split(",")) {
    const name = part.trim();
    if ((FLAG_IDS as readonly string[]).includes(name)) on.add(name as FlagId);
  }
  return on;
}

function read(): ReadonlySet<FlagId> {
  if (typeof window === "undefined") return new Set();
  const fromUrl = new URLSearchParams(window.location.search).get("flags");
  if (fromUrl !== null) return parseList(fromUrl);
  try {
    return parseList(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    /* storage blocked: no flags, which is the shipped default anyway */
    return new Set();
  }
}

/**
 * Read once at module load, not per call.
 *
 * A flag that could change between two renders in one session would need a
 * store and a subscription, and nothing here is worth that: turning one on is a
 * reload. Reading once also means the tab bar and the Me tab cannot disagree
 * with each other halfway down a screen.
 */
const ON: ReadonlySet<FlagId> = read();

export function isFlagOn(flag: FlagId): boolean {
  return ON.has(flag);
}

/** Every flag currently on. Used by the Me tab to decide what to list. */
export function flagsOn(): readonly FlagId[] {
  return FLAG_IDS.filter((flag) => ON.has(flag));
}
