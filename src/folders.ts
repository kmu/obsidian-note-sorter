function tokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function filterFolders(query: string, folders: string[], limit: number): string[] {
  const toks = tokens(query);
  if (toks.length === 0) return folders.slice(0, limit);
  const scored: { f: string; rank: number }[] = [];
  for (const f of folders) {
    const path = f.toLowerCase();
    if (!toks.every((t) => path.includes(t))) continue;
    const last = path.slice(path.lastIndexOf("/") + 1);
    scored.push({ f, rank: toks.every((t) => last.includes(t)) ? 0 : 1 });
  }
  return scored
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((x) => x.f);
}

/** The normalized path to create, or null when the input is unusable or already exists (case-insensitively, as most file systems are). */
export function validNewFolder(input: string, existing: string[]): string | null {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  if (trimmed === "") return null;
  const parts = trimmed.split("/");
  if (parts.some((p) => p.trim() === "" || p === "." || p === "..")) return null;
  if (/[\\:*?"<>|#^[\]]/.test(trimmed)) return null;
  const path = parts.map((p) => p.trim()).join("/");
  if (existing.some((e) => e.toLowerCase() === path.toLowerCase())) return null;
  return path;
}

/**
 * Digits pick a suggestion only while nothing in the vault starts with a digit;
 * otherwise typing a year (2024) would move the note on the first keystroke.
 */
export function digitShortcutsArePlain(folders: string[]): boolean {
  return !folders.some((f) => /^\d/.test(f.slice(f.lastIndexOf("/") + 1)));
}
