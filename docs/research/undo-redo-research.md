# Undo and redo research

Date completed: 2026-09-01

## Question

How should the local-first CPS provide document-wide undo and redo without
breaking the immutable Baseline/Working Codeplug model, stealing native text
editing shortcuts, or retaining unbounded `102,400`-byte histories?

This note covers the active browser session only. Undo history is not a backup,
is not part of a `.uvl15cps` file, and must not weaken Radio Write or restore
validation.

## Primary-source findings

### State model and branch behavior

- React requires objects held in state to be treated as read-only snapshots.
  Its documentation specifically identifies undo/redo as a feature made easier
  by retaining immutable past snapshots. See
  [React: Updating Objects in State](https://react.dev/learn/updating-objects-in-state#why-is-mutating-state-not-recommended-in-react).
- When an update depends on the current value, React recommends a functional
  state updater. Updaters must be pure because React can call them more than
  once in development. See
  [React: Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates#updating-the-same-state-multiple-times-before-the-next-render).
- The official Redux undo recipe models history as `past`, `present`, and
  `future`. Undo moves the current state into `future`; redo moves it back into
  `past`; a new edit made after undo clears `future`; and an update that returns
  the same state creates no history entry. These rules are useful independently
  of whether an application uses Redux. See
  [Redux: Implementing Undo History](https://redux.js.org/usage/implementing-undo-history#understanding-undo-history).

The CPS already satisfies the key prerequisite: `Codeplug` owns a copied byte
array, every edit constructs a new `Codeplug`, `toBytes()` returns a copy, and
the controller replaces rather than mutates its document state. A history
entry must keep the Working Codeplug and its semantic Change Set together;
restoring only bytes would leave the write review and pending-change count out
of sync.

### Undo units, grouping, and limits

- Apple recommends multiple undo levels, describes opening or saving a
  document as examples of logical boundaries, and recommends grouping related
  incremental adjustments when that produces a result people can predict. It
  also recommends naming the operation and making an off-screen result visible.
  See the
  [Apple Human Interface Guidelines: Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo).
- ProseMirror's maintained history module retains 100 events by default and
  groups adjacent edits that occur within 500 ms by default. It also supports
  explicitly excluding transactions from history. This is evidence for an
  explicit bounded-event policy and explicit transaction boundaries rather
  than saving every render. See the
  [ProseMirror history API](https://prosemirror.net/docs/ref/#history).

The CPS does not need time-based typing coalescing today. Text inputs keep a
local draft and commit once on blur or Enter; selects and switches already
emit one semantic operation. Therefore, one successful controller command is
one undo event. A future slider or live-preview control should explicitly open
and close a history group instead of relying on a hidden global timer.

The product should retain the most recent **100** undo events for the active
document. The implemented revision shape stores only the firmware `3.07.23`
Codeplug's 102,400 raw bytes plus its small semantic Change Set, rather than
duplicating decoded structures. One hundred full raw revisions therefore use
about 9.8 MiB before small object overhead: a useful multi-step recovery window
with an explicit memory ceiling. The oldest past event is discarded when the
limit is exceeded; available redo events use the same limit. The history limit
is an application decision, not a value mandated by the cited editor libraries.

### Keyboard conventions and native text editing

- Apple specifies Command-Z for undo and Shift-Command-Z for redo. See
  [Apple keyboard guidance](https://developer.apple.com/design/human-interface-guidelines/keyboards)
  and its [undo/redo guidance](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo#macOS).
- Microsoft specifies Ctrl-Z for undo and Ctrl-Y for redo in Windows
  applications. See
  [Microsoft keyboard accelerators](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-accelerators#common-keyboard-accelerators).
- The W3C Input Events draft distinguishes browser editing intentions named
  `historyUndo` and `historyRedo` for editing hosts. See
  [Input Events Level 2](https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes).

The CPS should support:

| Platform intent | Undo      | Redo                    |
| --------------- | --------- | ----------------------- |
| macOS           | Command-Z | Shift-Command-Z         |
| Windows/Linux   | Ctrl-Z    | Ctrl-Y and Ctrl-Shift-Z |

The app-level handler must not intercept these keys while the event target is
an `input`, `textarea`, `select`, or contenteditable element. In those controls,
the browser owns native draft editing and composition history. Once the field
commits and focus leaves the editor, the same shortcut operates on CPS document
history. The handler should ignore Alt-modified shortcuts, check `event.key`
rather than a physical key code, and call `preventDefault()` only after it has
recognized an enabled app command.

### Accessibility and discoverability

- `aria-keyshortcuts` communicates implemented shortcuts to assistive
  technologies but does not implement them. WAI-ARIA requires the application
  to handle the key event, recommends exposing shortcuts through visible help
  such as a tooltip, and requires shortcuts on disabled elements to be
  unavailable. See
  [WAI-ARIA 1.2: `aria-keyshortcuts`](https://www.w3.org/TR/wai-aria/#aria-keyshortcuts).
- Apple recommends standard undo/redo symbols in a toolbar when dedicated
  buttons are needed, operation-specific labels such as “Undo Typing,” and
  feedback when an operation affects content that is not visible. See
  [Apple Human Interface Guidelines: Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo).

Use native shadcn `Button` controls in the persistent desktop shell so the
commands are available on every editor route. Each button needs a localized
accessible name, shortcut text in its tooltip, `aria-keyshortcuts`, and a real
disabled state when its stack is empty. Generic Undo and Redo labels are
appropriate for the first implementation because the history revision is a
document snapshot rather than an action log; the visible Working Codeplug and
Change Set provide the result feedback without introducing a parallel semantic
labeling system that can drift from the actual bytes.

## Recommended CPS contract

### History state

Create a small pure module owned by `modules/cps-workspace/`, conceptually:

```ts
interface CodeplugDocumentSnapshot {
  readonly completedRead: ActiveCodeplugDocument | null
  readonly changes: readonly WorkspaceChange[]
}

interface CodeplugHistory {
  readonly past: readonly CodeplugDocumentSnapshot[]
  readonly present: CodeplugDocumentSnapshot
  readonly future: readonly CodeplugDocumentSnapshot[]
}
```

The actual shape may keep immutable document identity outside each entry and
store only the Working Codeplug plus Change Set. The invariant matters more
than the exact nesting: one history transition must atomically restore both the
Working Codeplug and Change Set while preserving Baseline, binding, Source
Radio provenance, CPS-file metadata, and raw-import metadata.

The module should expose pure operations for `initialize`, `record`, `undo`,
`redo`, and capability selectors. It needs no dependency. Controller edits
remain functional state updates and perform no side effects inside the updater.

### What creates one event

Record one event for every successful semantic Codeplug command:

- field, select, switch, tone, membership, and settings commits;
- add, duplicate, delete, and move channel;
- Zone, Scan List, VFO Scan Edge, FM preset, and menu-visibility edits;
- Reset Working Codeplug, as one event, so a single Undo restores the exact
  pre-reset Working Codeplug and Change Set;
- future bulk-edit commands, as one event per confirmed bulk operation.

Do not record:

- draft keystrokes before a field commits;
- invalid or no-op edits whose resulting Codeplug equals the current one;
- search, filters, selected tab, open drawers, navigation, or dialog state;
- downloads, CPS File export, named-copy save, diagnostic reports, or Radio
  Write preparation/review;
- undo or redo themselves as new events.

After Undo, any new Codeplug edit or Reset clears Redo. Returning to the
Baseline by ordinary edits does **not** erase earlier history; it only makes the
current Change Set empty. The user may still undo that edit.

### Document boundaries

Initialize an empty history when any operation replaces the active document:

- successful Radio Read;
- opening a `.uvl15cps` file or named Working Codeplug;
- importing a raw Unbound `.bin`;
- successful restore preparation after its fresh Radio Read;
- successful Radio Write, which creates a new accepted Baseline.

An imported CPS File can begin with a non-empty Change Set, but that initial
state has no Undo entry. Reset is then a single undoable command: Undo restores
the imported Working Codeplug and its original imported-change evidence.

History remains session-only and document-local. Do not serialize it to CPS
Files, IndexedDB named documents, automatic Backup History, diagnostic reports,
or Radio Write recovery. Saving/exporting a copy does not mutate the active
document and therefore should neither add a history event nor clear history.

### Safety boundary

Undo/redo changes only the in-memory Working Codeplug and Change Set. It never:

- changes the immutable Baseline Backup;
- adds Source Radio identity or changes document binding;
- writes to the Radio or prepares a restore;
- alters an already prepared Radio Write snapshot.

To avoid presenting a stale write review, document editing, Undo, Redo, and
Reset should be unavailable while a Radio Write operation has a prepared or
active snapshot. If the existing UI permits ordinary editing while a review is
open, implementation must either invalidate that prepared snapshot on every
document transition or block all document transitions until it is discarded.
Blocking is the simpler and safer initial rule.

## Acceptance tests

1. One edit creates one Undo event; Undo restores both bytes and semantic
   changes; Redo restores both again.
2. A no-op edit creates no event.
3. Two distinct commits require two Undo actions; one text draft committed on
   blur requires one.
4. Undo followed by a new edit clears Redo.
5. Reset with pending changes is one undoable event; Reset with no pending
   changes creates none.
6. Returning a field to Baseline yields an empty Change Set but remains
   undoable.
7. The 101st recorded event discards only the oldest event; history never grows
   beyond 100 past or future entries.
8. Opening/reading/importing/replacing a document clears both stacks.
9. Bound, CPS-file, and raw Unbound documents retain their binding and
   provenance through Undo/Redo.
10. Command-Z and Ctrl-Z undo; Shift-Command-Z, Ctrl-Shift-Z, and Ctrl-Y redo.
    The same keys inside an input/textarea/contenteditable retain native
    editing behavior.
11. Disabled buttons do nothing and expose no active shortcut; enabled buttons
    have localized names and shortcut help.
12. Undo/redo cannot change a prepared or active Radio Write operation.

## Recommendation

Implement document-wide, session-only history as a pure bounded
`past/present/future` module around the controller's immutable Working Codeplug
and Change Set. Treat each existing semantic commit as one event, make Reset one
event, clear history only when the active document is replaced, retain 50
events, and clear Redo on a branched edit. Add persistent shell buttons plus
platform-standard shortcuts, while leaving native form-control undo untouched.
Keep history entirely outside persistence and Radio operation records, and
retain at most 100 compact raw-byte revisions.
