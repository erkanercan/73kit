"use client"

import * as React from "react"

import { useCollectionActions } from "@/components/cps-workspace/use-collection-actions"
import { useMemoryChannelActions } from "@/components/cps-workspace/use-memory-channel-actions"
import { useSettingsActions } from "@/components/cps-workspace/use-settings-actions"
import type {
  CpsWorkspaceContextValue,
  ImportedRestoreResult,
  WorkspaceError,
  WorkspacePhase,
} from "@/components/cps-workspace/workspace-context"
import {
  countChangedBytes,
  downloadBytes,
  downloadText,
  editedRawFilename,
  getRadioCapability,
  safeFilename,
  workspaceError,
} from "@/components/cps-workspace/workspace-support"
import {
  POC_VERIFIED_BAUD_RATE,
  createWebSerialTransport,
  type RadioCapability,
  type WebSerialTransport,
} from "@/adapters/web-serial/index"
import { createIndexedDbRadioWriteStore } from "@/adapters/indexed-db-radio-write-store/index"
import { createIndexedDbBackupHistoryStore } from "@/adapters/indexed-db-backup-history-store/index"
import {
  createCpsWorkspace,
  type BackupHistoryEntry,
  type CpsWorkspace,
  type RadioWriteOperationSnapshot,
  type RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import {
  createCpsFile,
  parseCpsFile,
  type CpsFileManifest,
} from "@/modules/cps-workspace/cps-file"
import {
  bindCpsFile,
  bindRadioRead,
  canExportCpsFile,
  canPrepareImportedRestore,
  canPrepareRadioWrite as canPrepareDocumentRadioWrite,
  importRawCodeplugFile,
  isUnboundCodeplug,
} from "@/modules/cps-workspace/codeplug-document"
import {
  REDO_DOCUMENT_EDIT,
  UNDO_DOCUMENT_EDIT,
  canRedoDocumentEdit,
  canUndoDocumentEdit,
  createDocumentHistory,
  updateDocumentHistory,
} from "@/modules/cps-workspace/document-history"
import { isRadioWriteReleased } from "@/modules/cps-workspace/radio-write-release"
import {
  MAX_RADIO_DIAGNOSTIC_EVENTS,
  createRadioDiagnosticReport,
} from "@/modules/radio-diagnostics/index"
import {
  prepareRestoreDocument,
  restoreTargetFromBackup,
  type RestoreSource,
} from "@/modules/cps-workspace/restore-workflow"
import { createCodeplug } from "@/modules/codeplug/index"
import type { RadioDebugEvent, SourceRadio } from "@/modules/uvl15w-radio/index"

const RADIO_WRITE_RELEASED = isRadioWriteReleased({
  emergencyDisabled: process.env.NEXT_PUBLIC_DISABLE_RADIO_WRITE === "1",
})

function useCpsWorkspaceController() {
  const workspace = React.useRef<CpsWorkspace | null>(null)
  const radioTransport = React.useRef<WebSerialTransport | null>(null)
  const mounted = React.useRef(true)
  const operationInProgress = React.useRef(false)
  const radioDebugEvents = React.useRef<RadioDebugEvent[]>([])
  const importedCpsFileRef = React.useRef<CpsFileManifest | null>(null)
  const [capability, setCapability] = React.useState<
    RadioCapability | "checking"
  >("checking")
  const [phase, setPhase] = React.useState<WorkspacePhase>("idle")
  const [sourceRadio, setSourceRadio] = React.useState<SourceRadio | null>(null)
  const [documentHistory, setDocumentState] = React.useReducer(
    updateDocumentHistory,
    { completedRead: null, changes: [] },
    createDocumentHistory
  )
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<WorkspaceError | null>(null)
  const [radioWriteSnapshot, setRadioWriteSnapshot] =
    React.useState<RadioWriteOperationSnapshot | null>(null)
  const [radioWriteReview, setRadioWriteReview] = React.useState<
    readonly RadioWriteReviewItem[]
  >([])
  const [importedCpsFile, setImportedCpsFile] =
    React.useState<CpsFileManifest | null>(null)
  const [importedRestoreResult, setImportedRestoreResult] =
    React.useState<ImportedRestoreResult | null>(null)
  const [externalOperationBusy, setExternalOperationBusy] =
    React.useState(false)
  const { completedRead, changes } = documentHistory.present

  const radioWriteBusy =
    radioWriteSnapshot !== null &&
    !["review-required", "completed", "write-outcome-unknown"].includes(
      radioWriteSnapshot.phase
    )
  const busy =
    phase === "connecting" ||
    phase === "reading" ||
    radioWriteBusy ||
    externalOperationBusy
  const canUndo =
    radioWriteSnapshot === null && canUndoDocumentEdit(documentHistory)
  const canRedo =
    radioWriteSnapshot === null && canRedoDocumentEdit(documentHistory)

  const undoWorkingCodeplug = React.useCallback(() => {
    if (busy || radioWriteSnapshot !== null) return
    setDocumentState(UNDO_DOCUMENT_EDIT)
  }, [busy, radioWriteSnapshot])

  const redoWorkingCodeplug = React.useCallback(() => {
    if (busy || radioWriteSnapshot !== null) return
    setDocumentState(REDO_DOCUMENT_EDIT)
  }, [busy, radioWriteSnapshot])

  const claimExternalRadioOperation = React.useCallback(() => {
    if (operationInProgress.current) return false
    operationInProgress.current = true
    setExternalOperationBusy(true)
    return true
  }, [])

  const releaseExternalRadioOperation = React.useCallback(() => {
    operationInProgress.current = false
    setExternalOperationBusy(false)
  }, [])

  const recordRadioDebugEvent = React.useCallback((event: RadioDebugEvent) => {
    radioDebugEvents.current = [...radioDebugEvents.current, event].slice(
      -MAX_RADIO_DIAGNOSTIC_EVENTS
    )
  }, [])

  const readRadio = React.useCallback(async () => {
    if (capability !== "available" || busy || operationInProgress.current) {
      return
    }

    operationInProgress.current = true
    const previousRead = completedRead
    setError(null)
    setProgress(0)
    setPhase("connecting")

    try {
      await workspace.current?.disconnect().catch(() => undefined)

      const nextTransport = createWebSerialTransport({
        baudRate: POC_VERIFIED_BAUD_RATE,
      })
      const nextWorkspace = createCpsWorkspace(nextTransport, {
        radioWriteStore: createIndexedDbRadioWriteStore(),
        backupHistoryStore: createIndexedDbBackupHistoryStore(),
        onBackupHistoryError: () => {
          if (mounted.current) setError({ key: "backupHistorySaveFailed" })
        },
        onDebugEvent: recordRadioDebugEvent,
      })
      radioTransport.current = nextTransport
      workspace.current = nextWorkspace

      const radio = await nextWorkspace.connect()
      if (!mounted.current) {
        await nextWorkspace.disconnect().catch(() => undefined)
        return
      }
      setSourceRadio(radio)
      setPhase("reading")

      const result = await nextWorkspace.read({
        onProgress: ({ percent }) => {
          if (mounted.current) {
            setProgress(percent)
          }
        },
      })

      if (!mounted.current) {
        return
      }
      importedCpsFileRef.current = null
      setImportedCpsFile(null)
      setImportedRestoreResult(null)
      setDocumentState({ completedRead: bindRadioRead(result), changes: [] })
      setProgress(100)
      setPhase("ready")
    } catch (cause) {
      if (!mounted.current) {
        return
      }
      setError(workspaceError(cause))
      setSourceRadio(previousRead?.sourceRadio ?? null)
      setPhase("idle")
    } finally {
      operationInProgress.current = false
    }
  }, [busy, capability, completedRead, recordRadioDebugEvent])

  const prepareRadioWrite = React.useCallback(async () => {
    if (
      !RADIO_WRITE_RELEASED ||
      busy ||
      operationInProgress.current ||
      !completedRead ||
      changes.length === 0 ||
      !workspace.current ||
      !radioTransport.current ||
      !canPrepareDocumentRadioWrite(completedRead)
    ) {
      return
    }
    operationInProgress.current = true
    setError(null)
    try {
      await radioTransport.current.requestPort()
      await workspace.current.prepareRadioWrite({
        workingCodeplug: completedRead.workingCodeplug,
        changeSet: changes,
        onProgress: (snapshot) => setRadioWriteSnapshot(snapshot),
      })
      setRadioWriteSnapshot(workspace.current.getRadioWriteSnapshot())
      setRadioWriteReview(workspace.current.getRadioWriteReview())
    } catch (cause) {
      setError(workspaceError(cause))
      setRadioWriteSnapshot(workspace.current.getRadioWriteSnapshot())
    } finally {
      operationInProgress.current = false
    }
  }, [busy, changes, completedRead])

  const confirmRadioWrite = React.useCallback(async () => {
    if (
      !RADIO_WRITE_RELEASED ||
      busy ||
      operationInProgress.current ||
      radioWriteSnapshot?.phase !== "review-required" ||
      !workspace.current
    ) {
      return
    }
    operationInProgress.current = true
    setError(null)
    try {
      const result = await workspace.current.executePreparedRadioWrite({
        onProgress: (snapshot) => setRadioWriteSnapshot(snapshot),
      })
      setDocumentState({ completedRead: bindRadioRead(result), changes: [] })
      setSourceRadio(result.sourceRadio)
      setRadioWriteReview([])
    } catch (cause) {
      setError(workspaceError(cause))
      setRadioWriteSnapshot(workspace.current.getRadioWriteSnapshot())
    } finally {
      operationInProgress.current = false
    }
  }, [busy, radioWriteSnapshot])

  const discardRadioWriteStatus = React.useCallback(async () => {
    setRadioWriteSnapshot(null)
    setRadioWriteReview([])
    setError(null)
    try {
      await workspace.current?.discardRadioWriteOperation()
    } catch (cause) {
      setError(workspaceError(cause))
    }
  }, [])

  const downloadRawBackup = React.useCallback(() => {
    if (!completedRead) {
      return
    }

    const bytes = isUnboundCodeplug(completedRead)
      ? completedRead.workingCodeplug.codeplug.toBytes()
      : completedRead.baselineBackup.codeplug.toBytes()
    const blob = new Blob([bytes.slice().buffer], {
      type: "application/octet-stream",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = isUnboundCodeplug(completedRead)
      ? editedRawFilename(completedRead.rawImport.fileName)
      : `${safeFilename(completedRead.sourceRadio?.serialNumber || "codeplug")}-codeplug-backup.bin`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [completedRead])

  const downloadCpsFile = React.useCallback(async () => {
    if (!canExportCpsFile(completedRead)) return
    const bytes = await createCpsFile({
      sourceRadio: completedRead.sourceRadio,
      baseline: completedRead.baselineBackup.codeplug,
      working: completedRead.workingCodeplug.codeplug,
    })
    downloadBytes(
      `${safeFilename(completedRead.sourceRadio.serialNumber || completedRead.sourceRadio.model)}-${new Date().toISOString().slice(0, 10)}.uvl15cps`,
      bytes,
      "application/vnd.tyt.uvl15-cps+zip"
    )
  }, [completedRead])

  const openCpsFile = React.useCallback(
    async (file: File) => {
      if (busy || operationInProgress.current) return
      operationInProgress.current = true
      setError(null)
      try {
        const parsed = await parseCpsFile(
          new Uint8Array(await file.arrayBuffer())
        )
        const nextRead = bindCpsFile(parsed)
        importedCpsFileRef.current = parsed.manifest
        setImportedCpsFile(parsed.manifest)
        setImportedRestoreResult(null)
        setDocumentState({
          completedRead: nextRead,
          changes: parsed.edited
            ? [
                Object.freeze({
                  kind: "imported-working-codeplug" as const,
                  fileCreatedAt: parsed.manifest.createdAt,
                  workingSha256: parsed.manifest.working.sha256,
                  changedByteCount: countChangedBytes(
                    parsed.baseline.toBytes(),
                    parsed.working.toBytes()
                  ),
                }),
              ]
            : [],
        })
        setSourceRadio(null)
        setPhase("ready")
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "The CPS File could not be opened",
        })
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [busy]
  )

  const openRawCodeplug = React.useCallback(
    async (file: File) => {
      if (busy || operationInProgress.current) return
      operationInProgress.current = true
      setError(null)
      try {
        const nextDocument = await importRawCodeplugFile(file)
        importedCpsFileRef.current = null
        setImportedCpsFile(null)
        setImportedRestoreResult(null)
        setDocumentState({ completedRead: nextDocument, changes: [] })
        setSourceRadio(null)
        setPhase("ready")
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "The raw Codeplug file could not be opened",
        })
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [busy]
  )

  const prepareRestore = React.useCallback(
    async (
      restoreSource: RestoreSource,
      target: ReturnType<typeof createCodeplug>
    ) => {
      if (capability !== "available" || busy || operationInProgress.current)
        return

      operationInProgress.current = true
      setError(null)
      setProgress(0)
      setPhase("connecting")
      try {
        await workspace.current?.disconnect().catch(() => undefined)
        const nextTransport = createWebSerialTransport({
          baudRate: POC_VERIFIED_BAUD_RATE,
        })
        const nextWorkspace = createCpsWorkspace(nextTransport, {
          radioWriteStore: createIndexedDbRadioWriteStore(),
          backupHistoryStore: createIndexedDbBackupHistoryStore(),
          onBackupHistoryError: () => {
            if (mounted.current) setError({ key: "backupHistorySaveFailed" })
          },
          onDebugEvent: recordRadioDebugEvent,
        })
        radioTransport.current = nextTransport
        workspace.current = nextWorkspace
        const radio = await nextWorkspace.connect()
        setSourceRadio(radio)
        setPhase("reading")
        const freshRead = await nextWorkspace.read({
          onProgress: ({ percent }) => mounted.current && setProgress(percent),
        })
        const prepared = prepareRestoreDocument(
          restoreSource,
          target,
          freshRead
        )
        importedCpsFileRef.current = null
        setImportedCpsFile(null)
        setImportedRestoreResult(prepared.result)
        setDocumentState({
          completedRead: bindRadioRead(prepared.completedRead),
          changes: prepared.changes,
        })
        setProgress(100)
        setPhase("ready")
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "Restore preparation failed",
        })
        setPhase("ready")
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [busy, capability, recordRadioDebugEvent]
  )

  const prepareImportedRestore = React.useCallback(async () => {
    const manifest = importedCpsFileRef.current
    const target = completedRead?.workingCodeplug.codeplug
    if (!manifest || !target || !canPrepareImportedRestore(completedRead))
      return
    await prepareRestore(
      {
        createdAt: manifest.createdAt,
        sourceRadio: manifest.sourceRadio,
        workingSha256: manifest.working.sha256,
      },
      target
    )
  }, [completedRead, prepareRestore])

  const prepareBackupRestore = React.useCallback(
    async (entry: BackupHistoryEntry) => {
      if (busy || operationInProgress.current) return
      setError(null)
      try {
        const restoreTarget = await restoreTargetFromBackup(entry)
        await prepareRestore(restoreTarget.source, restoreTarget.target)
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "Restore preparation failed",
        })
        throw cause
      }
    },
    [busy, prepareRestore]
  )

  const downloadRadioOperationReport = React.useCallback(() => {
    if (radioDebugEvents.current.length === 0) return
    const report = createRadioDiagnosticReport({
      generatedAt: new Date().toISOString(),
      locale: document.documentElement.lang || "unknown",
      pathname: window.location.pathname,
      phase,
      errorCode:
        error && "key" in error ? error.key : error ? "operation-error" : null,
      environment: {
        secureContext: window.isSecureContext,
        online: window.navigator.onLine,
        webSerialSupported: "serial" in window.navigator,
        serviceWorkerSupported: "serviceWorker" in window.navigator,
        indexedDbSupported: "indexedDB" in window,
      },
      events: radioDebugEvents.current,
    })
    downloadText(report.fileName, report.content, report.mimeType)
  }, [error, phase])

  const {
    addMemoryChannel,
    deleteMemoryChannel,
    duplicateMemoryChannel,
    editChannelMemberships,
    editMemoryChannel,
    moveMemoryChannel,
    resetWorkingCodeplug,
  } = useMemoryChannelActions(setDocumentState)
  const {
    editBandScanListSelection,
    editBandZoneSelection,
    editCallChannel,
    editScanList,
    editVfoChannel,
    editVfoScanEdge,
    editVfoScanEdgeSelection,
    editZone,
  } = useCollectionActions(setDocumentState)
  const {
    editAprsSettings,
    editBluetoothSettings,
    editDisplaySettings,
    editDtmfSettings,
    editFiveToneSettings,
    editFmBroadcastChannel,
    editFmBroadcastSettings,
    editFunctionSettings,
    editGpsSettings,
    editKeyboardSettings,
    editSoundSettings,
    editSpectrumSettings,
    editTwoToneSettings,
    setMenuVisibility,
  } = useSettingsActions(setDocumentState)

  React.useEffect(() => {
    mounted.current = true
    const recoveryTransport = createWebSerialTransport({
      baudRate: POC_VERIFIED_BAUD_RATE,
      preferPreviouslyGrantedPort: true,
    })
    const recoveryWorkspace = createCpsWorkspace(recoveryTransport, {
      radioWriteStore: createIndexedDbRadioWriteStore(),
      backupHistoryStore: createIndexedDbBackupHistoryStore(),
      onBackupHistoryError: () => {
        if (mounted.current) setError({ key: "backupHistorySaveFailed" })
      },
      onDebugEvent: recordRadioDebugEvent,
    })
    radioTransport.current = recoveryTransport
    workspace.current = recoveryWorkspace
    void recoveryWorkspace
      .restoreRadioWriteRecovery()
      .then((snapshot) => {
        if (!mounted.current || !snapshot) return
        setRadioWriteSnapshot(snapshot)
        setRadioWriteReview(recoveryWorkspace.getRadioWriteReview())
      })
      .catch((cause) => {
        if (mounted.current) setError(workspaceError(cause))
      })
    const capabilityCheck = window.setTimeout(() => {
      setCapability(getRadioCapability())
    }, 0)

    return () => {
      window.clearTimeout(capabilityCheck)
      mounted.current = false
      void workspace.current?.disconnect().catch(() => undefined)
    }
  }, [recordRadioDebugEvent])

  React.useEffect(() => {
    const destructive =
      radioWriteSnapshot !== null && radioWriteSnapshot.phase === "writing"
    if (!destructive) return

    const preventClose = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", preventClose)
    return () => window.removeEventListener("beforeunload", preventClose)
  }, [radioWriteSnapshot])

  const value = React.useMemo<CpsWorkspaceContextValue>(
    () => ({
      phase,
      sourceRadio,
      completedRead,
      progress,
      error,
      capability,
      busy,
      changes,
      canUndo,
      canRedo,
      radioWriteReleased: RADIO_WRITE_RELEASED,
      radioWriteSnapshot,
      radioWriteReview,
      importedCpsFile,
      importedRestoreResult,
      claimExternalRadioOperation,
      releaseExternalRadioOperation,
      readRadio,
      prepareRadioWrite,
      confirmRadioWrite,
      discardRadioWriteStatus,
      downloadRadioOperationReport,
      downloadRawBackup,
      downloadCpsFile,
      openCpsFile,
      openRawCodeplug,
      prepareImportedRestore,
      prepareBackupRestore,
      addMemoryChannel,
      duplicateMemoryChannel,
      deleteMemoryChannel,
      editMemoryChannel,
      editChannelMemberships,
      editVfoChannel,
      editCallChannel,
      editZone,
      editScanList,
      editBandZoneSelection,
      editBandScanListSelection,
      editVfoScanEdge,
      editVfoScanEdgeSelection,
      editFunctionSettings,
      editDisplaySettings,
      editSoundSettings,
      editKeyboardSettings,
      editAprsSettings,
      editGpsSettings,
      editBluetoothSettings,
      editSpectrumSettings,
      editDtmfSettings,
      editTwoToneSettings,
      editFiveToneSettings,
      editFmBroadcastChannel,
      editFmBroadcastSettings,
      setMenuVisibility,
      moveMemoryChannel,
      resetWorkingCodeplug,
      undoWorkingCodeplug,
      redoWorkingCodeplug,
    }),
    [
      phase,
      sourceRadio,
      completedRead,
      progress,
      error,
      capability,
      busy,
      changes,
      canUndo,
      canRedo,
      radioWriteSnapshot,
      radioWriteReview,
      importedCpsFile,
      importedRestoreResult,
      claimExternalRadioOperation,
      releaseExternalRadioOperation,
      readRadio,
      prepareRadioWrite,
      confirmRadioWrite,
      discardRadioWriteStatus,
      downloadRadioOperationReport,
      downloadRawBackup,
      downloadCpsFile,
      openCpsFile,
      openRawCodeplug,
      prepareImportedRestore,
      prepareBackupRestore,
      addMemoryChannel,
      duplicateMemoryChannel,
      deleteMemoryChannel,
      editMemoryChannel,
      editChannelMemberships,
      editVfoChannel,
      editCallChannel,
      editZone,
      editScanList,
      editBandZoneSelection,
      editBandScanListSelection,
      editVfoScanEdge,
      editVfoScanEdgeSelection,
      editFunctionSettings,
      editDisplaySettings,
      editSoundSettings,
      editKeyboardSettings,
      editAprsSettings,
      editGpsSettings,
      editBluetoothSettings,
      editSpectrumSettings,
      editDtmfSettings,
      editTwoToneSettings,
      editFiveToneSettings,
      editFmBroadcastChannel,
      editFmBroadcastSettings,
      setMenuVisibility,
      moveMemoryChannel,
      resetWorkingCodeplug,
      undoWorkingCodeplug,
      redoWorkingCodeplug,
    ]
  )

  return value
}

export { useCpsWorkspaceController }
export type {
  CpsWorkspaceContextValue,
  WorkspaceError,
  WorkspaceErrorKey,
  WorkspacePhase,
} from "@/components/cps-workspace/workspace-context"
export type { WorkspaceChange } from "@/modules/cps-workspace/change-set"
