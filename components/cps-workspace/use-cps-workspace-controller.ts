"use client"

import * as React from "react"

import { useAnalytics } from "@/components/analytics/analytics-provider"
import { useCollectionActions } from "@/components/cps-workspace/use-collection-actions"
import { useMemoryChannelActions } from "@/components/cps-workspace/use-memory-channel-actions"
import { useSettingsActions } from "@/components/cps-workspace/use-settings-actions"
import { useRadioModel } from "@/components/radio-model-provider"
import {
  browserDiagnosticEnvironment,
  safeRadioMetadata,
} from "@/components/diagnostics/browser-diagnostics"
import { recordDiagnosticIncident } from "@/components/diagnostics/diagnostic-recorder"
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
  type BackupHistoryEntry,
  type CpsWorkspace,
  type RadioWriteOperationSnapshot,
  type RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import { createCpsWorkspaceForRadioModel } from "@/modules/radio-support/cps-workspace"
import { evaluateFirmwareSupport } from "@/modules/radio-support/index"
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
  type DocumentHistoryAction,
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
import { createCodeplug, serializePfFile } from "@/modules/codeplug/index"
import type { RadioDebugEvent, SourceRadio } from "@/modules/uvl15w-radio/index"
import {
  analyticsSection,
  changeCountBucket,
  durationBucket,
  errorCategory,
  trackAnalytics,
  type AnalyticsBinding,
} from "@/lib/analytics/index"

const RADIO_WRITE_RELEASED = isRadioWriteReleased({
  emergencyDisabled: process.env.NEXT_PUBLIC_DISABLE_RADIO_WRITE === "1",
})

function analyticsBinding(
  binding: "source-radio" | "cps-file" | "unbound"
): AnalyticsBinding {
  switch (binding) {
    case "source-radio":
    case "cps-file":
      return "source_radio"
    case "unbound":
      return "unbound"
  }
}

function useCpsWorkspaceController() {
  const analytics = useAnalytics()
  const radioModel = useRadioModel()
  const workspace = React.useRef<CpsWorkspace | null>(null)
  const radioTransport = React.useRef<WebSerialTransport | null>(null)
  const mounted = React.useRef(true)
  const operationInProgress = React.useRef(false)
  const radioDebugEvents = React.useRef<RadioDebugEvent[]>([])
  const radioDiagnosticOperation = React.useRef("radio-operation")
  const importedCpsFileRef = React.useRef<CpsFileManifest | null>(null)
  const editTracked = React.useRef(false)
  const capabilityTracked = React.useRef(false)
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
  const setEditedDocumentState = React.useCallback(
    (action: DocumentHistoryAction) => {
      if (completedRead && !editTracked.current) {
        editTracked.current = true
        trackAnalytics("codeplug_edit_started", {
          radio_model: radioModel.id,
          section: analyticsSection(window.location.pathname),
          binding: analyticsBinding(completedRead.binding),
        })
      }
      setDocumentState(action)
    },
    [completedRead, radioModel.id]
  )

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

  const recordRadioDiagnostic = React.useCallback(
    (input: {
      operation: string
      outcome: "failed" | "outcome-unknown" | "success"
      phase: string
      errorCode: string | null
      radio?: SourceRadio | null
    }) => {
      const metadata = safeRadioMetadata(input.radio ?? sourceRadio)
      const report = createRadioDiagnosticReport({
        generatedAt: new Date().toISOString(),
        locale: document.documentElement.lang || "unknown",
        pathname: window.location.pathname,
        phase: input.phase,
        errorCode: input.errorCode,
        operation: input.operation,
        radio: metadata,
        environment: browserDiagnosticEnvironment(),
        events: radioDebugEvents.current,
      })
      void recordDiagnosticIncident({
        source: "radio",
        operation: input.operation,
        outcome: input.outcome,
        phase: input.phase,
        errorCode: input.errorCode,
        eventCount: radioDebugEvents.current.length,
        radio: metadata,
        reportContent: report.content,
      })
    },
    [sourceRadio]
  )

  const readRadio = React.useCallback(async () => {
    if (capability !== "available" || busy || operationInProgress.current) {
      return
    }

    operationInProgress.current = true
    radioDiagnosticOperation.current = "radio-read"
    radioDebugEvents.current = []
    const previousRead = completedRead
    setError(null)
    setProgress(0)
    setPhase("connecting")
    const startedAt = performance.now()
    trackAnalytics("radio_read_started", {
      radio_model: radioModel.id,
      intent: "read",
    })

    try {
      await workspace.current?.disconnect().catch(() => undefined)

      const nextTransport = createWebSerialTransport({
        baudRate: POC_VERIFIED_BAUD_RATE,
      })
      const nextWorkspace = createCpsWorkspaceForRadioModel(
        radioModel.id,
        nextTransport,
        {
          radioWriteStore: createIndexedDbRadioWriteStore(),
          backupHistoryStore: createIndexedDbBackupHistoryStore(),
          onBackupHistoryError: () => {
            if (mounted.current) setError({ key: "backupHistorySaveFailed" })
          },
          onDebugEvent: recordRadioDebugEvent,
        }
      )
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
      editTracked.current = false
      setProgress(100)
      setPhase("ready")
      recordRadioDiagnostic({
        operation: "radio-read",
        outcome: "success",
        phase: "ready",
        errorCode: null,
        radio: result.sourceRadio,
      })
      const support = evaluateFirmwareSupport(
        radioModel.id,
        result.sourceRadio.firmwareVersion
      )
      trackAnalytics("radio_read_completed", {
        radio_model: radioModel.id,
        compatibility_status: support.status === "beta" ? "beta" : "validated",
        duration_bucket: durationBucket(performance.now() - startedAt),
      })
    } catch (cause) {
      if (!mounted.current) {
        return
      }
      const nextError = workspaceError(cause)
      setError(nextError)
      setSourceRadio(previousRead?.sourceRadio ?? null)
      setPhase("idle")
      recordRadioDiagnostic({
        operation: "radio-read",
        outcome: "failed",
        phase: "idle",
        errorCode: "key" in nextError ? nextError.key : "operation-error",
        radio: previousRead?.sourceRadio,
      })
      trackAnalytics("radio_read_failed", {
        radio_model: radioModel.id,
        error_category: errorCategory(cause),
      })
    } finally {
      operationInProgress.current = false
    }
  }, [
    busy,
    capability,
    completedRead,
    recordRadioDebugEvent,
    radioModel.id,
    recordRadioDiagnostic,
  ])

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
    radioDiagnosticOperation.current = "radio-write"
    radioDebugEvents.current = []
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
      trackAnalytics("radio_write_review_opened", {
        radio_model: radioModel.id,
        change_count_bucket: changeCountBucket(changes.length),
      })
    } catch (cause) {
      const nextError = workspaceError(cause)
      setError(nextError)
      setRadioWriteSnapshot(workspace.current.getRadioWriteSnapshot())
      recordRadioDiagnostic({
        operation: "radio-write",
        outcome: "failed",
        phase: workspace.current.getRadioWriteSnapshot()?.phase ?? "prepare",
        errorCode: "key" in nextError ? nextError.key : "operation-error",
      })
    } finally {
      operationInProgress.current = false
    }
  }, [busy, changes, completedRead, radioModel.id, recordRadioDiagnostic])

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
    radioDiagnosticOperation.current = "radio-write"
    setError(null)
    const startedAt = performance.now()
    trackAnalytics("radio_write_started", { radio_model: radioModel.id })
    try {
      const result = await workspace.current.executePreparedRadioWrite({
        onProgress: (snapshot) => setRadioWriteSnapshot(snapshot),
      })
      setDocumentState({ completedRead: bindRadioRead(result), changes: [] })
      setSourceRadio(result.sourceRadio)
      setRadioWriteReview([])
      recordRadioDiagnostic({
        operation: "radio-write",
        outcome: "success",
        phase: "completed",
        errorCode: null,
        radio: result.sourceRadio,
      })
      trackAnalytics("radio_write_completed", {
        radio_model: radioModel.id,
        duration_bucket: durationBucket(performance.now() - startedAt),
      })
    } catch (cause) {
      const nextError = workspaceError(cause)
      const snapshot = workspace.current.getRadioWriteSnapshot()
      setError(nextError)
      setRadioWriteSnapshot(snapshot)
      recordRadioDiagnostic({
        operation: "radio-write",
        outcome:
          snapshot?.phase === "write-outcome-unknown"
            ? "outcome-unknown"
            : "failed",
        phase: snapshot?.phase ?? "write",
        errorCode: "key" in nextError ? nextError.key : "operation-error",
      })
      trackAnalytics(
        snapshot?.phase === "write-outcome-unknown"
          ? "radio_write_outcome_unknown"
          : "radio_write_failed",
        { radio_model: radioModel.id, error_category: errorCategory(cause) }
      )
    } finally {
      operationInProgress.current = false
    }
  }, [
    busy,
    radioModel.id,
    radioDiagnosticOperation,
    radioWriteSnapshot,
    recordRadioDiagnostic,
  ])

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
    trackAnalytics("codeplug_exported", {
      file_kind: "raw_bin",
      binding: analyticsBinding(completedRead.binding),
    })
  }, [completedRead])

  const downloadPfFile = React.useCallback(() => {
    if (!completedRead) return
    const baseName =
      completedRead.sourceRadio?.serialNumber ||
      completedRead.rawImport?.fileName.replace(/\.(?:bin|pf)$/i, "") ||
      "codeplug"
    downloadText(
      `${safeFilename(baseName)}-${new Date().toISOString().slice(0, 10)}.PF`,
      serializePfFile(completedRead.workingCodeplug.codeplug.toBytes()),
      "text/plain;charset=utf-8"
    )
    trackAnalytics("codeplug_exported", {
      file_kind: "tyt_pf",
      binding: analyticsBinding(completedRead.binding),
    })
  }, [completedRead])

  const downloadCpsFile = React.useCallback(async () => {
    if (!canExportCpsFile(completedRead)) return
    const bytes = await createCpsFile({
      sourceRadio: completedRead.sourceRadio,
      baseline: completedRead.baselineBackup.codeplug,
      working: completedRead.workingCodeplug.codeplug,
    })
    downloadBytes(
      `${safeFilename(completedRead.sourceRadio.serialNumber || completedRead.sourceRadio.model)}-${new Date().toISOString().slice(0, 10)}.73kcps`,
      bytes,
      "application/vnd.73kit.cps+zip"
    )
    trackAnalytics("codeplug_exported", {
      file_kind: "cps_file",
      binding: analyticsBinding(completedRead.binding),
    })
  }, [completedRead])

  const openCpsFile = React.useCallback(
    async (file: File) => {
      if (busy || operationInProgress.current) return
      operationInProgress.current = true
      radioDiagnosticOperation.current = "restore-preparation"
      radioDebugEvents.current = []
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
        editTracked.current = false
        trackAnalytics("codeplug_open_completed", {
          radio_model: radioModel.id,
          file_kind: "cps_file",
          binding: "source_radio",
        })
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "The CPS File could not be opened",
        })
        trackAnalytics("codeplug_open_failed", {
          file_kind: "cps_file",
          error_category: errorCategory(cause),
        })
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [busy, radioModel.id]
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
        editTracked.current = false
        trackAnalytics("codeplug_open_completed", {
          radio_model: radioModel.id,
          file_kind: file.name.toLocaleLowerCase("en-US").endsWith(".pf")
            ? "tyt_pf"
            : "raw_bin",
          binding: "unbound",
        })
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "The raw Codeplug file could not be opened",
        })
        trackAnalytics("codeplug_open_failed", {
          file_kind: file.name.toLocaleLowerCase("en-US").endsWith(".pf")
            ? "tyt_pf"
            : "raw_bin",
          error_category: errorCategory(cause),
        })
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [busy, radioModel.id]
  )

  const prepareRestore = React.useCallback(
    async (
      restoreSource: RestoreSource,
      target: ReturnType<typeof createCodeplug>,
      analyticsRestoreSource: "cps_file" | "backup_history"
    ) => {
      if (capability !== "available" || busy || operationInProgress.current)
        return

      operationInProgress.current = true
      setError(null)
      setProgress(0)
      setPhase("connecting")
      const startedAt = performance.now()
      trackAnalytics("radio_read_started", {
        radio_model: radioModel.id,
        intent: "restore",
      })
      try {
        await workspace.current?.disconnect().catch(() => undefined)
        const nextTransport = createWebSerialTransport({
          baudRate: POC_VERIFIED_BAUD_RATE,
        })
        const nextWorkspace = createCpsWorkspaceForRadioModel(
          radioModel.id,
          nextTransport,
          {
            radioWriteStore: createIndexedDbRadioWriteStore(),
            backupHistoryStore: createIndexedDbBackupHistoryStore(),
            onBackupHistoryError: () => {
              if (mounted.current) setError({ key: "backupHistorySaveFailed" })
            },
            onDebugEvent: recordRadioDebugEvent,
          }
        )
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
        const support = evaluateFirmwareSupport(
          radioModel.id,
          freshRead.sourceRadio.firmwareVersion
        )
        trackAnalytics("radio_read_completed", {
          radio_model: radioModel.id,
          compatibility_status:
            support.status === "beta" ? "beta" : "validated",
          duration_bucket: durationBucket(performance.now() - startedAt),
        })
        trackAnalytics("restore_prepared", {
          radio_model: radioModel.id,
          restore_source: analyticsRestoreSource,
          outcome: "success",
        })
        recordRadioDiagnostic({
          operation: "restore-preparation",
          outcome: "success",
          phase: "ready",
          errorCode: null,
          radio,
        })
      } catch (cause) {
        setError({
          message:
            cause instanceof Error
              ? cause.message
              : "Restore preparation failed",
        })
        setPhase("ready")
        recordRadioDiagnostic({
          operation: "restore-preparation",
          outcome: "failed",
          phase: "ready",
          errorCode: "operation-error",
        })
        trackAnalytics("radio_read_failed", {
          radio_model: radioModel.id,
          error_category: errorCategory(cause),
        })
        trackAnalytics("restore_prepared", {
          radio_model: radioModel.id,
          restore_source: analyticsRestoreSource,
          outcome: "failed",
        })
        throw cause
      } finally {
        operationInProgress.current = false
      }
    },
    [
      busy,
      capability,
      radioModel.id,
      recordRadioDebugEvent,
      recordRadioDiagnostic,
    ]
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
      target,
      "cps_file"
    )
  }, [completedRead, prepareRestore])

  const prepareBackupRestore = React.useCallback(
    async (entry: BackupHistoryEntry) => {
      if (busy || operationInProgress.current) return
      setError(null)
      try {
        const restoreTarget = await restoreTargetFromBackup(entry)
        await prepareRestore(
          restoreTarget.source,
          restoreTarget.target,
          "backup_history"
        )
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
      operation: radioDiagnosticOperation.current,
      radio: safeRadioMetadata(sourceRadio ?? completedRead?.sourceRadio),
      environment: browserDiagnosticEnvironment(),
      events: radioDebugEvents.current,
    })
    downloadText(report.fileName, report.content, report.mimeType)
    trackAnalytics("diagnostic_report_exported", {
      source: "radio",
      outcome:
        radioWriteSnapshot?.phase === "write-outcome-unknown"
          ? "outcome_unknown"
          : error
            ? "failed"
            : "success",
    })
  }, [completedRead, error, phase, radioWriteSnapshot, sourceRadio])

  const {
    addMemoryChannel,
    deleteMemoryChannel,
    duplicateMemoryChannel,
    editChannelMemberships,
    editMemoryChannel,
    moveMemoryChannel,
    resetWorkingCodeplug,
  } = useMemoryChannelActions(setEditedDocumentState)
  const {
    editBandScanListSelection,
    editBandZoneSelection,
    editCallChannel,
    editScanList,
    editVfoChannel,
    editVfoScanEdge,
    editVfoScanEdgeSelection,
    editZone,
  } = useCollectionActions(setEditedDocumentState)
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
  } = useSettingsActions(setEditedDocumentState)

  React.useEffect(() => {
    mounted.current = true
    const recoveryTransport = createWebSerialTransport({
      baudRate: POC_VERIFIED_BAUD_RATE,
      preferPreviouslyGrantedPort: true,
    })
    const recoveryWorkspace = createCpsWorkspaceForRadioModel(
      radioModel.id,
      recoveryTransport,
      {
        radioWriteStore: createIndexedDbRadioWriteStore(),
        backupHistoryStore: createIndexedDbBackupHistoryStore(),
        onBackupHistoryError: () => {
          if (mounted.current) setError({ key: "backupHistorySaveFailed" })
        },
        onDebugEvent: recordRadioDebugEvent,
      }
    )
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
      const nextCapability = getRadioCapability()
      setCapability(nextCapability)
    }, 0)

    return () => {
      window.clearTimeout(capabilityCheck)
      mounted.current = false
      void workspace.current?.disconnect().catch(() => undefined)
    }
  }, [radioModel.id, recordRadioDebugEvent])

  React.useEffect(() => {
    if (
      capability === "checking" ||
      !analytics.trackerReady ||
      capabilityTracked.current
    )
      return
    capabilityTracked.current = true
    trackAnalytics("serial_capability_checked", {
      radio_model: radioModel.id,
      supported: capability === "available",
    })
  }, [analytics.trackerReady, capability, radioModel.id])

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
      downloadPfFile,
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
      downloadPfFile,
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
