import { describe, expect, it } from "vitest";
import { pickNext, sortSiblings, type Sibling } from "../src/next";

const s = (name: string, ctime = 0, mtime = 0): Sibling => ({ path: `Inbox/${name}.md`, name, ctime, mtime });

describe("pickNext", () => {
  const list = [s("c"), s("a"), s("b")];

  it("returns the note after the moved one", () => {
    expect(pickNext(list, "Inbox/a.md", "name")).toBe("Inbox/b.md");
  });

  it("returns the previous note when the moved one was last", () => {
    expect(pickNext(list, "Inbox/c.md", "name")).toBe("Inbox/b.md");
  });

  it("returns null when it was the only note", () => {
    expect(pickNext([s("a")], "Inbox/a.md", "name")).toBeNull();
    expect(pickNext([], "Inbox/a.md", "name")).toBeNull();
  });

  it("falls back to the first sorted note when the moved path is not in the list", () => {
    expect(pickNext(list, "Inbox/zzz.md", "name")).toBe("Inbox/a.md");
  });

  it("honors created and modified order", () => {
    const l = [s("x", 3, 1), s("y", 1, 3), s("z", 2, 2)];
    expect(pickNext(l, "Inbox/y.md", "created")).toBe("Inbox/z.md");
    expect(pickNext(l, "Inbox/x.md", "modified")).toBe("Inbox/z.md");
  });
});

describe("sortSiblings", () => {
  it("sorts numbers inside names naturally", () => {
    expect(sortSiblings([s("10"), s("2"), s("1")], "name").map((x) => x.name)).toEqual(["1", "2", "10"]);
  });

  it("does not mutate its input", () => {
    const l = [s("b"), s("a")];
    sortSiblings(l, "name");
    expect(l.map((x) => x.name)).toEqual(["b", "a"]);
  });
});
