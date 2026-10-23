import { Modal, type App } from "obsidian";
import { filterFolders, validNewFolder } from "./folders";
import { rankFolders } from "./history";
import type NoteSorterPlugin from "./main";
import { allFolderPaths } from "./moveFlow";
import { t } from "./t";

type Row = { path: string; create: boolean };
const ROOT = "/";
const TYPED_LIMIT = 50;

/** A list of suggested folders with a search box; tap, press a digit, or type and press Enter. */
export class FolderPickerModal extends Modal {
  private input!: HTMLInputElement;
  private listEl!: HTMLElement;
  private rows: Row[] = [];
  private active = 0;
  private readonly folders: string[];

  constructor(
    app: App,
    private readonly plugin: NoteSorterPlugin,
    private readonly source: string,
    private readonly onChoose: (folder: string) => void,
    private readonly placeholder: string = t("modal.placeholder"),
  ) {
    super(app);
    this.folders = allFolderPaths(app);
  }

  onOpen() {
    this.modalEl.addClass("ns-modal");
    this.input = this.contentEl.createEl("input", { type: "text", cls: "ns-input", attr: { placeholder: this.placeholder } });
    this.listEl = this.contentEl.createDiv({ cls: "ns-list" });
    this.input.addEventListener("input", () => this.refresh());
    this.input.addEventListener("keydown", (e) => this.onKey(e));
    this.refresh();
    this.input.focus();
  }

  private refresh() {
    const query = this.input.value;
    const { settings, history } = this.plugin.data;
    const candidates = this.folders.filter((f) => f !== this.source);
    if (query.trim() === "") {
      const ranked = rankFolders(history, this.folders, settings.excludeFolders, this.source, settings.candidateCount, Date.now());
      this.rows = ranked.map((path) => ({ path, create: false }));
    } else {
      this.rows = filterFolders(query, candidates, TYPED_LIMIT).map((path) => ({ path, create: false }));
      const fresh = validNewFolder(query, this.folders);
      if (fresh !== null) this.rows.push({ path: fresh, create: true });
    }
    this.active = 0;
    this.render(query.trim() === "");
  }

  private render(showDigits: boolean) {
    this.listEl.empty();
    if (this.rows.length === 0) this.listEl.createDiv({ cls: "ns-empty", text: t("modal.empty") });
    this.rows.forEach((row, i) => {
      const el = this.listEl.createDiv({ cls: "ns-row" });
      if (i === this.active) el.addClass("is-active");
      if (showDigits && i < 9) el.createSpan({ cls: "ns-digit", text: String(i + 1) });
      const label = row.create ? t("modal.create", { folder: row.path }) : row.path === ROOT ? t("modal.root") : row.path;
      el.createSpan({ cls: "ns-name", text: label });
      el.addEventListener("click", () => this.choose(row));
    });
  }

  private onKey(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (/^[1-9]$/.test(e.key) && this.input.value === "") {
      const row = this.rows[Number(e.key) - 1];
      if (row) {
        e.preventDefault();
        this.choose(row);
      }
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (this.rows.length === 0) return;
      this.active = (this.active + (e.key === "ArrowDown" ? 1 : -1) + this.rows.length) % this.rows.length;
      this.render(this.input.value === "");
      this.listEl.children[this.active]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = this.rows[this.active];
      if (row) this.choose(row);
    }
  }

  private choose(row: Row) {
    this.close();
    this.onChoose(row.path);
  }

  onClose() {
    this.contentEl.empty();
  }
}
