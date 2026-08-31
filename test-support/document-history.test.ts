import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import {
  DOCUMENT_HISTORY_LIMIT,
  REDO_DOCUMENT_EDIT,
  UNDO_DOCUMENT_EDIT,
  canRedoDocumentEdit,
  canUndoDocumentEdit,
  commitDocumentEdit,
  createDocumentHistory,
  redoDocumentEdit,
  replaceDocumentHistory,
  undoDocumentEdit,
  updateDocumentHistory,
  type EditableCodeplugDocumentState,
} from "../modules/cps-workspace/document-history.ts"
import type { WorkspaceChange } from "../modules/cps-workspace/change-set.ts"
import type { ActiveCodeplugDocument } from "../modules/cps-workspace/codeplug-document.ts"

function documentState(
  value: number,
  id = "baseline-a",
  changes: readonly WorkspaceChange[] = Object.freeze([])
): EditableCodeplugDocumentState {
  const baselineBytes = new Uint8Array(CODEPLUG_SIZE)
  const baselineCodeplug = createCodeplug(baselineBytes)
  const baselineBackup = Object.freeze({
    id,
    sha256: id,
    sourceRadio: null,
    codeplug: baselineCodeplug,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  })
  const bytes = baselineBytes.slice()
  bytes[0] = value
  const completedRead: ActiveCodeplugDocument = Object.freeze({
    binding: "unbound",
    sourceRadio: null,
    baselineBackup,
    workingCodeplug: Object.freeze({
      sourceRadio: null,
      baselineBackup,
      codeplug: createCodeplug(bytes),
    }),
    backupHistory: Object.freeze([]),
    rawImport: Object.freeze({
      fileName: "test.bin",
      importedAt: new Date("2026-09-01T00:00:00.000Z"),
      byteLength: CODEPLUG_SIZE,
      sha256: id,
      layoutId: "uvl15w-3.07.23",
    }),
  })

  return Object.freeze({ completedRead, changes })
}

function valueOf(state: EditableCodeplugDocumentState) {
  return state.completedRead?.workingCodeplug.codeplug.toBytes()[0]
}

test("undoes and redoes complete Working Codeplug revisions", () => {
  const firstChange = Object.freeze({
    kind: "edit-memory-channel" as const,
    number: 1,
    field: "name" as const,
  })
  const secondChange = Object.freeze({
    kind: "edit-memory-channel" as const,
    number: 2,
    field: "name" as const,
  })
  let history = createDocumentHistory(documentState(0))
  history = commitDocumentEdit(history, () =>
    documentState(1, "baseline-a", [firstChange])
  )
  history = commitDocumentEdit(history, () =>
    documentState(2, "baseline-a", [firstChange, secondChange])
  )

  assert.equal(valueOf(history.present), 2)
  assert.deepEqual(history.present.changes, [firstChange, secondChange])
  assert.equal(canUndoDocumentEdit(history), true)
  assert.equal(canRedoDocumentEdit(history), false)

  history = undoDocumentEdit(history)
  assert.equal(valueOf(history.present), 1)
  assert.deepEqual(history.present.changes, [firstChange])
  history = undoDocumentEdit(history)
  assert.equal(valueOf(history.present), 0)
  assert.deepEqual(history.present.changes, [])
  assert.equal(canUndoDocumentEdit(history), false)

  history = redoDocumentEdit(history)
  assert.equal(valueOf(history.present), 1)
  assert.deepEqual(history.present.changes, [firstChange])
  history = redoDocumentEdit(history)
  assert.equal(valueOf(history.present), 2)
  assert.deepEqual(history.present.changes, [firstChange, secondChange])
  assert.equal(canRedoDocumentEdit(history), false)
})

test("a new edit after undo discards the redo branch", () => {
  let history = createDocumentHistory(documentState(0))
  history = commitDocumentEdit(history, () => documentState(1))
  history = commitDocumentEdit(history, () => documentState(2))
  history = undoDocumentEdit(history)
  history = commitDocumentEdit(history, () => documentState(9))

  assert.equal(valueOf(history.present), 9)
  assert.equal(canRedoDocumentEdit(history), false)
})

test("the controller reducer accepts document updates and history commands", () => {
  let history = createDocumentHistory(documentState(0))
  history = updateDocumentHistory(history, () => documentState(1))
  history = updateDocumentHistory(history, UNDO_DOCUMENT_EDIT)
  assert.equal(valueOf(history.present), 0)

  history = updateDocumentHistory(history, REDO_DOCUMENT_EDIT)
  assert.equal(valueOf(history.present), 1)
})

test("no-op edits do not create history and replacement creates a new root", () => {
  let history = createDocumentHistory(documentState(0))
  history = commitDocumentEdit(history, (current) => current)
  assert.equal(canUndoDocumentEdit(history), false)

  history = commitDocumentEdit(history, () => documentState(1))
  history = replaceDocumentHistory(history, documentState(7, "baseline-b"))
  assert.equal(valueOf(history.present), 7)
  assert.equal(canUndoDocumentEdit(history), false)
  assert.equal(canRedoDocumentEdit(history), false)
})

test("bounds retained undo revisions", () => {
  let history = createDocumentHistory(documentState(0))
  for (let index = 1; index <= DOCUMENT_HISTORY_LIMIT + 5; index += 1) {
    history = commitDocumentEdit(history, () => documentState(index % 256))
  }

  for (let index = 0; index < DOCUMENT_HISTORY_LIMIT; index += 1) {
    history = undoDocumentEdit(history)
  }
  assert.equal(canUndoDocumentEdit(history), false)
  assert.equal(valueOf(history.present), 5)
})
