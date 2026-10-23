import { Plugin, debounce } from "obsidian";
import { parseSaved, type SavedData } from "./data";
import { recordMove } from "./history";
import { NoteSorterSettingTab } from "./settingsTab";

export default class NoteSorterPlugin extends Plugin {
  data: SavedData = parseSaved(null);

  readonly requestSave = debounce(() => void this.saveData(this.data), 500, true);

  async onload() {
    this.data = parseSaved(await this.loadData());
    this.addSettingTab(new NoteSorterSettingTab(this));
  }

  onunload() {
    void this.saveData(this.data);
  }

  recordDestination(folder: string) {
    this.data.history = recordMove(this.data.history, folder, Date.now());
    this.requestSave();
  }
}
