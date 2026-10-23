import { Notice, Plugin, TFile, debounce } from "obsidian";
import { parseSaved, type SavedData } from "./data";
import { FolderPickerModal } from "./folderPicker";
import { recordMove } from "./history";
import { folderOf, sortActiveNote } from "./moveFlow";
import { NoteSorterSettingTab } from "./settingsTab";
import { t } from "./t";

export default class NoteSorterPlugin extends Plugin {
  data: SavedData = parseSaved(null);

  readonly requestSave = debounce(() => void this.saveData(this.data), 500, true);

  async onload() {
    this.data = parseSaved(await this.loadData());
    this.addSettingTab(new NoteSorterSettingTab(this));
    this.addCommand({
      id: "sort-current",
      name: t("cmd.sortCurrent"),
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof TFile)) {
          new Notice(t("notice.noNote"));
          return;
        }
        new FolderPickerModal(this.app, this, folderOf(file), (dest) => void sortActiveNote(this, file, dest)).open();
      },
    });
  }

  onunload() {
    void this.saveData(this.data);
  }

  recordDestination(folder: string) {
    this.data.history = recordMove(this.data.history, folder, Date.now());
    this.requestSave();
  }
}
