import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));

describe("project metadata", () => {
  it("has the plugin id and a versions.json entry for the manifest version", () => {
    const manifest = read("manifest.json");
    expect(manifest.id).toBe("note-sorter");
    expect(read("versions.json")[manifest.version]).toBe(manifest.minAppVersion);
  });
});
