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
  readRadio(): Promise<void>
  downloadRawBackup(): void
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
  const [completedRead, setCompletedRead] =
    React.useState<CompletedRadioRead | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<WorkspaceError | null>(null)

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
      setCompletedRead(result)
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
      readRadio,
      downloadRawBackup,
    }),
    [
      phase,
      sourceRadio,
      completedRead,
      progress,
      error,
      capability,
      busy,
      readRadio,
      downloadRawBackup,
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
export type { WorkspaceError, WorkspaceErrorKey, WorkspacePhase }
