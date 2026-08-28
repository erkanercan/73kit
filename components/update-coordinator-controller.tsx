"use client"

import * as React from "react"

import { findCatalogPackageBySha256 } from "@/modules/update-catalog/index"
import { createUpdateDiagnosticReport } from "@/modules/update-diagnostics/index"
import {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
} from "@/adapters/web-serial/index"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import {
  createUvl15wRadio,
  Uvl15wRadioError,
} from "@/modules/uvl15w-radio/index"
import {
  UpdatePackageError,
  validateUpdatePackage,
  type UpdatePackageErrorCode,
  type UpdatePackageSummary,
  type ValidatedUpdatePackage,
} from "@/modules/update-package/index"
import {
  isUpdatePreparationConfirmed,
  type UpdateAcknowledgements,
} from "@/modules/update-policy/index"
import {
  createUvl15wUpdater,
  Uvl15wUpdaterError,
  type UpdateRecoveryDetails,
  type UpdateDebugEvent,
  type UpdateTransferPhase,
  type UpdateTransferResult,
} from "@/modules/uvl15w-updater/index"

const RECOVERY_STORAGE_KEY = "uvl15w-update-outcome-unknown-v1"

type UpdateCoordinatorPhase =
  | "idle"
  | "validating-package"
  | "ready"
  | UpdateTransferPhase
  | "awaiting-restart"
  | "verifying-installation"
  | "checking-recovery"
  | "complete"
  | "failed"
  | "outcome-unknown"

type UpdateCoordinatorErrorCode =
  | UpdatePackageErrorCode
  | "operation-busy"
  | "confirmation-required"
  | "serial-permission"
  | "serial-unavailable"
  | "connection-closed"
  | "response-timeout"
  | "protocol"
  | "unexpected-response"
  | "radio-frame-head"
  | "radio-frame-tail"
  | "radio-frame-length"
  | "radio-frame-lrc"
  | "radio-option-value"
  | "unsupported-recovery"
  | "incompatible-radio"
  | "verification-mismatch"
  | "language-verification-required"
  | "recovery-package-mismatch"
  | "unknown"

interface UpdateRecoveryRecord extends Omit<UpdateRecoveryDetails, "phase"> {
  readonly createdAt: string
  readonly phase: UpdateCoordinatorPhase
  readonly packageSummary?: UpdatePackageSummary
  readonly expectedFirmwareVersion?: string
  readonly expectedImageVersion?: string
  readonly totalBlocks?: number
  readonly errorCode?: UpdateCoordinatorErrorCode
}

interface UpdateCoordinatorContextValue {
  readonly capability:
    "checking" | "available" | "insecure-context" | "unsupported"
  readonly phase: UpdateCoordinatorPhase
  readonly selectedPackage: UpdatePackageSummary | null
  readonly progress: number
  readonly completedBlocks: number
  readonly totalBlocks: number
  readonly lastAcknowledgedAddress?: number
  readonly errorCode: UpdateCoordinatorErrorCode | null
  readonly recoveryRecord: UpdateRecoveryRecord | null
  readonly transferResult: UpdateTransferResult | null
  readonly busy: boolean
  readonly recoveryInspectionComplete: boolean
  readonly recoveryRetryPrepared: boolean
  readonly recoveryCanRetryInBrowser: boolean
  readonly diagnosticReportAvailable: boolean
  selectPackage(file: File): Promise<void>
  clearPackage(): void
  startUpdate(acknowledgements: UpdateAcknowledgements): Promise<void>
  verifyInstallation(languageVersionConfirmed: boolean): Promise<void>
  startAnotherUpdate(): void
  inspectRecoveryRadio(): Promise<void>
  selectRecoveryPackage(file: File): Promise<void>
  confirmOfficialCpsRecovery(): void
  downloadDiagnosticReport(): void
}

function useUpdateCoordinatorController() {
  const {
    claimExternalRadioOperation,
    releaseExternalRadioOperation,
    capability,
  } = useCpsWorkspace()
  const packageRef = React.useRef<ValidatedUpdatePackage | null>(null)
  const [phase, setPhase] = React.useState<UpdateCoordinatorPhase>("idle")
  const [selectedPackage, setSelectedPackage] =
    React.useState<UpdatePackageSummary | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [completedBlocks, setCompletedBlocks] = React.useState(0)
  const [totalBlocks, setTotalBlocks] = React.useState(0)
  const [lastAcknowledgedAddress, setLastAcknowledgedAddress] =
    React.useState<number>()
  const [errorCode, setErrorCode] =
    React.useState<UpdateCoordinatorErrorCode | null>(null)
  const [recoveryRecord, setRecoveryRecord] =
    React.useState<UpdateRecoveryRecord | null>(null)
  const [transferResult, setTransferResult] =
    React.useState<UpdateTransferResult | null>(null)
  const [recoveryInspectionComplete, setRecoveryInspectionComplete] =
    React.useState(false)
  const [recoveryRetryPrepared, setRecoveryRetryPrepared] =
    React.useState(false)
  const diagnosticEventsRef = React.useRef<UpdateDebugEvent[]>([])

  const recordDiagnosticEvent = React.useCallback((event: UpdateDebugEvent) => {
    diagnosticEventsRef.current = [...diagnosticEventsRef.current, event].slice(
      -120
    )
  }, [])

  const clearDiagnosticEvents = React.useCallback(() => {
    diagnosticEventsRef.current = []
  }, [])

  const busy = [
    "validating-package",
    "connecting",
    "handshake",
    "transferring",
    "verifying",
    "finalizing",
    "verifying-installation",
    "checking-recovery",
  ].includes(phase)
  const recoveryCanRetryInBrowser = React.useMemo(() => {
    if (!recoveryRecord) return false
    const catalogPackage = findCatalogPackageBySha256(
      recoveryRecord.packageSha256
    )
    return (
      catalogPackage?.releaseStatus !== "disabled" &&
      catalogPackage?.kind !== "firmware" &&
      catalogPackage?.resource?.recoveryCompatibilityPayloadHex !== undefined
    )
  }, [recoveryRecord])
  const diagnosticReportAvailable =
    (phase === "failed" && errorCode !== null) || phase === "outcome-unknown"

  React.useEffect(() => {
    const restore = window.setTimeout(() => {
      const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY)
      if (!raw) return
      try {
        const record = JSON.parse(raw) as UpdateRecoveryRecord
        if (record.packageSha256 && record.createdAt) {
          setRecoveryRecord(record)
          setSelectedPackage(record.packageSummary ?? null)
          setTotalBlocks(record.totalBlocks ?? 0)
          setPhase("outcome-unknown")
        }
      } catch {
        window.localStorage.removeItem(RECOVERY_STORAGE_KEY)
      }
    }, 0)
    return () => window.clearTimeout(restore)
  }, [])

  React.useEffect(() => {
    if (!busy) return
    const preventClose = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", preventClose)
    return () => window.removeEventListener("beforeunload", preventClose)
  }, [busy])

  const selectPackage = React.useCallback(
    async (file: File) => {
      if (busy || phase === "outcome-unknown") return
      clearDiagnosticEvents()
      setPhase("validating-package")
      setErrorCode(null)
      setTransferResult(null)
      try {
        const updatePackage = await validateUpdatePackage(
          file.name,
          new Uint8Array(await file.arrayBuffer())
        )
        packageRef.current = updatePackage
        setSelectedPackage(toSummary(updatePackage))
        setProgress(0)
        setCompletedBlocks(0)
        setTotalBlocks(updatePackage.blockCount)
        setLastAcknowledgedAddress(undefined)
        setPhase("ready")
      } catch (cause) {
        packageRef.current = null
        setSelectedPackage(null)
        setErrorCode(
          cause instanceof UpdatePackageError ? cause.code : "unknown"
        )
        setPhase("failed")
      }
    },
    [busy, clearDiagnosticEvents, phase]
  )

  const clearPackage = React.useCallback(() => {
    if (busy || phase === "outcome-unknown") return
    packageRef.current = null
    setSelectedPackage(null)
    setTransferResult(null)
    setErrorCode(null)
    setProgress(0)
    setCompletedBlocks(0)
    setTotalBlocks(0)
    setLastAcknowledgedAddress(undefined)
    if (recoveryRetryPrepared && recoveryRecord) {
      setRecoveryRetryPrepared(false)
      setPhase("outcome-unknown")
    } else {
      setPhase("idle")
    }
  }, [busy, phase, recoveryRecord, recoveryRetryPrepared])

  const startUpdate = React.useCallback(
    async (acknowledgements: UpdateAcknowledgements) => {
      const updatePackage = packageRef.current
      if (!updatePackage || phase !== "ready") return
      if (!isUpdatePreparationConfirmed(updatePackage, acknowledgements)) {
        setErrorCode("confirmation-required")
        return
      }
      if (capability !== "available") {
        setErrorCode("serial-unavailable")
        return
      }
      if (!claimExternalRadioOperation()) {
        setErrorCode("operation-busy")
        return
      }

      setErrorCode(null)
      setTransferResult(null)
      clearDiagnosticEvents()
      setPhase("connecting")
      const updater = createUvl15wUpdater(
        createWebSerialTransport({
          baudRate: POC_VERIFIED_BAUD_RATE,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none",
          requestToSend: true,
        })
      )

      try {
        const result = await updater.update(updatePackage, {
          recovery: recoveryRetryPrepared,
          onDebugEvent: recordDiagnosticEvent,
          onProgress: (event) => {
            setPhase(event.phase)
            setProgress(event.percent)
            setCompletedBlocks(event.completedBlocks)
            setTotalBlocks(event.totalBlocks)
            setLastAcknowledgedAddress(event.lastAcknowledgedAddress)
            if (event.destructiveStarted) {
              persistRecovery({
                packageSha256: updatePackage.sha256,
                packageKind: updatePackage.kind,
                lastAcknowledgedBlock: event.completedBlocks,
                lastAcknowledgedAddress: event.lastAcknowledgedAddress,
                radioFingerprint: event.radioFingerprint,
                createdAt: new Date().toISOString(),
                phase: event.phase,
                expectedFirmwareVersion: updatePackage.targets.firmware,
                expectedImageVersion: updatePackage.targets.image,
                totalBlocks: event.totalBlocks,
                packageSummary: toSummary(updatePackage),
              })
            }
          },
        })
        persistRecovery({
          packageSha256: result.packageSha256,
          packageKind: result.kind,
          lastAcknowledgedBlock: updatePackage.blockCount,
          lastAcknowledgedAddress:
            updatePackage.startAddress === undefined
              ? undefined
              : updatePackage.startAddress +
                (updatePackage.blockCount - 1) * 512,
          radioFingerprint: result.radioFingerprint,
          createdAt: new Date().toISOString(),
          phase: "awaiting-restart",
          expectedFirmwareVersion: result.expectedFirmwareVersion,
          expectedImageVersion: result.expectedImageVersion,
          totalBlocks: updatePackage.blockCount,
          packageSummary: toSummary(updatePackage),
        })
        setTransferResult(result)
        setProgress(100)
        setPhase("awaiting-restart")
      } catch (cause) {
        const code = updateErrorCode(cause)
        setErrorCode(code)
        if (cause instanceof Uvl15wUpdaterError && cause.outcomeUnknown) {
          const record: UpdateRecoveryRecord = {
            packageSha256: updatePackage.sha256,
            packageKind: updatePackage.kind,
            lastAcknowledgedBlock:
              cause.recovery?.lastAcknowledgedBlock ?? completedBlocks,
            lastAcknowledgedAddress:
              cause.recovery?.lastAcknowledgedAddress ??
              lastAcknowledgedAddress,
            radioFingerprint: cause.recovery?.radioFingerprint,
            createdAt: new Date().toISOString(),
            phase: cause.recovery?.phase ?? phase,
            expectedFirmwareVersion: updatePackage.targets.firmware,
            expectedImageVersion: updatePackage.targets.image,
            totalBlocks: updatePackage.blockCount,
            errorCode: code,
            packageSummary: toSummary(updatePackage),
          }
          persistRecovery(record)
          setRecoveryRecord(record)
          setRecoveryRetryPrepared(false)
          setPhase("outcome-unknown")
        } else if (recoveryRetryPrepared && recoveryRecord) {
          setRecoveryRetryPrepared(false)
          setPhase("outcome-unknown")
        } else {
          setPhase("failed")
        }
      } finally {
        releaseExternalRadioOperation()
      }
    },
    [
      capability,
      claimExternalRadioOperation,
      clearDiagnosticEvents,
      completedBlocks,
      lastAcknowledgedAddress,
      phase,
      recoveryRecord,
      recoveryRetryPrepared,
      recordDiagnosticEvent,
      releaseExternalRadioOperation,
    ]
  )

  const verifyInstallation = React.useCallback(
    async (languageVersionConfirmed: boolean) => {
      if (!transferResult || phase !== "awaiting-restart") return
      if (
        transferResult.requiresLanguageConfirmation &&
        !languageVersionConfirmed
      ) {
        setErrorCode("language-verification-required")
        return
      }
      if (!claimExternalRadioOperation()) {
        setErrorCode("operation-busy")
        return
      }

      setErrorCode(null)
      setPhase("verifying-installation")
      setProgress(0)
      const radio = createUvl15wRadio(
        createWebSerialTransport({ baudRate: POC_VERIFIED_BAUD_RATE })
      )

      try {
        const sourceRadio = await radio.connect()
        if (
          transferResult.expectedFirmwareVersion &&
          normalizeVersion(sourceRadio.firmwareVersion) !==
            transferResult.expectedFirmwareVersion
        ) {
          throw new Error("firmware-version-mismatch")
        }
        if (
          transferResult.expectedImageVersion &&
          normalizeVersion(sourceRadio.imageResourceVersion) !==
            transferResult.expectedImageVersion
        ) {
          throw new Error("image-version-mismatch")
        }
        await radio.read({
          onProgress: ({ percent }) => setProgress(percent),
        })
        await radio.disconnect()
        window.localStorage.removeItem(RECOVERY_STORAGE_KEY)
        setRecoveryRecord(null)
        setRecoveryRetryPrepared(false)
        setProgress(100)
        setPhase("complete")
      } catch (cause) {
        await radio.disconnect().catch(() => undefined)
        const code =
          cause instanceof Error && cause.message.endsWith("version-mismatch")
            ? "verification-mismatch"
            : updateErrorCode(cause)
        setErrorCode(code)
        const record: UpdateRecoveryRecord = {
          packageSha256: transferResult.packageSha256,
          packageKind: transferResult.kind,
          lastAcknowledgedBlock: totalBlocks,
          lastAcknowledgedAddress,
          radioFingerprint: transferResult.radioFingerprint,
          createdAt: new Date().toISOString(),
          phase: "verifying-installation",
          expectedFirmwareVersion: transferResult.expectedFirmwareVersion,
          expectedImageVersion: transferResult.expectedImageVersion,
          totalBlocks,
          errorCode: code,
          packageSummary: selectedPackage ?? undefined,
        }
        persistRecovery(record)
        setRecoveryRecord(record)
        setRecoveryRetryPrepared(false)
        setPhase("outcome-unknown")
      } finally {
        releaseExternalRadioOperation()
      }
    },
    [
      claimExternalRadioOperation,
      lastAcknowledgedAddress,
      phase,
      releaseExternalRadioOperation,
      selectedPackage,
      totalBlocks,
      transferResult,
    ]
  )

  const startAnotherUpdate = React.useCallback(() => {
    if (phase !== "complete") return
    packageRef.current = null
    setSelectedPackage(null)
    setTransferResult(null)
    setErrorCode(null)
    setProgress(0)
    setCompletedBlocks(0)
    setTotalBlocks(0)
    setLastAcknowledgedAddress(undefined)
    setPhase("idle")
  }, [phase])

  const inspectRecoveryRadio = React.useCallback(async () => {
    if (!recoveryRecord || busy) return
    if (capability !== "available") {
      setErrorCode("serial-unavailable")
      return
    }
    if (!claimExternalRadioOperation()) {
      setErrorCode("operation-busy")
      return
    }

    setErrorCode(null)
    setRecoveryInspectionComplete(false)
    setPhase("checking-recovery")
    setProgress(0)
    const radio = createUvl15wRadio(
      createWebSerialTransport({ baudRate: POC_VERIFIED_BAUD_RATE })
    )

    try {
      await radio.connect()
      await radio.read({
        onProgress: ({ percent }) => setProgress(percent),
      })
      await radio.disconnect()
      setProgress(100)
      setRecoveryInspectionComplete(true)
      setPhase("outcome-unknown")
    } catch (cause) {
      await radio.disconnect().catch(() => undefined)
      setErrorCode(updateErrorCode(cause))
      setPhase("outcome-unknown")
    } finally {
      releaseExternalRadioOperation()
    }
  }, [
    busy,
    capability,
    claimExternalRadioOperation,
    recoveryRecord,
    releaseExternalRadioOperation,
  ])

  const selectRecoveryPackage = React.useCallback(
    async (file: File) => {
      if (!recoveryRecord || !recoveryInspectionComplete || busy) return
      setErrorCode(null)
      setPhase("validating-package")
      try {
        const updatePackage = await validateUpdatePackage(
          file.name,
          new Uint8Array(await file.arrayBuffer())
        )
        if (updatePackage.sha256 !== recoveryRecord.packageSha256) {
          setErrorCode("recovery-package-mismatch")
          setPhase("outcome-unknown")
          return
        }
        if (
          updatePackage.kind === "firmware" ||
          updatePackage.recoveryCompatibilityPayload === undefined
        ) {
          setErrorCode("unsupported-recovery")
          setPhase("outcome-unknown")
          return
        }

        packageRef.current = updatePackage
        setSelectedPackage(toSummary(updatePackage))
        setProgress(0)
        setCompletedBlocks(0)
        setTotalBlocks(updatePackage.blockCount)
        setLastAcknowledgedAddress(undefined)
        setRecoveryInspectionComplete(false)
        setRecoveryRetryPrepared(true)
        setPhase("ready")
      } catch (cause) {
        setErrorCode(
          cause instanceof UpdatePackageError ? cause.code : "unknown"
        )
        setPhase("outcome-unknown")
      }
    },
    [busy, recoveryInspectionComplete, recoveryRecord]
  )

  const confirmOfficialCpsRecovery = React.useCallback(() => {
    if (!recoveryRecord || !recoveryInspectionComplete || busy) return
    window.localStorage.removeItem(RECOVERY_STORAGE_KEY)
    packageRef.current = null
    setRecoveryRecord(null)
    setRecoveryInspectionComplete(false)
    setRecoveryRetryPrepared(false)
    setSelectedPackage(null)
    setTransferResult(null)
    setErrorCode(null)
    setProgress(0)
    setCompletedBlocks(0)
    setTotalBlocks(0)
    setLastAcknowledgedAddress(undefined)
    setPhase("idle")
  }, [busy, recoveryInspectionComplete, recoveryRecord])

  const downloadDiagnosticReport = React.useCallback(() => {
    if (!diagnosticReportAvailable) return
    const report = createUpdateDiagnosticReport({
      generatedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      userAgent: window.navigator.userAgent,
      phase,
      errorCode: errorCode ?? recoveryRecord?.errorCode ?? "outcome-unknown",
      selectedPackage,
      progress: {
        percent: progress,
        completedBlocks,
        totalBlocks,
        lastAcknowledgedAddress,
      },
      recoveryRecord,
      transferResult,
      events: diagnosticEventsRef.current,
    })
    const url = URL.createObjectURL(
      new Blob([report.content], { type: report.mimeType })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = report.fileName
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [
    completedBlocks,
    diagnosticReportAvailable,
    errorCode,
    lastAcknowledgedAddress,
    phase,
    progress,
    recoveryRecord,
    selectedPackage,
    totalBlocks,
    transferResult,
  ])

  const value = React.useMemo<UpdateCoordinatorContextValue>(
    () => ({
      phase,
      capability,
      selectedPackage,
      progress,
      completedBlocks,
      totalBlocks,
      lastAcknowledgedAddress,
      errorCode,
      recoveryRecord,
      transferResult,
      busy,
      recoveryInspectionComplete,
      recoveryRetryPrepared,
      recoveryCanRetryInBrowser,
      diagnosticReportAvailable,
      selectPackage,
      clearPackage,
      startUpdate,
      verifyInstallation,
      startAnotherUpdate,
      inspectRecoveryRadio,
      selectRecoveryPackage,
      confirmOfficialCpsRecovery,
      downloadDiagnosticReport,
    }),
    [
      phase,
      capability,
      selectedPackage,
      progress,
      completedBlocks,
      totalBlocks,
      lastAcknowledgedAddress,
      errorCode,
      recoveryRecord,
      transferResult,
      busy,
      recoveryInspectionComplete,
      recoveryRetryPrepared,
      recoveryCanRetryInBrowser,
      diagnosticReportAvailable,
      selectPackage,
      clearPackage,
      startUpdate,
      verifyInstallation,
      startAnotherUpdate,
      inspectRecoveryRadio,
      selectRecoveryPackage,
      confirmOfficialCpsRecovery,
      downloadDiagnosticReport,
    ]
  )

  return value
}

function toSummary(
  updatePackage: ValidatedUpdatePackage
): UpdatePackageSummary {
  return Object.freeze({
    catalogId: updatePackage.catalogId,
    kind: updatePackage.kind,
    fileName: updatePackage.fileName,
    version: updatePackage.version,
    releaseStatus: updatePackage.releaseStatus,
    byteLength: updatePackage.byteLength,
    sha256: updatePackage.sha256,
    blockCount: updatePackage.blockCount,
    targets: updatePackage.targets,
    prerequisites: updatePackage.prerequisites,
    startAddress: updatePackage.startAddress,
    endAddress: updatePackage.endAddress,
  })
}

function persistRecovery(record: UpdateRecoveryRecord) {
  window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(record))
}

function normalizeVersion(value: string) {
  const match = /^(?:V)?(\d+)\.(\d+)\.(\d+)$/i.exec(value.trim())
  if (!match) return null
  return `${Number(match[1])}.${Number(match[2]).toString().padStart(2, "0")}.${Number(match[3]).toString().padStart(2, "0")}`
}

function updateErrorCode(cause: unknown): UpdateCoordinatorErrorCode {
  if (cause instanceof DOMException) {
    return cause.name === "NotFoundError" || cause.name === "SecurityError"
      ? "serial-permission"
      : "serial-unavailable"
  }
  if (cause instanceof WebSerialTransportError) {
    return cause.code === "connection-closed"
      ? "connection-closed"
      : "serial-unavailable"
  }
  if (cause instanceof Uvl15wUpdaterError) {
    return cause.code === "not-connected" ? "connection-closed" : cause.code
  }
  if (cause instanceof Uvl15wRadioError) {
    if (cause.code === "connection-closed") return "connection-closed"
    if (cause.code === "response-timeout") return "response-timeout"
    if (
      cause.code === "incompatible-radio" ||
      cause.code === "unsupported-firmware"
    ) {
      return "incompatible-radio"
    }
    return cause.code === "protocol" ? "protocol" : "unexpected-response"
  }
  return "unknown"
}

export { useUpdateCoordinatorController }
export type {
  UpdateCoordinatorContextValue,
  UpdateCoordinatorErrorCode,
  UpdateCoordinatorPhase,
  UpdateRecoveryRecord,
}
