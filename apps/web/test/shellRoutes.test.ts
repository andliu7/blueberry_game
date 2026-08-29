/**
 * The tab shell's contract, as checks rather than as a paragraph in a comment.
 *
 * Two claims are made by the owner amendment of 2026-08-28 and both of them are
 * the kind that rot quietly. "Four tabs" rots the first time somebody adds a
 * fifth to the array and nothing complains. "Every route still resolves so a
 * deep link does not 404" rots the first time an id is dropped from the union
 * and a hash in a student's history starts landing on the pathway with no sign
 * that it was ever anything else.
 *
 * mobile-ui's number is the one asserted here: five is the HARD limit, three or
 * four is right. The assertion is written at five and not at four on purpose,
 * because four is a judgement and five is a rule, and a check should fail on
 * the rule. The count today being four is asserted separately, so a fifth tab
 * is a deliberate edit to this file rather than a silent slide.
 */

import { describe, expect, it } from "vitest";
import {
  ALL_TABS,
  FLAGGED_TABS,
  NAV_TABS,
  TOOL_TABS,
  hrefForReview,
  hrefForTab,
  parseHash,
  tabDefinition,
  type TabId,
} from "../src/app/routes";
import { OPEN_COURSE_IDS, isCourseOpen } from "../src/app/courses";

describe("the bar", () => {
  it("never carries more than five items, which is mobile-ui's hard limit", () => {
    expect(NAV_TABS.length).toBeLessThanOrEqual(5);
  });

  it("carries exactly the four the amendment names, in order", () => {
    expect(NAV_TABS.map((tab) => tab.id)).toEqual(["pathway", "trainer", "cards", "me"]);
  });

  it("gives every bar item a short label that fits a phone column", () => {
    for (const tab of NAV_TABS) {
      expect(tab.short.length).toBeGreaterThan(0);
      expect(tab.short.length).toBeLessThanOrEqual(6);
    }
  });

  it("puts the periodic table and the reaction search in the header, not the bar", () => {
    expect(TOOL_TABS.map((tab) => tab.id)).toEqual(["periodic", "search"]);
    for (const tool of TOOL_TABS) {
      expect(NAV_TABS.some((tab) => tab.id === tool.id)).toBe(false);
    }
  });

  it("keeps the three unopened surfaces flagged rather than deleted", () => {
    expect(FLAGGED_TABS.map((tab) => tab.id)).toEqual(["leaderboards", "chat", "messages"]);
  });

  it("gives every tab exactly one placement", () => {
    const counted = [...NAV_TABS, ...TOOL_TABS, ...FLAGGED_TABS].length;
    // ALL_TABS is those three plus the collapsed course browser.
    expect(counted + 1).toBe(ALL_TABS.length);
  });
});

describe("no deep link 404s", () => {
  it("resolves every tab id that has ever been in the bar", () => {
    for (const tab of ALL_TABS) {
      const route = parseHash(hrefForTab(tab.id));
      expect(route).toEqual({ kind: "tab", tab: tab.id, rest: [] });
    }
  });

  it("still resolves the three that left the bar", () => {
    for (const id of ["leaderboards", "chat", "messages"] as const) {
      expect(parseHash(`#/${id}`)).toEqual({ kind: "tab", tab: id, rest: [] });
    }
  });

  it("lands the old #/review hash on the Cards tab it became", () => {
    expect(parseHash("#/review")).toEqual({ kind: "tab", tab: "cards", rest: [] });
    // The Charge sheet's free way out is built from this, so the two agree by
    // construction rather than by two people remembering the same string.
    expect(parseHash(hrefForReview())).toEqual({ kind: "tab", tab: "cards", rest: [] });
  });

  it("keeps the periodic table's element deep link working now that it is a tool", () => {
    expect(parseHash("#/periodic/Br")).toEqual({ kind: "tab", tab: "periodic", rest: ["Br"] });
  });

  it("keeps the courses drill down working now that courses is collapsed", () => {
    expect(parseHash("#/courses/orgo_2/aromaticity")).toEqual({
      kind: "tab",
      tab: "courses",
      rest: ["orgo_2", "aromaticity"],
    });
  });

  it("sends an unknown hash to the pathway rather than to nothing", () => {
    expect(parseHash("#/whatever-this-was")).toEqual({ kind: "tab", tab: "pathway", rest: [] });
  });

  it("has a definition for every id, so the shell can always title the page", () => {
    for (const tab of ALL_TABS) {
      expect(tabDefinition(tab.id as TabId).label.length).toBeGreaterThan(0);
    }
  });
});

describe("one course is open", () => {
  it("opens Organic Chemistry II and nothing else", () => {
    expect([...OPEN_COURSE_IDS]).toEqual(["orgo_2"]);
  });

  it("greys the other five", () => {
    for (const course of ["gen_chem_1", "gen_chem_2", "orgo_1", "dat", "mcat"] as const) {
      expect(isCourseOpen(course)).toBe(false);
    }
  });
});
