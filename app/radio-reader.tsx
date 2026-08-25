"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  DownloadIcon,
  HardDriveIcon,
  RadioIcon,
  UnplugIcon,
  UsbIcon,
} from "lucide-react"

import {
  POC_VERIFIED_BAUD_RATE,
  createWebSerialTransport,
} from "@/adapters/web-serial/index"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  createCpsWorkspace,
  type CompletedRadioRead,
  type CpsWorkspace,
} from "@/modules/cps-workspace/index"
import type { SourceRadio } from "@/modules/uvl15w-radio/index"

type ScreenStatus =
  "disconnected" | "connecting" | "connected" | "reading" | "ready"

function RadioReader() {
  const workspace = React.useRef<CpsWorkspace | null>(null)
  const webSerialSupported = React.useSyncExternalStore(
    subscribeToBrowserCapability,
    getWebSerialSupport,
    getServerWebSerialSupport
  )
  const [status, setStatus] = React.useState<ScreenStatus>("disconnected")
  const [sourceRadio, setSourceRadio] = React.useState<SourceRadio | null>(null)
  const [completedRead, setCompletedRead] =
    React.useState<CompletedRadioRead | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const busy = status === "connecting" || status === "reading"

  async function connect() {
    if (!webSerialSupported) {
      return
    }

    setError(null)
    setStatus("connecting")

    try {
      await workspace.current?.disconnect()
      const nextWorkspace = createCpsWorkspace(
        createWebSerialTransport({ baudRate: POC_VERIFIED_BAUD_RATE })
      )
      workspace.current = nextWorkspace
      const radio = await nextWorkspace.connect()
      setSourceRadio(radio)
      setStatus("connected")
    } catch (cause) {
      setError(errorMessage(cause))
      setStatus("disconnected")
    }
  }

  async function readRadio() {
    if (!workspace.current) {
      return
    }

    setError(null)
    setProgress(0)
    setStatus("reading")

    try {
      const result = await workspace.current.read({
        onProgress: ({ percent }) => setProgress(percent),
      })
      setCompletedRead(result)
      setProgress(100)
      setStatus("ready")
    } catch (cause) {
      setError(errorMessage(cause))
      setSourceRadio(null)
      setStatus("disconnected")
    }
  }

  async function disconnect() {
    setError(null)

    try {
      await workspace.current?.disconnect()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      workspace.current = null
      setSourceRadio(null)
      setStatus(completedRead ? "ready" : "disconnected")
    }
  }

  function downloadRawBackup() {
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
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RadioIcon aria-hidden="true" />
          TYT UVL-15W
        </div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Read and back up your Radio
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Communication stays between this browser and your Radio. This
          milestone can read configuration data but cannot write to the Radio.
        </p>
      </header>

      {webSerialSupported === false && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Web Serial is unavailable</AlertTitle>
          <AlertDescription>
            Open this page in a browser that supports Web Serial and use a
            secure connection.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Radio operation stopped</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Connect the Radio over its USB virtual serial port.
          </CardDescription>
          <CardAction>
            <StatusBadge status={status} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">
              Serial speed
            </dt>
            <dd className="font-mono text-sm">115200 baud</dd>
          </dl>
        </CardContent>
        <CardFooter className="gap-2">
          {status === "connected" ? (
            <>
              <Button onClick={readRadio}>
                <HardDriveIcon data-icon="inline-start" />
                Read Codeplug
              </Button>
              <Button variant="outline" onClick={disconnect}>
                <UnplugIcon data-icon="inline-start" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              disabled={busy || webSerialSupported !== true}
              onClick={connect}
            >
              <UsbIcon data-icon="inline-start" />
              {status === "connecting" ? "Connecting…" : "Choose Radio"}
            </Button>
          )}
        </CardFooter>
      </Card>

      {sourceRadio && <RadioInformation sourceRadio={sourceRadio} />}

      {status === "reading" && (
        <Card>
          <CardHeader>
            <CardTitle>Radio Read</CardTitle>
            <CardDescription>
              Keep the Radio connected until it completes and returns to normal
              operation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress}>
              <ProgressLabel>Reading Codeplug</ProgressLabel>
              <ProgressValue>{() => `${Math.floor(progress)}%`}</ProgressValue>
            </Progress>
          </CardContent>
        </Card>
      )}

      {completedRead && status === "ready" && (
        <Card>
          <CardHeader>
            <CardTitle>Codeplug Backup ready</CardTitle>
            <CardDescription>
              The complete 102,400-byte Codeplug passed protocol validation and
              is available as an unchanged raw backup.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={downloadRawBackup}>
              <DownloadIcon data-icon="inline-start" />
              Download raw backup
            </Button>
          </CardFooter>
        </Card>
      )}
    </main>
  )
}

function RadioInformation({ sourceRadio }: { sourceRadio: SourceRadio }) {
  const details = [
    ["Model", sourceRadio.model],
    ["Serial number", sourceRadio.serialNumber || "Not reported"],
    ["Firmware", sourceRadio.firmwareVersion || "Not reported"],
    ["Hardware", sourceRadio.hardwareVersion || "Not reported"],
    ["Image resources", sourceRadio.imageResourceVersion],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source Radio</CardTitle>
        <CardDescription>
          Identity reported by the connected Radio during the handshake.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {label}
              </dt>
              <dd className="truncate font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: ScreenStatus }) {
  const labels: Record<ScreenStatus, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting",
    connected: "Connected",
    reading: "Reading",
    ready: "Backup ready",
  }

  return (
    <Badge variant={status === "disconnected" ? "outline" : "secondary"}>
      {labels[status]}
    </Badge>
  )
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No Radio was selected."
  }

  return error instanceof Error
    ? error.message
    : "An unknown Radio error occurred."
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

export { RadioReader }
