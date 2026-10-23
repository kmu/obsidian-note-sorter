import { Notice, Plugin, TFile, debounce } from "obsidian";
import { parseSaved, type SavedData } from "./data";
import { FolderPickerModal } from "./folderPicker";
import { recordMove } from "./history";
import { folderOf, sortActiveNote } from "./moveFlow";
import { NoteSorterSettingTab } from "./settingsTab";
import { t } from "./t";
import { TRIAGE_VIEW_TYPE, TriageView } from "./triageView";

export default class NoteSorterPlugin extends Plugin {
  data: SavedData = parseSaved(null);

  readonly requestSave = debounce(() => void this.saveData(this.data), 500, true);

  async onload() {
    this.data = parseSaved(await this.loadData());
    this.addSettingTab(new NoteSorterSettingTab(this));
    this.registerView(TRIAGE_VIEW_TYPE, (leaf) => new TriageView(leaf, this));
    this.addCommand({
      id: "open-triage",
      name: t("cmd.openTriage"),
      callback: () => void this.openTriage(),
    });
    this.addCommand({
      id: "undo-last-move",
      name: t("cmd.undoLast"),
      callback: () => (this.lastUndo ? this.lastUndo() : new Notice(t("notice.nothingToUndo"))),
    });
    this.addCommand({
      id: "sort-current",
      name: t("cmd.sortCurrent"),
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof TFile)) {
          new Notice(t("notice.noNote"));
          return;
        }
        new FolderPickerModal(this.app, this, folderOf(file), (dest, created) => void sortActiveNote(this, file, dest, created)).open();
      },
    });
  }

  onunload() {
    void this.saveData(this.data);
  }

  async openTriage() {
    const existing = this.app.workspace.getLeavesOfType(TRIAGE_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    await this.app.workspace.getLeaf("tab").setViewState({ type: TRIAGE_VIEW_TYPE, active: true });
  }

  /** Undoes the most recent move; cleared once used or replaced by a newer move. */
  lastUndo: (() => void) | null = null;

  recordDestination(folder: string) {
    this.data.history = recordMove(this.data.history, folder, Date.now());
    this.requestSave();
  }
}
