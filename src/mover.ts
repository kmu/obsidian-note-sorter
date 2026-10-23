export type Move = { from: string; to: string };
export type Plan = { moves: Move[]; skipped: { from: string; reason: "exists" }[] };
export type MoveResult = {
  done: Move[];
  skipped: Plan["skipped"];
  failed: { from: string; message: string }[];
};

export type MoveHost = {
  exists(path: string): boolean;
  ensureFolder(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
};

const ROOT = "/";

function join(dest: string, name: string): string {
  return dest === ROOT ? name : `${dest}/${name}`;
}

/** `taken` holds the paths that already exist in `dest`; `name` includes the extension. */
export function planMoves(files: { path: string; name: string }[], dest: string, taken: Set<string>): Plan {
  const used = new Set([...taken].map((p) => p.toLowerCase()));
  const plan: Plan = { moves: [], skipped: [] };
  for (const file of files) {
    const to = join(dest, file.name);
    if (used.has(to.toLowerCase())) {
      plan.skipped.push({ from: file.path, reason: "exists" });
      continue;
    }
    used.add(to.toLowerCase());
    plan.moves.push({ from: file.path, to });
  }
  return plan;
}

export async function executeMoves(host: MoveHost, plan: Plan, dest: string): Promise<MoveResult> {
  const result: MoveResult = { done: [], skipped: plan.skipped, failed: [] };
  if (plan.moves.length > 0 && dest !== ROOT && !host.exists(dest)) await host.ensureFolder(dest);
  for (const move of plan.moves) {
    try {
      await host.rename(move.from, move.to);
      result.done.push(move);
    } catch (e) {
      result.failed.push({ from: move.from, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}

/** Puts every move back, newest first; keeps going on errors and reports them at the end. */
export async function undoMoves(host: MoveHost, done: Move[]): Promise<void> {
  const errors: string[] = [];
  for (const move of [...done].reverse()) {
    try {
      await host.rename(move.to, move.from);
    } catch (e) {
      errors.push(`${move.to}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
}
