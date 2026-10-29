import { Notice, TFile, type App } from "obsidian";
import { executeMoves, planMoves, undoMoves, type Move, type MoveHost, type MoveResult } from "./mover";
import { pickNext, type Sibling } from "./next";
import type NoteSorterPlugin from "./main";
import { t } from "./t";

const ROOT = "/";

export function makeHost(app: App): MoveHost {
  return {
    exists: (path) => app.vault.getAbstractFileByPath(path) !== null,
    ensureFolder: async (path) => {
      await app.vault.createFolder(path);
    },
    rename: async (from, to) => {
      const file = app.vault.getAbstractFileByPath(from);
      if (!(file instanceof TFile)) throw new Error(`Not a file: ${from}`);
      await app.fileManager.renameFile(file, to);
    },
  };
}

/** Vault-relative folder paths; the root is "/". */
export function allFolderPaths(app: App): string[] {
  return app.vault.getAllFolders(true).map((f) => f.path);
}

export function folderOf(file: TFile): string {
  return file.parent?.path ?? ROOT;
}

function describe(paths: string[]): string {
  const names = paths.map((p) => p.slice(p.lastIndexOf("/") + 1));
  return names.length > 3 ? `${names.slice(0, 3).join(", ")}…` : names.join(", ");
}

function noticeWithUndo(message: string, onUndo: () => void): void {
  const fragment = createFragment();
  fragment.createSpan({ text: message });
  const button = fragment.createEl("button", { text: t("notice.undo"), cls: "ns-undo" });
  const notice = new Notice(fragment, 10000);
  button.addEventListener("click", () => {
    notice.hide();
    onUndo();
  });
}

/** Moves the notes, records the destination, and tells the user what happened. */
export async function moveNotes(
  plugin: NoteSorterPlugin,
  files: TFile[],
  dest: string,
  opts: { create: boolean; afterUndo?: (moves: Move[]) => void },
): Promise<MoveResult> {
  const host = makeHost(plugin.app);
  // A suggestion can outlive its folder; only the "Create" row may make one.
  if (!opts.create && dest !== ROOT && !host.exists(dest)) {
    new Notice(t("notice.folderGone", { folder: dest }));
    return { done: [], skipped: [], failed: [] };
  }
  const folder = dest === ROOT ? plugin.app.vault.getRoot() : plugin.app.vault.getFolderByPath(dest);
  const taken = new Set((folder?.children ?? []).map((c) => c.path));
  const plan = planMoves(files.map((f) => ({ path: f.path, name: f.name })), dest, taken);
  const result = await executeMoves(host, plan, dest);

  if (result.done.length > 0) {
    plugin.recordDestination(dest);
    const folderName = dest === ROOT ? t("modal.root") : dest;
    const undo = () => {
      if (plugin.lastUndo !== undo) return;
      plugin.lastUndo = null;
      undoMoves(host, result.done)
        .then(() => {
          new Notice(t("notice.undone"));
          opts.afterUndo?.(result.done);
        })
        .catch((e: unknown) => new Notice(t("notice.undoFailed", { message: e instanceof Error ? e.message : String(e) })));
    };
    plugin.lastUndo = undo;
    if (plugin.data.settings.showMoveNotice) noticeWithUndo(t("notice.moved", { count: result.done.length, folder: folderName }), undo);
  }
  if (result.skipped.length > 0) {
    new Notice(t("notice.skipped", { count: result.skipped.length, names: describe(result.skipped.map((s) => s.from)) }));
  }
  if (result.failed.length > 0) {
    new Notice(t("notice.failed", { count: result.failed.length, names: describe(result.failed.map((f) => f.from)) }));
  }
  return result;
}

/** The notes next to `file` in its folder, as the next-note logic wants them. */
export function siblingsOf(app: App, file: TFile): Sibling[] {
  return (file.parent?.children ?? [])
    .filter((c): c is TFile => c instanceof TFile && c.extension === "md")
    .map((c) => ({ path: c.path, name: c.basename, ctime: c.stat.ctime, mtime: c.stat.mtime }));
}

/** Move the open note to `dest`, then open the next note of its folder. */
export async function sortActiveNote(plugin: NoteSorterPlugin, file: TFile, dest: string, create: boolean): Promise<void> {
  const nextPath = pickNext(siblingsOf(plugin.app, file), file.path, plugin.data.settings.sortKey);
  const result = await moveNotes(plugin, [file], dest, {
    create,
    afterUndo: (moves) => {
      const back = plugin.app.vault.getAbstractFileByPath(moves[0].from);
      if (back instanceof TFile) void plugin.app.workspace.getLeaf(false).openFile(back);
    },
  });
  if (result.done.length === 0 || nextPath === null) return;
  const next = plugin.app.vault.getAbstractFileByPath(nextPath);
  if (next instanceof TFile) await plugin.app.workspace.getLeaf(false).openFile(next);
}
