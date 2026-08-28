"use client"

import * as React from "react"

import {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
  detectRadioCapability,
  type RadioCapability,
  type WebSerialTransport,
} from "@/adapters/web-serial/index"
import { createIndexedDbRadioWriteStore } from "@/adapters/indexed-db-radio-write-store/index"
import { createIndexedDbBackupHistoryStore } from "@/adapters/indexed-db-backup-history-store/index"
import {
  createCpsWorkspace,
  type CompletedRadioRead,
  type CpsWorkspace,
  type RadioWriteOperationSnapshot,
  type RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import { canEnableRadioWriteCanary } from "@/modules/cps-workspace/radio-write-canary"
import {
  reconcileBandScanListSelectionChange,
  reconcileBandZoneSelectionChange,
  reconcileAprsSettingChanges,
  reconcileBluetoothSettingChanges,
  reconcileChannelMembershipChanges,
  reconcileDisplaySettingChanges,
  reconcileDtmfSettingChanges,
  reconcileFiveToneSettingChanges,
  reconcileFmBroadcastChannelChanges,
  reconcileFmBroadcastSettingChanges,
  reconcileFunctionSettingChanges,
  reconcileGpsSettingChanges,
  reconcileKeyboardSettingChanges,
  reconcileMenuVisibilityChanges,
  reconcileSoundSettingChanges,
  reconcileSpectrumSettingChanges,
  reconcileTwoToneSettingChanges,
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
  reconcileScanListEditChanges,
  reconcileSpecialChannelEditChanges,
  reconcileZoneEditChanges,
  reconcileVfoScanEdgeChanges,
  reconcileVfoScanEdgeSelectionChange,
  type WorkspaceChange,
} from "@/modules/cps-workspace/change-set"
import type {
  CallChannelPatch,
  AprsSettingsPatch,
  BluetoothSettingsPatch,
  ChannelMembershipPatch,
  ChannelCollectionPatch,
  DisplaySettingsPatch,
  DtmfSettingsPatch,
  FiveToneSettingsPatch,
  FmBroadcastChannelPatch,
  FmBroadcastSettingsPatch,
  FunctionSettingsPatch,
  GpsSettingsPatch,
  KeyboardSettingsPatch,
  MenuVisibilityItemId,
  MemoryChannelPatch,
  RadioBand,
  SoundSettingsPatch,
  SpectrumSettingsPatch,
  TwoToneSettingsPatch,
  VfoChannelPatch,
  VfoScanEdgePatch,
} from "@/modules/codeplug/index"
import {
  UnsupportedFirmwareError,
  Uvl15wRadioError,
  type RadioDebugEvent,
  type SourceRadio,
  type UnsupportedFirmwareReason,
  type Uvl15wRadioErrorCode,
} from "@/modules/uvl15w-radio/index"

type WorkspacePhase = "idle" | "connecting" | "reading" | "ready"

const RADIO_WRITE_RELEASED = canEnableRadioWriteCanary({
  development: process.env.NODE_ENV === "development",
  requested: process.env.NEXT_PUBLIC_ENABLE_RADIO_WRITE_CANARY === "1",
})

interface CpsWorkspaceContextValue {
  readonly phase: WorkspacePhase
  readonly sourceRadio: SourceRadio | null
  readonly completedRead: CompletedRadioRead | null
  readonly progress: number
  readonly error: WorkspaceError | null
  readonly capability: RadioCapability | "checking"
  readonly busy: boolean
  readonly changes: readonly WorkspaceChange[]
  readonly radioWriteReleased: boolean
  readonly radioWriteSnapshot: RadioWriteOperationSnapshot | null
  readonly radioWriteReview: readonly RadioWriteReviewItem[]
  claimExternalRadioOperation(): boolean
  releaseExternalRadioOperation(): void
  readRadio(): Promise<void>
  prepareRadioWrite(): Promise<void>
  confirmRadioWrite(): Promise<void>
  discardRadioWriteStatus(): Promise<void>
  downloadRadioOperationReport(): void
  downloadRawBackup(): void
  addMemoryChannel(): void
  duplicateMemoryChannel(number: number): void
  deleteMemoryChannel(number: number): void
  editMemoryChannel(number: number, patch: MemoryChannelPatch): void
  editChannelMemberships(number: number, patch: ChannelMembershipPatch): void
  editVfoChannel(slot: "A" | "B", patch: VfoChannelPatch): void
  editCallChannel(slot: 1 | 2, patch: CallChannelPatch): void
  editZone(number: number, patch: ChannelCollectionPatch): void
  editScanList(number: number, patch: ChannelCollectionPatch): void
  editBandZoneSelection(band: RadioBand, zoneNumbers: readonly number[]): void
  editBandScanListSelection(
    band: RadioBand,
    scanListNumbers: readonly number[]
  ): void
  editVfoScanEdge(number: number, patch: VfoScanEdgePatch): void
  editVfoScanEdgeSelection(band: RadioBand, numbers: readonly number[]): void
  editFunctionSettings(patch: FunctionSettingsPatch): void
  editDisplaySettings(patch: DisplaySettingsPatch): void
  editSoundSettings(patch: SoundSettingsPatch): void
  editKeyboardSettings(patch: KeyboardSettingsPatch): void
  editAprsSettings(patch: AprsSettingsPatch): void
  editGpsSettings(patch: GpsSettingsPatch): void
  editBluetoothSettings(patch: BluetoothSettingsPatch): void
  editSpectrumSettings(patch: SpectrumSettingsPatch): void
  editDtmfSettings(patch: DtmfSettingsPatch): void
  editTwoToneSettings(patch: TwoToneSettingsPatch): void
  editFiveToneSettings(patch: FiveToneSettingsPatch): void
  editFmBroadcastChannel(number: number, patch: FmBroadcastChannelPatch): void
  editFmBroadcastSettings(patch: FmBroadcastSettingsPatch): void
  setMenuVisibility(id: MenuVisibilityItemId, visible: boolean): void
  moveMemoryChannel(fromNumber: number, toNumber: number): void
  resetWorkingCodeplug(): void
}

type WorkspaceError =
  | { readonly key: WorkspaceErrorKey }
  | {
      readonly kind: "unsupportedFirmware"
      readonly reason: UnsupportedFirmwareReason
      readonly detectedVersion: string
      readonly validatedVersion: string
    }
  | { readonly message: string }

type WorkspaceErrorKey =
  | "noRadioSelected"
  | "serialPermissionDenied"
  | "serialPortSelectionRequired"
  | "serialPortUnavailable"
  | "serialConnectionClosed"
  | "serialStreamsUnavailable"
  | "webSerialUnavailable"
  | "radioAlreadyConnected"
  | "radioNotConnected"
  | "radioOperationInProgress"
  | "radioConnectionClosed"
  | "radioResponseTimeout"
  | "radioProtocolError"
  | "incompatibleRadio"
  | "readPasswordRequired"
  | "writePasswordRequired"
  | "unexpectedRadioResponse"
  | "backupHistorySaveFailed"
  | "unknownRadioError"

function useCpsWorkspaceController() {
  const workspace = React.useRef<CpsWorkspace | null>(null)
  const radioTransport = React.useRef<WebSerialTransport | null>(null)
  const mounted = React.useRef(true)
  const operationInProgress = React.useRef(false)
  const radioDebugEvents = React.useRef<RadioDebugEvent[]>([])
  const [capability, setCapability] = React.useState<
    RadioCapability | "checking"
  >("checking")
  const [phase, setPhase] = React.useState<WorkspacePhase>("idle")
  const [sourceRadio, setSourceRadio] = React.useState<SourceRadio | null>(null)
  const [documentState, setDocumentState] = React.useState<{
    readonly completedRead: CompletedRadioRead | null
    readonly changes: readonly WorkspaceChange[]
  }>({ completedRead: null, changes: [] })
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<WorkspaceError | null>(null)
  const [radioWriteSnapshot, setRadioWriteSnapshot] =
    React.useState<RadioWriteOperationSnapshot | null>(null)
  const [radioWriteReview, setRadioWriteReview] = React.useState<
    readonly RadioWriteReviewItem[]
  >([])
  const [externalOperationBusy, setExternalOperationBusy] =
    React.useState(false)
  const { completedRead, changes } = documentState

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
    radioDebugEvents.current = [...radioDebugEvents.current, event].slice(-5000)
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
        onDebugEvent: RADIO_WRITE_RELEASED ? recordRadioDebugEvent : undefined,
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
      setDocumentState({ completedRead: result, changes: [] })
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
      !radioTransport.current
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
      setDocumentState({ completedRead: result, changes: [] })
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
    try {
      await workspace.current?.discardRadioWriteOperation()
      setRadioWriteSnapshot(null)
      setRadioWriteReview([])
      setError(null)
    } catch (cause) {
      setError(workspaceError(cause))
    }
  }, [])

  const downloadRawBackup = React.useCallback(() => {
    if (!completedRead) {
      return
    }

    const bytes = completedRead.baselineBackup.codeplug.toBytes()
    const blob = new Blob([bytes.slice().buffer], {
      type: "application/octet-stream",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${safeFilename(completedRead.sourceRadio.serialNumber)}-codeplug-backup.bin`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [completedRead])

  const downloadRadioOperationReport = React.useCallback(() => {
    if (!RADIO_WRITE_RELEASED || radioDebugEvents.current.length === 0) return
    downloadJson(
      "uvl15w-radio-operation-report.json",
      Object.freeze({
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        events: radioDebugEvents.current,
      })
    )
  }, [])

  const moveMemoryChannel = React.useCallback(
    (fromNumber: number, toNumber: number) => {
      if (fromNumber === toNumber) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const workingCodeplug = Object.freeze({
          ...completedRead.workingCodeplug,
          codeplug: completedRead.workingCodeplug.codeplug.moveMemoryChannel(
            fromNumber,
            toNumber
          ),
        })
        const changes = workingCodeplug.codeplug.equals(
          completedRead.baselineBackup.codeplug
        )
          ? []
          : [
              ...current.changes,
              Object.freeze({
                kind: "move-memory-channel" as const,
                fromNumber,
                toNumber,
              }),
            ]

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug,
          }),
          changes,
        })
      })
    },
    []
  )

  const editMemoryChannel = React.useCallback(
    (number: number, patch: MemoryChannelPatch) => {
      const fields = Object.keys(patch) as (keyof MemoryChannelPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editMemoryChannel(
            number,
            patch
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileMemoryChannelEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    []
  )

  const editChannelMemberships = React.useCallback(
    (number: number, patch: ChannelMembershipPatch) => {
      if (Object.keys(patch).length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editChannelMemberships(
            number,
            patch
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileChannelMembershipChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug
          ),
        })
      })
    },
    []
  )

  const editVfoChannel = React.useCallback(
    (slot: "A" | "B", patch: VfoChannelPatch) => {
      const fields = Object.keys(patch) as (keyof VfoChannelPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editVfoChannel(slot, patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpecialChannelEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            { kind: "vfo", slot, fields }
          ),
        })
      })
    },
    []
  )

  const editCallChannel = React.useCallback(
    (slot: 1 | 2, patch: CallChannelPatch) => {
      const fields = Object.keys(patch) as (keyof CallChannelPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editCallChannel(slot, patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpecialChannelEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            { kind: "call", slot, fields }
          ),
        })
      })
    },
    []
  )

  const editZone = React.useCallback(
    (number: number, patch: ChannelCollectionPatch) => {
      const fields = Object.keys(patch) as (keyof ChannelCollectionPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug = completedRead.workingCodeplug.codeplug.editZone(
          number,
          patch
        )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileZoneEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    []
  )

  const editScanList = React.useCallback(
    (number: number, patch: ChannelCollectionPatch) => {
      const fields = Object.keys(patch) as (keyof ChannelCollectionPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editScanList(number, patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileScanListEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    []
  )

  const editBandZoneSelection = React.useCallback(
    (band: RadioBand, zoneNumbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBandZoneSelection(
            band,
            zoneNumbers
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBandZoneSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    []
  )

  const editBandScanListSelection = React.useCallback(
    (band: RadioBand, scanListNumbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBandScanListSelection(
            band,
            scanListNumbers
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBandScanListSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    []
  )

  const editVfoScanEdge = React.useCallback(
    (number: number, patch: VfoScanEdgePatch) => {
      const fields = Object.keys(patch) as (keyof VfoScanEdgePatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editVfoScanEdge(number, patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileVfoScanEdgeChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    []
  )

  const editVfoScanEdgeSelection = React.useCallback(
    (band: RadioBand, numbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editVfoScanEdgeSelection(
            band,
            numbers
          )
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileVfoScanEdgeSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    []
  )

  const editFunctionSettings = React.useCallback(
    (patch: FunctionSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FunctionSettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFunctionSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFunctionSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editDisplaySettings = React.useCallback(
    (patch: DisplaySettingsPatch) => {
      const fields = Object.keys(patch) as (keyof DisplaySettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editDisplaySettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileDisplaySettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editSoundSettings = React.useCallback((patch: SoundSettingsPatch) => {
    const fields = Object.keys(patch) as (keyof SoundSettingsPatch)[]
    if (fields.length === 0) {
      return
    }

    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }
      const completedRead = current.completedRead
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.editSoundSettings(patch)

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: nextCodeplug,
          }),
        }),
        changes: reconcileSoundSettingChanges(
          current.changes,
          completedRead.baselineBackup.codeplug,
          nextCodeplug,
          fields
        ),
      })
    })
  }, [])

  const editKeyboardSettings = React.useCallback(
    (patch: KeyboardSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof KeyboardSettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editKeyboardSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileKeyboardSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editAprsSettings = React.useCallback((patch: AprsSettingsPatch) => {
    const fields = Object.keys(patch) as (keyof AprsSettingsPatch)[]
    if (fields.length === 0) return

    setDocumentState((current) => {
      if (!current.completedRead) return current
      const completedRead = current.completedRead
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.editAprsSettings(patch)

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: nextCodeplug,
          }),
        }),
        changes: reconcileAprsSettingChanges(
          current.changes,
          completedRead.baselineBackup.codeplug,
          nextCodeplug,
          fields
        ),
      })
    })
  }, [])

  const editGpsSettings = React.useCallback((patch: GpsSettingsPatch) => {
    const fields = Object.keys(patch) as (keyof GpsSettingsPatch)[]
    if (fields.length === 0) return

    setDocumentState((current) => {
      if (!current.completedRead) return current
      const completedRead = current.completedRead
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.editGpsSettings(patch)

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: nextCodeplug,
          }),
        }),
        changes: reconcileGpsSettingChanges(
          current.changes,
          completedRead.baselineBackup.codeplug,
          nextCodeplug,
          fields
        ),
      })
    })
  }, [])

  const editBluetoothSettings = React.useCallback(
    (patch: BluetoothSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof BluetoothSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBluetoothSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBluetoothSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editSpectrumSettings = React.useCallback(
    (patch: SpectrumSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof SpectrumSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editSpectrumSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpectrumSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editDtmfSettings = React.useCallback((patch: DtmfSettingsPatch) => {
    const fields = Object.keys(patch) as (keyof DtmfSettingsPatch)[]
    if (fields.length === 0) return
    setDocumentState((current) => {
      if (!current.completedRead) return current
      const completedRead = current.completedRead
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.editDtmfSettings(patch)
      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: nextCodeplug,
          }),
        }),
        changes: reconcileDtmfSettingChanges(
          current.changes,
          completedRead.baselineBackup.codeplug,
          nextCodeplug,
          fields
        ),
      })
    })
  }, [])

  const editTwoToneSettings = React.useCallback(
    (patch: TwoToneSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof TwoToneSettingsPatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editTwoToneSettings(patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileTwoToneSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editFiveToneSettings = React.useCallback(
    (patch: FiveToneSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FiveToneSettingsPatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFiveToneSettings(patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFiveToneSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const editFmBroadcastChannel = React.useCallback(
    (number: number, patch: FmBroadcastChannelPatch) => {
      const fields = Object.keys(patch) as (keyof FmBroadcastChannelPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFmBroadcastChannel(
            number,
            patch
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFmBroadcastChannelChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    []
  )

  const editFmBroadcastSettings = React.useCallback(
    (patch: FmBroadcastSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FmBroadcastSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFmBroadcastSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFmBroadcastSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    []
  )

  const setMenuVisibility = React.useCallback(
    (id: MenuVisibilityItemId, visible: boolean) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.setMenuVisibility(id, visible)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileMenuVisibilityChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug
          ),
        })
      })
    },
    []
  )

  const addMemoryChannel = React.useCallback(() => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      const completedRead = current.completedRead
      const number =
        completedRead.workingCodeplug.codeplug
          .getChannels()
          .findIndex((channel) => !channel.valid) + 1
      if (number === 0) {
        return current
      }

      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.addMemoryChannel()
      const result = reconcileMemoryChannelStructureChange(
        current.changes,
        completedRead.baselineBackup.codeplug,
        completedRead.workingCodeplug.codeplug,
        nextCodeplug,
        { kind: "add-memory-channel", number }
      )

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: result.codeplug,
          }),
        }),
        changes: result.changes,
      })
    })
  }, [])

  const duplicateMemoryChannel = React.useCallback((number: number) => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      const completedRead = current.completedRead
      const channels = completedRead.workingCodeplug.codeplug.getChannels()
      const hasUnusedAfter = channels
        .slice(number)
        .some((channel) => !channel.valid)
      const copyNumber = hasUnusedAfter ? number + 1 : number
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.duplicateMemoryChannel(number)
      const result = reconcileMemoryChannelStructureChange(
        current.changes,
        completedRead.baselineBackup.codeplug,
        completedRead.workingCodeplug.codeplug,
        nextCodeplug,
        { kind: "add-memory-channel", number: copyNumber }
      )

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: result.codeplug,
          }),
        }),
        changes: result.changes,
      })
    })
  }, [])

  const deleteMemoryChannel = React.useCallback((number: number) => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      const completedRead = current.completedRead
      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.deleteMemoryChannel(number)
      const result = reconcileMemoryChannelStructureChange(
        current.changes,
        completedRead.baselineBackup.codeplug,
        completedRead.workingCodeplug.codeplug,
        nextCodeplug,
        { kind: "delete-memory-channel", number }
      )

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: result.codeplug,
          }),
        }),
        changes: result.changes,
      })
    })
  }, [])

  const resetWorkingCodeplug = React.useCallback(() => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      return Object.freeze({
        completedRead: Object.freeze({
          ...current.completedRead,
          workingCodeplug: Object.freeze({
            ...current.completedRead.workingCodeplug,
            codeplug: current.completedRead.baselineBackup.codeplug,
          }),
        }),
        changes: [],
      })
    })
  }, [])

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
      onDebugEvent: RADIO_WRITE_RELEASED ? recordRadioDebugEvent : undefined,
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
      radioWriteReleased: RADIO_WRITE_RELEASED,
      radioWriteSnapshot,
      radioWriteReview,
      claimExternalRadioOperation,
      releaseExternalRadioOperation,
      readRadio,
      prepareRadioWrite,
      confirmRadioWrite,
      discardRadioWriteStatus,
      downloadRadioOperationReport,
      downloadRawBackup,
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
      radioWriteSnapshot,
      radioWriteReview,
      claimExternalRadioOperation,
      releaseExternalRadioOperation,
      readRadio,
      prepareRadioWrite,
      confirmRadioWrite,
      discardRadioWriteStatus,
      downloadRadioOperationReport,
      downloadRawBackup,
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
    ]
  )

  return value
}

function workspaceError(error: unknown): WorkspaceError {
  if (error instanceof DOMException) {
    const domErrorKeys: Partial<Record<string, WorkspaceErrorKey>> = {
      NotFoundError: "noRadioSelected",
      SecurityError: "serialPermissionDenied",
      NetworkError: "serialPortUnavailable",
      InvalidStateError: "serialPortUnavailable",
    }

    return { key: domErrorKeys[error.name] ?? "unknownRadioError" }
  }

  if (error instanceof WebSerialTransportError) {
    const serialErrorKeys: Record<
      WebSerialTransportError["code"],
      WorkspaceErrorKey
    > = {
      "connection-closed": "serialConnectionClosed",
      "port-selection-required": "serialPortSelectionRequired",
      unavailable: "webSerialUnavailable",
      "streams-unavailable": "serialStreamsUnavailable",
    }

    return { key: serialErrorKeys[error.code] }
  }

  if (error instanceof UnsupportedFirmwareError) {
    return {
      kind: "unsupportedFirmware",
      reason: error.reason,
      detectedVersion: error.detectedVersion,
      validatedVersion: error.validatedVersion,
    }
  }

  if (error instanceof Uvl15wRadioError) {
    if (error.code === "unsupported-firmware") {
      return { message: error.message }
    }

    const radioErrorKeys: Record<
      Exclude<Uvl15wRadioErrorCode, "unsupported-firmware">,
      WorkspaceErrorKey
    > = {
      "already-connected": "radioAlreadyConnected",
      "not-connected": "radioNotConnected",
      "operation-in-progress": "radioOperationInProgress",
      "connection-closed": "radioConnectionClosed",
      "response-timeout": "radioResponseTimeout",
      protocol: "radioProtocolError",
      "incompatible-radio": "incompatibleRadio",
      "read-password-required": "readPasswordRequired",
      "write-password-required": "writePasswordRequired",
      "unexpected-response": "unexpectedRadioResponse",
    }

    return { key: radioErrorKeys[error.code] }
  }

  return error instanceof Error
    ? { message: error.message }
    : { key: "unknownRadioError" }
}

function safeFilename(value: string) {
  const safeValue = value.trim().replace(/[^a-z0-9._-]+/gi, "-")
  return safeValue || "uvl15w"
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function getRadioCapability(): RadioCapability {
  const serial = (navigator as Navigator & { readonly serial?: unknown }).serial
  return detectRadioCapability(window.isSecureContext, serial)
}

export { useCpsWorkspaceController }
export type {
  CpsWorkspaceContextValue,
  WorkspaceChange,
  WorkspaceError,
  WorkspaceErrorKey,
  WorkspacePhase,
}
