import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSaved } from "../src/data";

describe("parseSaved", () => {
  it("gives defaults for junk", () => {
    for (const raw of [null, undefined, "x", 5, [], {}]) {
      const d = parseSaved(raw);
      expect(d.settings).toEqual(DEFAULT_SETTINGS);
      expect(d.history).toEqual({ entries: {} });
    }
  });

  it("clamps the candidate count to 3..20", () => {
    expect(parseSaved({ settings: { candidateCount: 99 } }).settings.candidateCount).toBe(20);
    expect(parseSaved({ settings: { candidateCount: 1 } }).settings.candidateCount).toBe(3);
    expect(parseSaved({ settings: { candidateCount: "7" } }).settings.candidateCount).toBe(8);
  });

  it("keeps valid values and drops invalid ones", () => {
    const d = parseSaved({
      settings: { excludeFolders: ["A", 3, "B"], inboxFolder: "Inbox", sortKey: "modified" },
      history: { entries: { A: { count: 2, last: 5 }, B: { count: "x" }, C: null } },
    });
    expect(d.settings.excludeFolders).toEqual(["A", "B"]);
    expect(d.settings.inboxFolder).toBe("Inbox");
    expect(d.settings.sortKey).toBe("modified");
    expect(d.history.entries).toEqual({ A: { count: 2, last: 5 } });
    expect(parseSaved({ settings: { sortKey: "bogus" } }).settings.sortKey).toBe("name");
  });
});

describe("showMoveNotice", () => {
  it("is on by default and only a real boolean turns it off", () => {
    expect(DEFAULT_SETTINGS.showMoveNotice).toBe(true);
    expect(parseSaved({ settings: { showMoveNotice: false } }).settings.showMoveNotice).toBe(false);
    expect(parseSaved({ settings: { showMoveNotice: "no" } }).settings.showMoveNotice).toBe(true);
  });
});
