# Green Book Toggle Controller Design

## Goal

Rebuild the green book controller for the reworked football world book as a toggle-only controller.

The world book is the source of truth. The controller adapts to the existing world book structure and must not require the world book to adopt controller-specific IDs, prefixes, localStorage metadata, or grouping rules.

## Hard Constraints

- Do not change the world book structure.
- Do not change entry UID, order, displayIndex, comment prefix, title, content, keys, depth, position, MVU placement, or initvar placement.
- Do not add, delete, rename, drag, or edit world book entries from this controller.
- Persist only existing entry enabled state by writing canonical `entry.disable`.
- When legacy `originalData.entries` is present, keep `legacyEntry.enabled` synchronized through the existing store behavior.
- Treat the MVU top entries and the final initvar entry as fixed world book anchors.

## Architecture

Keep `drgon_book/lore-book-controller-store.js` as the persistence layer because it already limits writes to enabled state.

Replace the green controller's static tree and editing model with a derived view:

1. Load the configured world book with `loadWorldInfo(BOOK_FILE)`.
2. Derive groups from existing entry comments and entry order.
3. Render rows and switches from the current book data.
4. Save single-entry or batch group state through `store.setState()` / `store.setStates()`.

No localStorage subsection state is used. No controller-only virtual tree is written back into the book.

## Grouping

The controller groups entries by the first bracketed comment prefix:

- `timeline`: years and football yearbook entries.
- `league`: leagues, competitions, and tactical evolution entries.
- `club`: club entries.
- `career`: career rules and career-state entries.
- `position`: role and position entries.
- `national`: national team entries.
- `city`: city and place entries.
- `award`: player and award entries.
- `overview` and `tree`: structural overview entries.
- `mvu_update`, `initvar`, and no-prefix entries: system entries.

Within each group, sort by `displayIndex` first, then `order`, then `uid`.

Displayed labels may strip only the leading bracket prefix for readability. This is display-only and is never written back.

## Locked Entries

The controller displays but does not allow toggling for system or structural entries:

- `[mvu_update]...`
- `[tree]...`
- `[overview]...`
- `[initvar]...`
- no-prefix entries unless explicitly classified as content later

Batch group toggles must skip locked entries.

All other grouped content entries can be toggled individually. Batch controls apply only to unlocked entries in the current group.

## UI

Keep the floating launcher and panel model.

The panel becomes a compact toggle dashboard:

- Header: title, refresh, close.
- Toolbar: search input and current status.
- Group list: group title, total count, on count, off count, batch on/off buttons when the group has unlocked entries.
- Entry rows: title, UID, prefix/status metadata, and a switch for unlocked entries.

Remove the editor panel and all controls for:

- New entry creation.
- Entry deletion.
- Entry renaming.
- Content editing.
- Key editing.
- Drag and drop.
- Subsection creation, deletion, movement, or localStorage placement.

Mobile layout remains single-column and scrollable.

## Error Handling

- If loading fails, keep the panel open and show an error status.
- If a save fails, revert the switch UI to its previous state and show an error status.
- Missing entries during save are reported in status but do not cause structural recovery.
- Refresh always re-derives the UI from current world book data.

## Verification

Use the current Luker football world book sample only as read-only fixture evidence.

Verification must include:

- A syntax check for every green controller JavaScript file with `node --check`.
- A derived grouping check against the football world book JSON confirming entries are classified without mutating the file.
- A locked-entry check confirming MVU, tree, overview, initvar, and no-prefix system entries are skipped by batch toggles.
- A persistence-path check confirming toggle writes use only `disable` and, when present, legacy `enabled`.

