import { getLanguage } from "obsidian";
import { MessageKey, pickLocale, translate } from "./i18n";

/** Text in the language Obsidian is set to, English if we have no translation for it. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(pickLocale(getLanguage()), key, params);
}
