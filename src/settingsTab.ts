import { PluginSettingTab, Setting } from "obsidian";
import type NoteSorterPlugin from "./main";
import type { SortKey } from "./next";
import { t } from "./t";

export class NoteSorterSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: NoteSorterPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.plugin.data.settings;

    new Setting(containerEl)
      .setName(t("settings.candidateCount"))
      .setDesc(t("settings.candidateCountDesc"))
      .addSlider((s) =>
        s.setLimits(3, 20, 1).setValue(settings.candidateCount).onChange((v) => {
          settings.candidateCount = v;
          this.plugin.requestSave();
        }),
      );

    new Setting(containerEl)
      .setName(t("settings.exclude"))
      .setDesc(t("settings.excludeDesc"))
      .addTextArea((a) =>
        a.setValue(settings.excludeFolders.join("\n")).onChange((v) => {
          settings.excludeFolders = v.split("\n").map((l) => l.trim().replace(/^\/+|\/+$/g, "")).filter(Boolean);
          this.plugin.requestSave();
        }),
      );

    new Setting(containerEl)
      .setName(t("settings.inbox"))
      .setDesc(t("settings.inboxDesc"))
      .addText((x) =>
        x.setValue(settings.inboxFolder).onChange((v) => {
          settings.inboxFolder = v.trim().replace(/^\/+|\/+$/g, "");
          this.plugin.requestSave();
        }),
      );

    new Setting(containerEl)
      .setName(t("settings.sort"))
      .setDesc(t("settings.sortDesc"))
      .addDropdown((d) =>
        d
          .addOption("name", t("sort.name"))
          .addOption("created", t("sort.created"))
          .addOption("modified", t("sort.modified"))
          .setValue(settings.sortKey)
          .onChange((v) => {
            settings.sortKey = v as SortKey;
            this.plugin.requestSave();
          }),
      );
  }
}
