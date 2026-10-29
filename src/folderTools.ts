import { Modal, Notice, TFolder, type App } from "obsidian";
import { deletableFolders, validNewFolder } from "./folders";
import { allFolderPaths } from "./moveFlow";
import { t } from "./t";

/** Ask for a new folder name. `moveCount` > 0 adds a choice to move the ticked notes into it. */
export class NewFolderModal extends Modal {
  constructor(
    app: App,
    private readonly moveCount: number,
    private readonly onDone: (path: string, move: boolean) => void,
  ) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass("ns-modal");
    const { contentEl } = this;
    contentEl.createEl("h3", { text: t("tools.newTitle") });
    const input = contentEl.createEl("input", { type: "text", cls: "ns-input", attr: { placeholder: t("tools.newPlaceholder") } });
    const hint = contentEl.createDiv({ cls: "ns-hint" });
    let move = this.moveCount > 0;
    if (this.moveCount > 0) {
      const label = contentEl.createEl("label", { cls: "ns-check-row" });
      const box = label.createEl("input", { type: "checkbox" });
      box.checked = true;
      box.addEventListener("change", () => (move = box.checked));
      label.createSpan({ text: t("tools.moveHere", { count: this.moveCount }) });
    }
    const create = contentEl.createEl("button", { text: t("tools.create"), cls: "mod-cta" });
    const check = () => {
      const path = validNewFolder(input.value, allFolderPaths(this.app));
      create.disabled = path === null;
      hint.setText(input.value.trim() === "" || path !== null ? "" : t("tools.newInvalid"));
      return path;
    };
    const submit = () => {
      const path = check();
      if (path === null) return;
      this.close();
      this.onDone(path, move);
    };
    input.addEventListener("input", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        submit();
      }
    });
    create.addEventListener("click", submit);
    check();
    input.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

/** Pick one empty folder and, after a confirmation, send it to the trash. */
export class DeleteFolderModal extends Modal {
  onOpen() {
    this.modalEl.addClass("ns-modal");
    this.showList();
  }

  private showList() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: t("tools.deleteTitle") });
    const folders = this.app.vault.getAllFolders(true).map((f) => ({ path: f.path, childCount: f.children.length }));
    const paths = deletableFolders(folders);
    if (paths.length === 0) {
      contentEl.createDiv({ cls: "ns-empty", text: t("tools.noneEmpty") });
      return;
    }
    contentEl.createDiv({ cls: "ns-hint", text: t("tools.onlyEmpty") });
    const list = contentEl.createDiv({ cls: "ns-list" });
    for (const path of paths) {
      const row = list.createDiv({ cls: "ns-row" });
      row.createSpan({ cls: "ns-name", text: path });
      row.addEventListener("click", () => this.confirm(path));
    }
  }

  private confirm(path: string) {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: t("tools.confirmTitle", { folder: path }) });
    contentEl.createDiv({ cls: "ns-hint", text: t("tools.confirmBody") });
    const row = contentEl.createDiv({ cls: "ns-buttons" });
    row.createEl("button", { text: t("tools.cancel") }).addEventListener("click", () => this.showList());
    row.createEl("button", { text: t("tools.delete"), cls: "mod-warning" }).addEventListener("click", () => void this.remove(path));
  }

  private async remove(path: string) {
    const folder = this.app.vault.getFolderByPath(path);
    // The folder may have been filled since the list was drawn; never trash a note with it.
    if (!(folder instanceof TFolder) || folder.children.length > 0) {
      new Notice(t("tools.notEmpty", { folder: path }));
      this.showList();
      return;
    }
    try {
      await this.app.fileManager.trashFile(folder);
      new Notice(t("tools.deleted", { folder: path }));
      this.close();
    } catch (e) {
      new Notice(t("tools.deleteFailed", { message: e instanceof Error ? e.message : String(e) }));
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
