"use client"

import * as React from "react"

import {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
  detectRadioCapability,
  type RadioCapability,
} from "@/adapters/web-serial/index"
import {
  createCpsWorkspace,
  type CompletedRadioRead,
  type CpsWorkspace,
} from "@/modules/cps-workspace/index"
import {
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
  reconcileSpecialChannelEditChanges,
  type WorkspaceChange,
} from "@/modules/cps-workspace/change-set"
import type {
  CallChannelPatch,
  MemoryChannelPatch,
  VfoChannelPatch,
} from "@/modules/codeplug/index"
import {
  Uvl15wRadioError,
  type SourceRadio,
  type Uvl15wRadioErrorCode,
} from "@/modules/uvl15w-radio/index"

type WorkspacePhase = "idle" | "connecting" | "reading" | "ready"

interface CpsWorkspaceContextValue {
  readonly phase: WorkspacePhase
  readonly sourceRadio: SourceRadio | null
  readonly completedRead: CompletedRadioRead | null
  readonly progress: number
  readonly error: WorkspaceError | null
  readonly capability: RadioCapability | "checking"
  readonly busy: boolean
  readonly changes: readonly WorkspaceChange[]
  readRadio(): Promise<void>
  downloadRawBackup(): void
  addMemoryChannel(): void
  deleteMemoryChannel(number: number): void
  editMemoryChannel(number: number, patch: MemoryChannelPatch): void
  editVfoChannel(slot: "A" | "B", patch: VfoChannelPatch): void
  editCallChannel(slot: 1 | 2, patch: CallChannelPatch): void
  moveMemoryChannel(fromNumber: number, toNumber: number): void
  resetWorkingCodeplug(): void
}

type WorkspaceError =
  { readonly key: WorkspaceErrorKey } | { readonly message: string }

type WorkspaceErrorKey =
  | "noRadioSelected"
  | "serialPermissionDenied"
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
  | "unexpectedRadioResponse"
  | "unknownRadioError"

const CpsWorkspaceContext =
  React.createContext<CpsWorkspaceContextValue | null>(null)

function CpsWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspace = React.useRef<CpsWorkspace | null>(null)
  const mounted = React.useRef(true)
  const operationInProgress = React.useRef(false)
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
  const { completedRead, changes } = documentState

  const busy = phase === "connecting" || phase === "reading"

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

      const nextWorkspace = createCpsWorkspace(
        createWebSerialTransport({
          baudRate: POC_VERIFIED_BAUD_RATE,
        })
      )
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
  }, [busy, capability, completedRead])

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
    const capabilityCheck = window.setTimeout(() => {
      setCapability(getRadioCapability())
    }, 0)

    return () => {
      window.clearTimeout(capabilityCheck)
      mounted.current = false
      void workspace.current?.disconnect().catch(() => undefined)
    }
  }, [])

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
      readRadio,
      downloadRawBackup,
      addMemoryChannel,
      deleteMemoryChannel,
      editMemoryChannel,
      editVfoChannel,
      editCallChannel,
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
      readRadio,
      downloadRawBackup,
      addMemoryChannel,
      deleteMemoryChannel,
      editMemoryChannel,
      editVfoChannel,
      editCallChannel,
      moveMemoryChannel,
      resetWorkingCodeplug,
    ]
  )

  return (
    <CpsWorkspaceContext.Provider value={value}>
      {children}
    </CpsWorkspaceContext.Provider>
  )
}

function useCpsWorkspace() {
  const context = React.useContext(CpsWorkspaceContext)

  if (!context) {
    throw new Error("useCpsWorkspace must be used within CpsWorkspaceProvider")
  }

  return context
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
      unavailable: "webSerialUnavailable",
      "streams-unavailable": "serialStreamsUnavailable",
    }

    return { key: serialErrorKeys[error.code] }
  }

  if (error instanceof Uvl15wRadioError) {
    const radioErrorKeys: Record<Uvl15wRadioErrorCode, WorkspaceErrorKey> = {
      "already-connected": "radioAlreadyConnected",
      "not-connected": "radioNotConnected",
      "operation-in-progress": "radioOperationInProgress",
      "connection-closed": "radioConnectionClosed",
      "response-timeout": "radioResponseTimeout",
      protocol: "radioProtocolError",
      "incompatible-radio": "incompatibleRadio",
      "read-password-required": "readPasswordRequired",
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

function getRadioCapability(): RadioCapability {
  const serial = (navigator as Navigator & { readonly serial?: unknown }).serial
  return detectRadioCapability(window.isSecureContext, serial)
}

export { CpsWorkspaceProvider, useCpsWorkspace }
export type {
  WorkspaceChange,
  WorkspaceError,
  WorkspaceErrorKey,
  WorkspacePhase,
}
