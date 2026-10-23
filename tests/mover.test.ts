import { describe, expect, it } from "vitest";
import { executeMoves, planMoves, undoMoves, type MoveHost } from "../src/mover";

function fakeHost(initial: string[], failOn: string[] = []) {
  const files = new Set(initial);
  const folders = new Set<string>();
  const host: MoveHost = {
    exists: (p) => files.has(p) || folders.has(p),
    ensureFolder: async (p) => {
      folders.add(p);
    },
    rename: async (from, to) => {
      if (failOn.includes(from)) throw new Error("boom");
      files.delete(from);
      files.add(to);
    },
  };
  return { host, files, folders };
}

const f = (name: string, dir = "Inbox") => ({ path: `${dir}/${name}`, name });

describe("planMoves", () => {
  it("moves everything when nothing collides", () => {
    const plan = planMoves([f("a.md"), f("b.md")], "Dest", new Set());
    expect(plan.moves).toEqual([
      { from: "Inbox/a.md", to: "Dest/a.md" },
      { from: "Inbox/b.md", to: "Dest/b.md" },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it("skips a note whose name exists at the destination", () => {
    const plan = planMoves([f("a.md"), f("b.md")], "Dest", new Set(["Dest/a.md"]));
    expect(plan.moves).toEqual([{ from: "Inbox/b.md", to: "Dest/b.md" }]);
    expect(plan.skipped).toEqual([{ from: "Inbox/a.md", reason: "exists" }]);
  });

  it("moves the first of two same-named selections and skips the second", () => {
    const plan = planMoves([f("a.md", "X"), f("a.md", "Y")], "Dest", new Set());
    expect(plan.moves).toEqual([{ from: "X/a.md", to: "Dest/a.md" }]);
    expect(plan.skipped).toEqual([{ from: "Y/a.md", reason: "exists" }]);
  });

  it("builds root paths without a leading slash and handles Japanese and spaces", () => {
    expect(planMoves([f("メモ 1.md")], "/", new Set()).moves).toEqual([{ from: "Inbox/メモ 1.md", to: "メモ 1.md" }]);
    expect(planMoves([f("a.md")], "資料/日本 語", new Set()).moves[0].to).toBe("資料/日本 語/a.md");
  });
});

describe("executeMoves", () => {
  it("moves, creates the destination folder, and reports", async () => {
    const { host, files, folders } = fakeHost(["Inbox/a.md", "Inbox/b.md"]);
    const plan = planMoves([f("a.md"), f("b.md")], "New/Place", new Set());
    const res = await executeMoves(host, plan, "New/Place");
    expect(res.done).toHaveLength(2);
    expect(folders.has("New/Place")).toBe(true);
    expect([...files].sort()).toEqual(["New/Place/a.md", "New/Place/b.md"]);
  });

  it("keeps going when one rename fails and reports it", async () => {
    const { host, files } = fakeHost(["Inbox/a.md", "Inbox/b.md"], ["Inbox/a.md"]);
    const plan = planMoves([f("a.md"), f("b.md")], "Dest", new Set());
    const res = await executeMoves(host, plan, "Dest");
    expect(res.failed).toEqual([{ from: "Inbox/a.md", message: "boom" }]);
    expect(res.done).toEqual([{ from: "Inbox/b.md", to: "Dest/b.md" }]);
    expect(files.has("Inbox/a.md")).toBe(true);
  });

  it("does not try to create the vault root", async () => {
    const { host, folders } = fakeHost(["Inbox/a.md"]);
    await executeMoves(host, planMoves([f("a.md")], "/", new Set()), "/");
    expect(folders.size).toBe(0);
  });
});

describe("undoMoves", () => {
  it("restores only what was moved", async () => {
    const { host, files } = fakeHost(["Inbox/a.md", "Inbox/b.md", "Dest/a.md"]);
    // b collided earlier and stayed; only a was moved, so only a goes back
    files.delete("Inbox/a.md");
    await undoMoves(host, [{ from: "Inbox/a.md", to: "Dest/a.md" }]);
    expect([...files].sort()).toEqual(["Inbox/a.md", "Inbox/b.md"]);
  });
});
