"use client"

import * as React from "react"

import {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
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

type WorkspaceStatus = "disconnected" | "connecting" | "reading" | "ready"

interface CpsWorkspaceContextValue {
  readonly status: WorkspaceStatus
  readonly sourceRadio: SourceRadio | null
  readonly completedRead: CompletedRadioRead | null
  readonly progress: number
  readonly error: WorkspaceError | null
  readonly webSerialSupported: boolean | null
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
  const webSerialSupported = React.useSyncExternalStore(
    subscribeToBrowserCapability,
    getWebSerialSupport,
    getServerWebSerialSupport
  )
  const [status, setStatus] = React.useState<WorkspaceStatus>("disconnected")
  const [sourceRadio, setSourceRadio] = React.useState<SourceRadio | null>(null)
  const [completedRead, setCompletedRead] =
    React.useState<CompletedRadioRead | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<WorkspaceError | null>(null)

  const busy = status === "connecting" || status === "reading"

  const readRadio = React.useCallback(async () => {
    if (!webSerialSupported || busy) {
      return
    }

    setError(null)
    setProgress(0)
    setStatus("connecting")

    try {
      await workspace.current?.disconnect().catch(() => undefined)

      const nextWorkspace = createCpsWorkspace(
        createWebSerialTransport({ baudRate: POC_VERIFIED_BAUD_RATE })
      )
      workspace.current = nextWorkspace

      const radio = await nextWorkspace.connect()
      setSourceRadio(radio)
      setStatus("reading")

      const result = await nextWorkspace.read({
        onProgress: ({ percent }) => setProgress(percent),
      })

      setCompletedRead(result)
      setProgress(100)
      setStatus("ready")
    } catch (cause) {
      setError(workspaceError(cause))
      setSourceRadio(null)
      setStatus("disconnected")
    }
  }, [busy, webSerialSupported])

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
    return () => {
      void workspace.current?.disconnect().catch(() => undefined)
    }
  }, [])

  const value = React.useMemo<CpsWorkspaceContextValue>(
    () => ({
      status,
      sourceRadio,
      completedRead,
      progress,
      error,
      webSerialSupported,
      busy,
      readRadio,
      downloadRawBackup,
    }),
    [
      status,
      sourceRadio,
      completedRead,
      progress,
      error,
      webSerialSupported,
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

function subscribeToBrowserCapability() {
  return () => undefined
}

function getWebSerialSupport() {
  return "serial" in navigator
}

function getServerWebSerialSupport() {
  return null
}

export { CpsWorkspaceProvider, useCpsWorkspace }
export type { WorkspaceError, WorkspaceErrorKey, WorkspaceStatus }
