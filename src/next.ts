export type Sibling = { path: string; name: string; ctime: number; mtime: number };
export type SortKey = "name" | "created" | "modified";

export function sortSiblings(list: Sibling[], key: SortKey): Sibling[] {
  const copy = [...list];
  if (key === "created") return copy.sort((a, b) => a.ctime - b.ctime);
  if (key === "modified") return copy.sort((a, b) => a.mtime - b.mtime);
  return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

/** `list` still contains the moved note. */
export function pickNext(list: Sibling[], movedPath: string, key: SortKey): string | null {
  const sorted = sortSiblings(list, key);
  const at = sorted.findIndex((x) => x.path === movedPath);
  if (at === -1) return sorted[0]?.path ?? null;
  return (sorted[at + 1] ?? sorted[at - 1])?.path ?? null;
}
