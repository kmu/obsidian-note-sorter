export type History = { entries: Record<string, { count: number; last: number }> };

const DAY = 86_400_000;
/** A use counts for 1, plus a bonus of up to RECENCY_BONUS that fades over days. */
const RECENCY_BONUS = 10;

export function emptyHistory(): History {
  return { entries: {} };
}

export function recordMove(h: History, folder: string, now: number): History {
  const prev = h.entries[folder];
  return { entries: { ...h.entries, [folder]: { count: (prev?.count ?? 0) + 1, last: now } } };
}

export function pruneHistory(h: History, existing: string[]): History {
  const keep = new Set(existing);
  const entries: History["entries"] = {};
  for (const [folder, e] of Object.entries(h.entries)) if (keep.has(folder)) entries[folder] = e;
  return { entries };
}

function isUnder(folder: string, root: string): boolean {
  return folder === root || folder.startsWith(root + "/");
}

export function rankFolders(
  h: History,
  existing: string[],
  exclude: string[],
  source: string,
  limit: number,
  now: number,
): string[] {
  const allowed = existing.filter((f) => f !== source && !exclude.some((x) => isUnder(f, x)));
  const score = (f: string): number => {
    const e = h.entries[f];
    if (!e) return 0;
    const ageDays = Math.max(0, now - e.last) / DAY;
    return e.count + RECENCY_BONUS / (1 + ageDays);
  };
  return allowed
    .map((f) => ({ f, s: score(f) }))
    .sort((a, b) => b.s - a.s || a.f.localeCompare(b.f))
    .slice(0, limit)
    .map((x) => x.f);
}
