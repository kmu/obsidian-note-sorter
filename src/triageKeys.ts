export type KeyLike = Pick<KeyboardEvent, "key" | "code" | "shiftKey" | "metaKey" | "ctrlKey" | "isComposing">;

export type TriageAction =
  | { kind: "step"; delta: 1 | -1; extend: boolean }
  | { kind: "toggle" }
  | { kind: "all" }
  | { kind: "more" }
  | { kind: "folder"; n: number };

/** Map a key press in the triage view to what it should do; null means leave it alone. */
export function triageAction(e: KeyLike, plainDigits: boolean): TriageAction | null {
  if (e.isComposing) return null;
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") return { kind: "step", delta: e.key === "ArrowDown" ? 1 : -1, extend: e.shiftKey };
  if (e.key === " ") return { kind: "toggle" };
  if (e.key === "Enter") return { kind: "more" };
  if (mod && e.key.toLowerCase() === "a") return { kind: "all" };
  const modDigit = mod ? /^Digit([1-9])$/.exec(e.code) : null;
  if (modDigit) return { kind: "folder", n: Number(modDigit[1]) };
  if (plainDigits && !mod && /^[1-9]$/.test(e.key)) return { kind: "folder", n: Number(e.key) };
  return null;
}

/** Keep a cursor inside a list of `count` rows; -1 when the list is empty. */
export function clampCursor(cursor: number, count: number): number {
  return count === 0 ? -1 : Math.min(Math.max(cursor, 0), count - 1);
}
