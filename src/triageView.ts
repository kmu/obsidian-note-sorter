import { ItemView, TFile, TFolder, setIcon, type WorkspaceLeaf } from "obsidian";
import { FolderPickerModal } from "./folderPicker";
import { rankFolders } from "./history";
import type NoteSorterPlugin from "./main";
import { allFolderPaths, moveNotes } from "./moveFlow";
import { sortSiblings } from "./next";
import { t } from "./t";

export const TRIAGE_VIEW_TYPE = "note-sorter-triage";

const ROOT = "/";
const ROW_HEIGHT = 52;
const BUFFER_ROWS = 8;

export class TriageView extends ItemView {
  private source = ROOT;
  private files: TFile[] = [];
  private selected = new Set<string>();
  private anchor = -1;
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

    const head = contentEl.createDiv({ cls: "ns-head" });
    this.sourceEl = head.createSpan({ cls: "ns-source" });
    head.createEl("button", { text: t("triage.change") }).addEventListener("click", () => {
      new FolderPickerModal(this.app, this.plugin, "", (folder) => this.setSource(folder), t("triage.pickFolder")).open();
    });

    const bar = contentEl.createDiv({ cls: "ns-bar" });
    this.allBtn = bar.createEl("button", { text: t("triage.selectAll") });
    this.allBtn.addEventListener("click", () => this.toggleAll());
    this.countEl = bar.createSpan({ cls: "ns-count" });

    this.scrollEl = contentEl.createDiv({ cls: "ns-scroll" });
    this.spacerEl = this.scrollEl.createDiv({ cls: "ns-spacer" });
    this.rowsEl = this.scrollEl.createDiv({ cls: "ns-rows" });
    this.scrollEl.addEventListener("scroll", () => this.renderRows());
    this.registerDomEvent(window, "resize", () => this.renderRows());

    this.chipsEl = contentEl.createDiv({ cls: "ns-chips" });

    const touchesSource = (path: string) => path.startsWith(this.source === ROOT ? "" : this.source + "/");
    for (const name of ["create", "delete"] as const) {
      this.registerEvent(this.app.vault.on(name as "create", (f) => touchesSource(f.path) && this.queueRefresh()));
    }
    this.registerEvent(this.app.vault.on("rename", (_f, old) => touchesSource(old) && this.queueRefresh()));

    if (this.source === ROOT) this.source = this.plugin.data.settings.inboxFolder || this.app.workspace.getActiveFile()?.parent?.path || ROOT;
    this.reload();
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
    const last = Math.min(this.files.length, Math.ceil((this.scrollEl.scrollTop + this.scrollEl.clientHeight) / ROW_HEIGHT) + BUFFER_ROWS);
    this.rowsEl.style.transform = `translateY(${first * ROW_HEIGHT}px)`;
    for (let i = first; i < last; i++) this.renderRow(i);
  }

  private renderRow(index: number) {
    const file = this.files[index];
    const row = this.rowsEl.createDiv({ cls: "ns-trow" });
    row.style.height = `${ROW_HEIGHT}px`;
    const on = this.selected.has(file.path);
    row.toggleClass("is-selected", on);
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
    for (const folder of ranked) {
      const chip = this.chipsEl.createEl("button", { cls: "ns-chip", text: folder === ROOT ? t("modal.root") : folder });
      chip.addEventListener("click", () => void this.moveSelected(folder));
    }
    this.chipsEl
      .createEl("button", { cls: "ns-chip ns-chip-more", text: t("triage.more") })
      .addEventListener("click", () => new FolderPickerModal(this.app, this.plugin, this.source, (f) => void this.moveSelected(f)).open());
  }

  private async moveSelected(dest: string) {
    const files = this.files.filter((f) => this.selected.has(f.path));
    if (files.length === 0) return;
    await moveNotes(this.plugin, files, dest, () => this.reload());
    this.selected.clear();
    this.anchor = -1;
    this.reload();
  }

  async onClose() {
    this.contentEl.empty();
  }
}
