import { describe, expect, it } from "vitest";
import { emptyHistory, pruneHistory, rankFolders, recordMove } from "../src/history";

const DAY = 86_400_000;
const NOW = 1_000 * DAY;

describe("recordMove", () => {
  it("counts uses and stamps the time, without touching the input", () => {
    const h0 = emptyHistory();
    const h1 = recordMove(h0, "A", NOW - DAY);
    const h2 = recordMove(h1, "A", NOW);
    expect(h2.entries["A"]).toEqual({ count: 2, last: NOW });
    expect(h1.entries["A"]).toEqual({ count: 1, last: NOW - DAY });
    expect(h0.entries).toEqual({});
  });
});

describe("rankFolders", () => {
  const existing = ["A", "B", "C", "D", "Src", "Skip", "Skip/Sub"];

  it("ranks a fresh single use above a mildly used old folder", () => {
    let h = emptyHistory();
    h = { entries: { A: { count: 1, last: NOW }, B: { count: 5, last: NOW - 100 * DAY } } };
    expect(rankFolders(h, existing, [], "Src", 2, NOW)).toEqual(["A", "B"]);
  });

  it("ranks a heavily used old folder above a fresh single use", () => {
    const h = { entries: { A: { count: 1, last: NOW }, B: { count: 20, last: NOW - 100 * DAY } } };
    expect(rankFolders(h, existing, [], "Src", 2, NOW)).toEqual(["B", "A"]);
  });

  it("never offers the source, excluded folders or their subfolders", () => {
    const h = { entries: { Src: { count: 9, last: NOW }, "Skip/Sub": { count: 9, last: NOW }, A: { count: 1, last: NOW } } };
    const out = rankFolders(h, existing, ["Skip"], "Src", 10, NOW);
    expect(out).not.toContain("Src");
    expect(out).not.toContain("Skip");
    expect(out).not.toContain("Skip/Sub");
    expect(out[0]).toBe("A");
  });

  it("drops history for folders that no longer exist", () => {
    const h = { entries: { Gone: { count: 9, last: NOW } } };
    expect(rankFolders(h, existing, [], "Src", 10, NOW)).not.toContain("Gone");
  });

  it("fills with unused folders alphabetically and respects the limit", () => {
    const h = { entries: { C: { count: 1, last: NOW } } };
    expect(rankFolders(h, existing, [], "Src", 3, NOW)).toEqual(["C", "A", "B"]);
  });
});

describe("pruneHistory", () => {
  it("removes entries for folders that are gone", () => {
    const h = { entries: { A: { count: 1, last: 1 }, Gone: { count: 1, last: 1 } } };
    expect(Object.keys(pruneHistory(h, ["A"]).entries)).toEqual(["A"]);
  });
});
