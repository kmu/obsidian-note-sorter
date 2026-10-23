# Note Sorter

Move notes to folders without the menu, the Move dialog and the typing. Note Sorter suggests where a note should go, moves it in one tap or one key, and opens the next note of the folder so you can keep going. A triage view lets you tick many notes and move them together.

Works on desktop and mobile.

## Features

- **Suggested folders.** The folders you move notes to most, and most recently, come first. Everything else is a few letters away.
- **One tap or one key.** Tap a suggestion, or press its number (1–9). If some folder name starts with a digit (a year, say), typing digits searches instead, and the number shortcut becomes Cmd/Ctrl plus the number. Type to search any folder; press Enter to move.
- **New folders on the fly.** Type a name that does not exist and choose "Create folder … and move".
- **Next note opens.** After a move, the next note in the same folder opens, in the order you choose (name, created, modified).
- **Triage view.** List the notes of a folder, tick several (Shift-click selects a range), and tap a folder at the bottom to move them all.
- **Undo.** Every move shows a notice with an Undo button. Links to moved notes are kept up to date.
- **Safe with names.** A note whose name already exists in the destination stays where it is, and you are told.

## Use

- **One note:** open it, run the command **Move current note to a folder** (bind it to a hotkey in *Settings → Hotkeys*), then tap a suggestion or press its number.
- **Many notes:** run **Open triage view**, tick notes, tap a folder chip.

## Settings

- *Number of suggestions* (3–20).
- *Folders to leave out*: never suggested.
- *Folder to sort*: the triage view's folder; empty means the folder of the open note.
- *Order of notes*: decides which note opens next and the order in the triage view.

## Install

Note Sorter needs Obsidian 1.10.0 or later. Until it is in the community plugin list, install it from a release.

1. Open the [latest release](https://github.com/kmu/obsidian-note-sorter/releases/latest) and download `main.js`, `manifest.json` and `styles.css`.
2. In your vault, make the folder `.obsidian/plugins/note-sorter/` (the name must be `note-sorter`) and put the three files in it. `.obsidian` is hidden: press `Cmd+Shift+.` in the macOS Finder, or turn on *Hidden items* in the Windows Explorer.
3. In **Settings → Community plugins**, turn off *Restricted mode* if needed, reload the list, and switch **Note Sorter** on.

## Development

```sh
npm install
npm run dev      # watch build
npm test         # logic tests (vitest)
npm run lint
npm run build
```

Link or copy `main.js`, `manifest.json` and `styles.css` into a test vault's `.obsidian/plugins/note-sorter/`. `docs/manual-testing.md` lists what to check by hand.

## License

[MIT](LICENSE)
