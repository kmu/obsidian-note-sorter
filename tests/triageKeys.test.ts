import { describe, expect, it } from "vitest";
import { clampCursor, triageAction, type KeyLike } from "../src/triageKeys";

const key = (k: Partial<KeyLike> & { key: string }): KeyLike => ({ code: "", shiftKey: false, metaKey: false, ctrlKey: false, isComposing: false, ...k });

describe("triageAction", () => {
  it("maps arrows to cursor steps, and Shift extends", () => {
    expect(triageAction(key({ key: "ArrowDown" }), true)).toEqual({ kind: "step", delta: 1, extend: false });
    expect(triageAction(key({ key: "ArrowUp", shiftKey: true }), true)).toEqual({ kind: "step", delta: -1, extend: true });
  });
  it("maps Space to toggle and Enter to the folder picker", () => {
    expect(triageAction(key({ key: " " }), true)).toEqual({ kind: "toggle" });
    expect(triageAction(key({ key: "Enter" }), true)).toEqual({ kind: "more" });
  });
  it("maps Cmd/Ctrl+A to select all", () => {
    expect(triageAction(key({ key: "a", metaKey: true }), true)).toEqual({ kind: "all" });
    expect(triageAction(key({ key: "a", ctrlKey: true }), false)).toEqual({ kind: "all" });
    expect(triageAction(key({ key: "a" }), true)).toBeNull();
  });
  it("uses plain digits only when folder names do not start with digits", () => {
    expect(triageAction(key({ key: "3" }), true)).toEqual({ kind: "folder", n: 3 });
    expect(triageAction(key({ key: "3" }), false)).toBeNull();
    expect(triageAction(key({ key: "3", code: "Digit3", metaKey: true }), false)).toEqual({ kind: "folder", n: 3 });
    expect(triageAction(key({ key: "0" }), true)).toBeNull();
  });
  it("ignores keys while an IME is composing", () => {
    expect(triageAction(key({ key: "ArrowDown", isComposing: true }), true)).toBeNull();
  });
});

describe("clampCursor", () => {
  it("stays inside the list", () => {
    expect(clampCursor(-1, 5)).toBe(0);
    expect(clampCursor(9, 5)).toBe(4);
    expect(clampCursor(2, 0)).toBe(-1);
  });
});
