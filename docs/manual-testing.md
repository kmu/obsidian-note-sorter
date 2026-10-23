# Manual testing

Logic (ranking, filtering, next note, move planning, translations, saved data) is covered by `npm test`. These checks need a real Obsidian 1.10 or later.

## Setup

1. `npm run build`; link or copy `main.js`, `manifest.json`, `styles.css` into `<test vault>/.obsidian/plugins/note-sorter/`.
2. Make a vault with an `Inbox` of five notes and several folders (include a nested one, one with spaces, one with Japanese letters).
3. Turn off restricted mode and enable **Note Sorter**.

## One note

- [ ] Command *Move current note to a folder* opens a list with a search box; with no history, folders are alphabetical.
- [ ] Pressing `1` moves the note and opens the next note of the folder; the notice shows "Moved 1 to …".
- [ ] Undo in the notice puts the note back and opens it.
- [ ] Moving the last note opens the previous one; moving the only note opens nothing.
- [ ] After a few moves, the most used folders come first.
- [ ] Typing filters (spaces, Japanese, nested paths); Up/Down and Enter work.
- [ ] Typing a new name shows "Create folder … and move" and creates it.
- [ ] A note with the same name in the destination is not moved, and a notice says so.
- [ ] Japanese input (IME) in the search box: Enter that confirms conversion does not move a note.
- [ ] The source folder never appears as a suggestion; folders in *Folders to leave out* do not either.
- [ ] Links to the moved note still work.

## Triage view

- [ ] *Open triage view* lists the notes of the chosen folder; the folder follows the setting or the open note.
- [ ] Row tap toggles; Shift-click selects a range; *Select all* / *Select none* work; the count is right.
- [ ] With nothing selected, folder chips are dimmed and do nothing.
- [ ] A chip moves all selected notes; they leave the list; Undo brings them back.
- [ ] *More…* opens the folder search; *Change* picks another source folder.
- [ ] 2,000 notes: opens quickly and scrolls smoothly.
- [ ] Creating or deleting a note in the folder updates the list.

## Phone

- [ ] The list rows and chips are easy to tap; nothing is cut off at the bottom.

## Language

- [ ] Japanese Obsidian shows Japanese text; English or any other shows English.

## Open question

- [ ] Does the desktop file explorer multi-select with Cmd/Ctrl-click? Record the answer in the README.
