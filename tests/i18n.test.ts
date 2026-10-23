import { describe, expect, it } from "vitest";
import { MESSAGES, pickLocale, translate } from "../src/i18n";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("pickLocale", () => {
  it("uses Japanese for ja and regional variants, English otherwise", () => {
    expect(pickLocale("ja")).toBe("ja");
    expect(pickLocale("ja-JP")).toBe("ja");
    for (const other of ["en", "fr", "zh-TW", "", undefined, null]) expect(pickLocale(other)).toBe("en");
  });
});

describe("translate", () => {
  it("fills in every occurrence of a placeholder", () => {
    expect(translate("en", "notice.moved", { count: 3, folder: "A" })).toBe("Moved 3 to A");
    expect(translate("ja", "notice.moved", { count: 3, folder: "A" })).toContain("3");
  });
  it("returns different text per language", () => {
    expect(translate("en", "notice.undo")).not.toBe(translate("ja", "notice.undo"));
  });
});

describe("message tables", () => {
  const keys = Object.keys(MESSAGES.en).sort();
  it("have the same keys and placeholders in both languages, and no empty text", () => {
    expect(Object.keys(MESSAGES.ja).sort()).toEqual(keys);
    for (const key of keys) {
      expect(placeholders(MESSAGES.ja[key as keyof typeof MESSAGES.ja]), key).toEqual(
        placeholders(MESSAGES.en[key as keyof typeof MESSAGES.en]),
      );
      expect(MESSAGES.en[key as keyof typeof MESSAGES.en].length, key).toBeGreaterThan(0);
      expect(MESSAGES.ja[key as keyof typeof MESSAGES.ja].length, key).toBeGreaterThan(0);
    }
  });
});
