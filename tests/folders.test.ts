import { describe, expect, it } from "vitest";
import { filterFolders, validNewFolder } from "../src/folders";

describe("filterFolders", () => {
  it("needs every token to appear in the path", () => {
    expect(filterFolders("pro 2024", ["Projects/2024", "Projects/2023", "Archive/2024"], 10)).toEqual(["Projects/2024"]);
  });

  it("ranks a last-segment match above a parent-only match", () => {
    expect(filterFolders("log", ["Log/Misc", "Notes/Logbook"], 10)).toEqual(["Notes/Logbook", "Log/Misc"]);
  });

  it("matches Japanese by substring and ignores case", () => {
    expect(filterFolders("日本", ["資料/日本語", "資料/英語"], 10)).toEqual(["資料/日本語"]);
    expect(filterFolders("ARCH", ["archive"], 10)).toEqual(["archive"]);
  });

  it("handles names with spaces and nested paths", () => {
    expect(filterFolders("my docs", ["A/My Docs/2024", "A/Other"], 10)).toEqual(["A/My Docs/2024"]);
  });

  it("returns the first folders unchanged for an empty query, up to the limit", () => {
    expect(filterFolders("  ", ["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

describe("validNewFolder", () => {
  const existing = ["Notes", "Notes/Old"];

  it("normalizes a good path", () => {
    expect(validNewFolder("Notes/New", existing)).toBe("Notes/New");
    expect(validNewFolder("/x/", existing)).toBe("x");
    expect(validNewFolder("  新しい 場所 ", existing)).toBe("新しい 場所");
  });

  it("rejects parent references, empty segments, empty input and existing folders", () => {
    for (const bad of ["../x", "a/../b", "a//b", "", "  ", "/", "Notes", "notes/Old/"]) {
      expect(validNewFolder(bad, existing), bad).toBeNull();
    }
  });
});
