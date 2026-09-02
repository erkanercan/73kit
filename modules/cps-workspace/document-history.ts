import { createCodeplug } from "../codeplug/index.ts"
import type { WorkspaceChange } from "./change-set.ts"
import type { ActiveCodeplugDocument } from "./codeplug-document.ts"

const DOCUMENT_HISTORY_LIMIT = 100
const UNDO_DOCUMENT_EDIT = Symbol("undo-document-edit")
const REDO_DOCUMENT_EDIT = Symbol("redo-document-edit")

interface EditableCodeplugDocumentState {
  readonly completedRead: ActiveCodeplugDocument | null
  readonly changes: readonly WorkspaceChange[]
}

interface DocumentRevision {
  readonly workingCodeplugBytes: Uint8Array
  readonly changes: readonly WorkspaceChange[]
}

interface DocumentHistory {
  readonly present: EditableCodeplugDocumentState
  readonly past: readonly DocumentRevision[]
  readonly future: readonly DocumentRevision[]
}

type DocumentStateUpdate =
  | EditableCodeplugDocumentState
  | ((current: EditableCodeplugDocumentState) => EditableCodeplugDocumentState)

type DocumentHistoryAction =
  DocumentStateUpdate | typeof UNDO_DOCUMENT_EDIT | typeof REDO_DOCUMENT_EDIT

function createDocumentHistory(
  present: EditableCodeplugDocumentState
): DocumentHistory {
  return Object.freeze({
    present,
    past: Object.freeze([]),
    future: Object.freeze([]),
  })
}

function replaceDocumentHistory(
  _history: DocumentHistory,
  present: EditableCodeplugDocumentState
) {
  return createDocumentHistory(present)
}

function updateDocumentHistory(
  history: DocumentHistory,
  action: DocumentHistoryAction
) {
  if (action === UNDO_DOCUMENT_EDIT) return undoDocumentEdit(history)
  if (action === REDO_DOCUMENT_EDIT) return redoDocumentEdit(history)
  return typeof action === "function"
    ? commitDocumentEdit(history, action)
    : replaceDocumentHistory(history, action)
}

function commitDocumentEdit(
  history: DocumentHistory,
  update: (
    current: EditableCodeplugDocumentState
  ) => EditableCodeplugDocumentState
): DocumentHistory {
  const next = update(history.present)
  if (next === history.present) return history

  const currentDocument = history.present.completedRead
  const nextDocument = next.completedRead
  if (
    !currentDocument ||
    !nextDocument ||
    !sameDocumentRoot(currentDocument, nextDocument)
  ) {
    return createDocumentHistory(next)
  }

  if (
    currentDocument.workingCodeplug.codeplug.equals(
      nextDocument.workingCodeplug.codeplug
    )
  ) {
    return Object.freeze({ ...history, present: next })
  }

  return Object.freeze({
    present: next,
    past: Object.freeze(
      [...history.past, createRevision(history.present)].slice(
        -DOCUMENT_HISTORY_LIMIT
      )
    ),
    future: Object.freeze([]),
  })
}

function undoDocumentEdit(history: DocumentHistory): DocumentHistory {
  const revision = history.past.at(-1)
  if (!revision || !history.present.completedRead) return history

  return Object.freeze({
    present: restoreRevision(history.present, revision),
    past: Object.freeze(history.past.slice(0, -1)),
    future: Object.freeze([createRevision(history.present), ...history.future]),
  })
}

function redoDocumentEdit(history: DocumentHistory): DocumentHistory {
  const revision = history.future[0]
  if (!revision || !history.present.completedRead) return history

  return Object.freeze({
    present: restoreRevision(history.present, revision),
    past: Object.freeze(
      [...history.past, createRevision(history.present)].slice(
        -DOCUMENT_HISTORY_LIMIT
      )
    ),
    future: Object.freeze(history.future.slice(1)),
  })
}

function canUndoDocumentEdit(history: DocumentHistory) {
  return history.past.length > 0
}

function canRedoDocumentEdit(history: DocumentHistory) {
  return history.future.length > 0
}

function createRevision(
  state: EditableCodeplugDocumentState
): DocumentRevision {
  const document = state.completedRead
  if (!document) {
    throw new Error(
      "A Codeplug document is required to create a history revision"
    )
  }

  return Object.freeze({
    workingCodeplugBytes: document.workingCodeplug.codeplug.toBytes(),
    changes: state.changes,
  })
}

function restoreRevision(
  current: EditableCodeplugDocumentState,
  revision: DocumentRevision
): EditableCodeplugDocumentState {
  const document = current.completedRead
  if (!document) return current

  return Object.freeze({
    completedRead: Object.freeze({
      ...document,
      workingCodeplug: Object.freeze({
        ...document.workingCodeplug,
        codeplug: createCodeplug(
          revision.workingCodeplugBytes,
          document.workingCodeplug.codeplug.layoutId
        ),
      }),
    }),
    changes: revision.changes,
  })
}

function sameDocumentRoot(
  left: ActiveCodeplugDocument,
  right: ActiveCodeplugDocument
) {
  return (
    left.binding === right.binding &&
    left.baselineBackup.id === right.baselineBackup.id &&
    left.baselineBackup.sha256 === right.baselineBackup.sha256
  )
}

export {
  DOCUMENT_HISTORY_LIMIT,
  REDO_DOCUMENT_EDIT,
  UNDO_DOCUMENT_EDIT,
  canRedoDocumentEdit,
  canUndoDocumentEdit,
  commitDocumentEdit,
  createDocumentHistory,
  redoDocumentEdit,
  replaceDocumentHistory,
  updateDocumentHistory,
  undoDocumentEdit,
}
export type {
  DocumentHistory,
  DocumentHistoryAction,
  DocumentStateUpdate,
  EditableCodeplugDocumentState,
}
