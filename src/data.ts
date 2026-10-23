import { emptyHistory, type History } from "./history";
import type { SortKey } from "./next";

export type Settings = {
  candidateCount: number;
  excludeFolders: string[];
  inboxFolder: string;
  sortKey: SortKey;
};
export type SavedData = { settings: Settings; history: History };

export const DEFAULT_SETTINGS: Settings = { candidateCount: 8, excludeFolders: [], inboxFolder: "", sortKey: "name" };

const SORT_KEYS: SortKey[] = ["name", "created", "modified"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Whatever was on disk, as usable data; anything unexpected falls back to the default. */
export function parseSaved(raw: unknown): SavedData {
  const root = isRecord(raw) ? raw : {};
  const s = isRecord(root.settings) ? root.settings : {};
  const count = typeof s.candidateCount === "number" && Number.isFinite(s.candidateCount) ? s.candidateCount : DEFAULT_SETTINGS.candidateCount;
  const settings: Settings = {
    candidateCount: Math.min(20, Math.max(3, Math.round(count))),
    excludeFolders: Array.isArray(s.excludeFolders) ? s.excludeFolders.filter((x): x is string => typeof x === "string") : [],
    inboxFolder: typeof s.inboxFolder === "string" ? s.inboxFolder : DEFAULT_SETTINGS.inboxFolder,
    sortKey: SORT_KEYS.find((k) => k === s.sortKey) ?? DEFAULT_SETTINGS.sortKey,
  };

  const history: History = emptyHistory();
  const h = isRecord(root.history) && isRecord(root.history.entries) ? root.history.entries : {};
  for (const [folder, e] of Object.entries(h)) {
    if (isRecord(e) && typeof e.count === "number" && typeof e.last === "number") history.entries[folder] = { count: e.count, last: e.last };
  }
  return { settings, history };
}
