export type Locale = "en" | "ja";

const en = {
  "cmd.sortCurrent": "Move current note to a folder",
  "cmd.openTriage": "Open triage view",

  "modal.placeholder": "Type a folder name…",
  "modal.create": "Create folder “{folder}” and move",
  "modal.empty": "No matching folder",
  "modal.root": "(vault root)",

  "notice.moved": "Moved {count} to {folder}",
  "notice.undo": "Undo",
  "notice.undone": "Moved back",
  "notice.undoFailed": "Could not move everything back: {message}",
  "notice.skipped": "Skipped {count} (same name exists there): {names}",
  "notice.failed": "Could not move {count}: {names}",
  "notice.noNote": "Open a note first",

  "triage.title": "Triage",
  "triage.source": "Folder: {folder}",
  "triage.change": "Change",
  "triage.selectAll": "Select all",
  "triage.selectNone": "Select none",
  "triage.selected": "{count} selected",
  "triage.more": "More…",
  "triage.empty": "No notes in this folder.",
  "triage.pickFolder": "Choose the folder to sort",

  "settings.candidateCount": "Number of suggestions",
  "settings.candidateCountDesc": "How many folders to suggest (3 to 20).",
  "settings.exclude": "Folders to leave out",
  "settings.excludeDesc": "One folder per line. These and their subfolders are never suggested.",
  "settings.inbox": "Folder to sort",
  "settings.inboxDesc": "Used by the triage view. Leave empty to use the folder of the open note.",
  "settings.sort": "Order of notes",
  "settings.sortDesc": "Decides which note opens next, and the order in the triage view.",
  "sort.name": "Name",
  "sort.created": "Created",
  "sort.modified": "Modified",
};

const ja: Record<keyof typeof en, string> = {
  "cmd.sortCurrent": "開いているノートをフォルダへ移動",
  "cmd.openTriage": "仕分けビューを開く",

  "modal.placeholder": "フォルダ名を入力…",
  "modal.create": "フォルダ「{folder}」を作って移動",
  "modal.empty": "一致するフォルダがありません",
  "modal.root": "（保管庫のルート）",

  "notice.moved": "{count} 件を {folder} に移動しました",
  "notice.undo": "元に戻す",
  "notice.undone": "元の場所に戻しました",
  "notice.undoFailed": "すべては戻せませんでした: {message}",
  "notice.skipped": "{count} 件は移動先に同じ名前があるため移していません: {names}",
  "notice.failed": "{count} 件を移動できませんでした: {names}",
  "notice.noNote": "先にノートを開いてください",

  "triage.title": "仕分け",
  "triage.source": "フォルダ: {folder}",
  "triage.change": "変更",
  "triage.selectAll": "すべて選択",
  "triage.selectNone": "選択を解除",
  "triage.selected": "{count} 件を選択中",
  "triage.more": "ほかのフォルダ…",
  "triage.empty": "このフォルダにはノートがありません。",
  "triage.pickFolder": "仕分けるフォルダを選んでください",

  "settings.candidateCount": "候補の数",
  "settings.candidateCountDesc": "提案するフォルダの数（3〜20）。",
  "settings.exclude": "候補から外すフォルダ",
  "settings.excludeDesc": "1行に1フォルダ。ここに書いたフォルダとその中のフォルダは、提案しません。",
  "settings.inbox": "仕分けるフォルダ",
  "settings.inboxDesc": "仕分けビューで使います。空にすると、開いているノートのフォルダを使います。",
  "settings.sort": "ノートの並び順",
  "settings.sortDesc": "次に開くノートと、仕分けビューの並び順を決めます。",
  "sort.name": "名前",
  "sort.created": "作成日",
  "sort.modified": "更新日",
};

export type MessageKey = keyof typeof en;
export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ja };

/** Obsidian's language code ("ja", "en", "zh-TW" …) to a language we have text for. */
export function pickLocale(language: string | null | undefined): Locale {
  return /^ja(\b|-|_|$)/i.test(language ?? "") ? "ja" : "en";
}

export function translate(locale: Locale, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[locale][key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}
