import { ItemView, Platform, Scope, TFile, TFolder, setIcon, type TAbstractFile, type WorkspaceLeaf } from "obsidian";
import { FolderPickerModal } from "./folderPicker";
import { digitShortcutsArePlain } from "./folders";
import { rankFolders } from "./history";
import type NoteSorterPlugin from "./main";
import { allFolderPaths, moveNotes } from "./moveFlow";
import { sortSiblings } from "./next";
import { t } from "./t";
import { clampCursor, triageAction } from "./triageKeys";

export const TRIAGE_VIEW_TYPE = "note-sorter-triage";

const ROOT = "/";
const MOD_LABEL = Platform.isMacOS ? "⌘" : "Ctrl+";
const ROW_HEIGHT = 52;
const BUFFER_ROWS = 8;
/** A view in a background tab has no height; render enough rows for when it comes back. */
const FALLBACK_HEIGHT = 1200;

export class TriageView extends ItemView {
  private source = ROOT;
  private files: TFile[] = [];
  private selected = new Set<string>();
  private anchor = -1;
  private cursor = 0;
  private ranked: string[] = [];
  private plainDigits = true;
  private previews = new Map<string, string>();

  private sourceEl!: HTMLElement;
  private countEl!: HTMLElement;
  private allBtn!: HTMLButtonElement;
  private scrollEl!: HTMLElement;
  private spacerEl!: HTMLElement;
  private rowsEl!: HTMLElement;
  private chipsEl!: HTMLElement;
  private refreshQueued = false;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: NoteSorterPlugin) {
    super(leaf);
  }

  getViewType() {
    return TRIAGE_VIEW_TYPE;
  }
  getDisplayText() {
    return t("triage.title");
  }
  getIcon() {
    return "folder-input";
  }

  getState(): Record<string, unknown> {
    return { source: this.source };
  }
  async setState(state: unknown, result: Parameters<ItemView["setState"]>[1]): Promise<void> {
    const s = (state as { source?: unknown } | null)?.source;
    if (typeof s === "string") this.source = s;
    await super.setState(state, result);
    this.reload();
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ns-triage");
    contentEl.tabIndex = 0;
    contentEl.addEventListener("keydown", (e) => this.onKey(e));
    // Obsidian binds Cmd/Ctrl+digit itself (go to tab); the view's scope gets first say while it has focus.
    this.scope = new Scope(this.app.scope);
    for (let n = 1; n <= 9; n++) {
      this.scope.register(["Mod"], String(n), () => {
        this.moveToChip(n);
        return false;
      });
    }

    const head = contentEl.createDiv({ cls: "ns-head" });
    this.sourceEl = head.createSpan({ cls: "ns-source" });
    head.createEl("button", { text: t("triage.change") }).addEventListener("click", () => {
      new FolderPickerModal(this.app, this.plugin, "", (folder, created) => !created && this.setSource(folder), t("triage.pickFolder")).open();
    });

    const bar = contentEl.createDiv({ cls: "ns-bar" });
    this.allBtn = bar.createEl("button", { text: t("triage.selectAll") });
    this.allBtn.addEventListener("click", () => this.toggleAll());
    this.countEl = bar.createSpan({ cls: "ns-count" });

    this.scrollEl = contentEl.createDiv({ cls: "ns-scroll" });
    this.spacerEl = this.scrollEl.createDiv({ cls: "ns-spacer" });
    this.rowsEl = this.scrollEl.createDiv({ cls: "ns-rows" });
    this.scrollEl.addEventListener("scroll", () => this.renderRows());

    this.chipsEl = contentEl.createDiv({ cls: "ns-chips" });

    // Folders appearing or vanishing change the suggestions; notes under the source change the list.
    const relevant = (f: TAbstractFile, ...paths: string[]) =>
      f instanceof TFolder || [f.path, ...paths].some((p) => this.source === ROOT || p.startsWith(this.source + "/"));
    this.registerEvent(this.app.vault.on("create", (f) => relevant(f) && this.queueRefresh()));
    this.registerEvent(this.app.vault.on("delete", (f) => relevant(f) && this.queueRefresh()));
    this.registerEvent(
      this.app.vault.on("rename", (f, old) => {
        if (old === this.source) this.source = f.path;
        if (relevant(f, old)) this.queueRefresh();
      }),
    );

    if (this.source === ROOT) this.source = this.plugin.data.settings.inboxFolder || this.app.workspace.getActiveFile()?.parent?.path || ROOT;
    this.reload();
    this.contentEl.focus();
  }

  private setSource(folder: string) {
    this.source = folder;
    this.selected.clear();
    this.anchor = -1;
    this.reload();
  }

  private queueRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    window.setTimeout(() => {
      this.refreshQueued = false;
      this.reload();
    }, 100);
  }

  private reload() {
    if (!this.rowsEl) return;
    const folder = this.source === ROOT ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(this.source);
    const children = folder instanceof TFolder ? folder.children : [];
    const notes = children.filter((c): c is TFile => c instanceof TFile && c.extension === "md");
    const sorted = sortSiblings(
      notes.map((n) => ({ path: n.path, name: n.basename, ctime: n.stat.ctime, mtime: n.stat.mtime })),
      this.plugin.data.settings.sortKey,
    );
    const byPath = new Map(notes.map((n) => [n.path, n]));
    this.files = sorted.map((s) => byPath.get(s.path)!);
    this.cursor = clampCursor(this.cursor, this.files.length);
    for (const path of [...this.selected]) if (!byPath.has(path)) this.selected.delete(path);
    this.sourceEl.setText(t("triage.source", { folder: this.source === ROOT ? t("modal.root") : this.source }));
    this.renderChips();
    this.renderRows();
    this.updateBar();
  }

  private updateBar() {
    this.countEl.setText(t("triage.selected", { count: this.selected.size }));
    this.allBtn.setText(this.selected.size === this.files.length && this.files.length > 0 ? t("triage.selectNone") : t("triage.selectAll"));
    this.chipsEl.toggleClass("is-disabled", this.selected.size === 0);
  }

  private toggleAll() {
    if (this.selected.size === this.files.length) this.selected.clear();
    else this.files.forEach((f) => this.selected.add(f.path));
    this.renderRows();
    this.updateBar();
  }

  private renderRows() {
    if (!this.rowsEl) return;
    this.rowsEl.empty();
    this.spacerEl.style.height = `${this.files.length * ROW_HEIGHT}px`;
    if (this.files.length === 0) {
      this.rowsEl.createDiv({ cls: "ns-empty", text: t("triage.empty") });
      return;
    }
    const first = Math.max(0, Math.floor(this.scrollEl.scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const last = Math.min(this.files.length, Math.ceil((this.scrollEl.scrollTop + (this.scrollEl.clientHeight || FALLBACK_HEIGHT)) / ROW_HEIGHT) + BUFFER_ROWS);
    this.rowsEl.style.transform = `translateY(${first * ROW_HEIGHT}px)`;
    for (let i = first; i < last; i++) this.renderRow(i);
  }

  private renderRow(index: number) {
    const file = this.files[index];
    const row = this.rowsEl.createDiv({ cls: "ns-trow" });
    row.style.height = `${ROW_HEIGHT}px`;
    const on = this.selected.has(file.path);
    row.toggleClass("is-selected", on);
    row.toggleClass("is-cursor", index === this.cursor);
    const box = row.createEl("input", { type: "checkbox", cls: "ns-check" });
    box.checked = on;
    const text = row.createDiv({ cls: "ns-ttext" });
    text.createDiv({ cls: "ns-ttitle", text: file.basename });
    const preview = text.createDiv({ cls: "ns-tpreview" });
    this.fillPreview(file, preview);
    const open = row.createEl("button", { cls: "ns-open clickable-icon", attr: { "aria-label": file.basename } });
    setIcon(open, "external-link");
    open.addEventListener("click", (e) => {
      e.stopPropagation();
      void this.app.workspace.getLeaf("tab").openFile(file);
    });
    row.addEventListener("click", (e) => this.onRowClick(index, e.shiftKey));
  }

  private fillPreview(file: TFile, el: HTMLElement) {
    const cached = this.previews.get(file.path);
    if (cached !== undefined) {
      el.setText(cached);
      return;
    }
    void this.app.vault.cachedRead(file).then((text) => {
      const line = text.replace(/^---\n[\s\S]*?\n---\n?/, "").split("\n").map((l) => l.replace(/^#+\s*/, "").trim()).find((l) => l && l !== file.basename) ?? "";
      this.previews.set(file.path, line.slice(0, 160));
      el.setText(line.slice(0, 160));
    });
  }

  private onRowClick(index: number, range: boolean) {
    const file = this.files[index];
    if (range && this.anchor >= 0) {
      const [a, b] = [Math.min(this.anchor, index), Math.max(this.anchor, index)];
      for (let i = a; i <= b; i++) this.selected.add(this.files[i].path);
    } else {
      if (this.selected.has(file.path)) this.selected.delete(file.path);
      else this.selected.add(file.path);
      this.anchor = index;
    }
    this.renderRows();
    this.updateBar();
  }

  private renderChips() {
    this.chipsEl.empty();
    const { settings, history } = this.plugin.data;
    const ranked = rankFolders(history, allFolderPaths(this.app), settings.excludeFolders, this.source, settings.candidateCount, Date.now());
    this.ranked = ranked;
    this.plainDigits = digitShortcutsArePlain(allFolderPaths(this.app));
    ranked.forEach((folder, i) => {
      const chip = this.chipsEl.createEl("button", { cls: "ns-chip" });
      if (i < 9) chip.createSpan({ cls: "ns-digit", text: this.plainDigits ? String(i + 1) : `${MOD_LABEL}${i + 1}` });
      chip.createSpan({ text: folder === ROOT ? t("modal.root") : folder });
      chip.addEventListener("click", () => void this.moveSelected(folder, false));
    });
    this.chipsEl
      .createEl("button", { cls: "ns-chip ns-chip-more", text: t("triage.more") })
      .addEventListener("click", () => this.pickMore());
  }

  private onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input, textarea, button")) return;
    const action = triageAction(e, this.plainDigits);
    if (!action || this.files.length === 0) return;
    if (action.kind === "folder" && (e.metaKey || e.ctrlKey)) return; // handled by the scope above
    e.preventDefault();
    e.stopPropagation();
    if (action.kind === "step") {
      if (action.extend && this.anchor < 0) this.anchor = this.cursor;
      this.cursor = clampCursor(this.cursor + action.delta, this.files.length);
      if (action.extend) {
        const [a, b] = [Math.min(this.anchor, this.cursor), Math.max(this.anchor, this.cursor)];
        for (let i = a; i <= b; i++) this.selected.add(this.files[i].path);
      }
      this.scrollToCursor();
    } else if (action.kind === "toggle") {
      const path = this.files[this.cursor].path;
      if (this.selected.has(path)) this.selected.delete(path);
      else this.selected.add(path);
      this.anchor = this.cursor;
    } else if (action.kind === "all") {
      this.toggleAll();
      return;
    } else if (action.kind === "folder") {
      this.moveToChip(action.n);
      return;
    } else {
      this.pickMore();
      return;
    }
    this.renderRows();
    this.updateBar();
  }

  private moveToChip(n: number) {
    const dest = this.ranked[n - 1];
    if (dest !== undefined && this.files.length > 0) void this.moveSelected(dest, false);
  }

  private scrollToCursor() {
    const top = this.cursor * ROW_HEIGHT;
    const height = this.scrollEl.clientHeight || FALLBACK_HEIGHT;
    if (top < this.scrollEl.scrollTop) this.scrollEl.scrollTop = top;
    else if (top + ROW_HEIGHT > this.scrollEl.scrollTop + height) this.scrollEl.scrollTop = top + ROW_HEIGHT - height;
  }

  private pickMore() {
    new FolderPickerModal(this.app, this.plugin, this.source, (f, created) => void this.moveSelected(f, created)).open();
  }

  private async moveSelected(dest: string, create: boolean) {
    const files = this.files.filter((f) => this.selected.has(f.path));
    if (files.length === 0 && this.files[this.cursor]) files.push(this.files[this.cursor]);
    if (files.length === 0) return;
    // Clear first: a second tap while the move runs must not move the same notes again.
    this.selected.clear();
    this.anchor = -1;
    this.updateBar();
    await moveNotes(this.plugin, files, dest, { create, afterUndo: () => this.reload() });
    this.reload();
    this.contentEl.focus();
  }

  onResize() {
    this.renderRows();
  }

  async onClose() {
    this.contentEl.empty();
  }
}
