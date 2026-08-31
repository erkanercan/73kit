"use client"

import * as React from "react"
import {
  CheckCircle2Icon,
  ClipboardIcon,
  DownloadIcon,
  FileJsonIcon,
  InfoIcon,
  MailIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { diagnosticHistoryStore } from "@/components/diagnostics/diagnostic-recorder"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  diagnosticEmailHref,
  diagnosticFileName,
  serializeDiagnosticIncident,
  type DiagnosticIncident,
} from "@/modules/diagnostics/index"

interface ReadinessItem {
  readonly label: string
  readonly ready: boolean
  readonly readyLabel: string
  readonly unavailableLabel: string
}

function DiagnosticsWorkspace() {
  const t = useTranslations()
  const locale = useLocale()
  const [entries, setEntries] = React.useState<readonly DiagnosticIncident[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [storageError, setStorageError] = React.useState(false)
  const [selected, setSelected] = React.useState<DiagnosticIncident | null>(
    null
  )
  const [deleteEntry, setDeleteEntry] =
    React.useState<DiagnosticIncident | null>(null)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [persistentStorage, setPersistentStorage] = React.useState(false)
  const [environment, setEnvironment] = React.useState({
    secureContext: false,
    online: false,
    webSerial: false,
    indexedDb: false,
    serviceWorker: false,
  })

  React.useEffect(() => {
    let active = true
    void diagnosticHistoryStore
      .list()
      .then((incidents) => active && setEntries(incidents))
      .catch(() => active && setStorageError(true))
      .finally(() => active && setLoading(false))
    void navigator.storage
      ?.persisted()
      .then((persistent) => active && setPersistentStorage(persistent))
      .catch(() => undefined)
    void Promise.resolve().then(() => {
      if (!active) return
      setEnvironment({
        secureContext: window.isSecureContext,
        online: navigator.onLine,
        webSerial: "serial" in navigator,
        indexedDb: "indexedDB" in window,
        serviceWorker: Boolean(navigator.serviceWorker?.controller),
      })
    })
    return () => {
      active = false
    }
  }, [])

  const successes = entries.filter((entry) => entry.outcome === "success")
  const incidents = entries.filter((entry) => entry.outcome !== "success")
  const readiness: readonly ReadinessItem[] = [
    readinessItem(t("diagnosticsSecureContext"), environment.secureContext, t),
    readinessItem(t("diagnosticsOnline"), environment.online, t),
    readinessItem(t("diagnosticsWebSerial"), environment.webSerial, t),
    readinessItem(t("diagnosticsIndexedDb"), environment.indexedDb, t),
    {
      label: t("diagnosticsServiceWorker"),
      ready: environment.serviceWorker,
      readyLabel: t("diagnosticsActive"),
      unavailableLabel: t("diagnosticsInactive"),
    },
    {
      label: t("diagnosticsPersistentStorage"),
      ready: persistentStorage,
      readyLabel: t("diagnosticsGranted"),
      unavailableLabel: t("diagnosticsBestEffort"),
    },
  ]

  async function confirmDelete() {
    if (!deleteEntry) return
    try {
      await diagnosticHistoryStore.delete(deleteEntry.id)
      setEntries((current) =>
        current.filter((entry) => entry.id !== deleteEntry.id)
      )
      if (selected?.id === deleteEntry.id) setSelected(null)
      setDeleteEntry(null)
    } catch {
      setStorageError(true)
    }
  }

  async function confirmClear() {
    try {
      await diagnosticHistoryStore.clear()
      setEntries([])
      setSelected(null)
      setClearOpen(false)
    } catch {
      setStorageError(true)
    }
  }

  function download(entry: DiagnosticIncident) {
    const url = URL.createObjectURL(
      new Blob([serializeDiagnosticIncident(entry)], {
        type: "application/json",
      })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = diagnosticFileName(entry)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function copy(entry: DiagnosticIncident) {
    await navigator.clipboard.writeText(serializeDiagnosticIncident(entry))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2_000)
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("diagnosticsTitle")}>
        {entries.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setClearOpen(true)}>
              <Trash2Icon data-icon="inline-start" />
              {t("diagnosticsDeleteAll")}
            </Button>
          </div>
        )}
      </PageHeader>

      {storageError && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("diagnosticsStorageErrorTitle")}</AlertTitle>
          <AlertDescription>
            {t("diagnosticsStorageErrorDescription")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("diagnosticsReadinessTitle")}</CardTitle>
            <p className="text-sm">{t("diagnosticsReadinessDescription")}</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {readiness.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <span>{item.label}</span>
                <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
                  {item.ready ? item.readyLabel : item.unavailableLabel}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("diagnosticsSuccessTitle")}</CardTitle>
            <p className="text-sm">{t("diagnosticsSuccessDescription")}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : successes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("diagnosticsNoSuccess")}
              </p>
            ) : (
              successes.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <CheckCircle2Icon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {operationLabel(entry.operation, t)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, locale)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(entry)}
                  >
                    {t("diagnosticsPreview")}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("diagnosticsIncidentsTitle")}</CardTitle>
          <p className="text-sm">{t("diagnosticsIncidentsDescription")}</p>
          {incidents.length > 0 && (
            <CardAction>
              <span className="text-sm font-medium tabular-nums">
                {incidents.length}
              </span>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : incidents.length === 0 ? (
            <Empty className="min-h-40 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileJsonIcon />
                </EmptyMedia>
                <EmptyTitle>{t("diagnosticsEmptyTitle")}</EmptyTitle>
                <p className="max-w-sm text-sm">{t("diagnosticsEmptyHint")}</p>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("diagnosticsDate")}</TableHead>
                  <TableHead>{t("diagnosticsSource")}</TableHead>
                  <TableHead>{t("diagnosticsOperation")}</TableHead>
                  <TableHead>{t("diagnosticsOutcome")}</TableHead>
                  <TableHead>{t("diagnosticsError")}</TableHead>
                  <TableHead className="text-right">
                    {t("diagnosticsActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.createdAt, locale)}</TableCell>
                    <TableCell>{sourceLabel(entry, t)}</TableCell>
                    <TableCell className="font-medium">
                      {operationLabel(entry.operation, t)}
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge entry={entry} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.errorCode ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(entry)}
                        >
                          {t("diagnosticsPreview")}
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("diagnosticsDelete")}
                          onClick={() => setDeleteEntry(entry)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-3xl" closeLabel={t("close")}>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {operationLabel(selected.operation, t)}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t("diagnosticsPreviewDescription")}
                </DialogDescription>
                <p className="text-sm">{t("diagnosticsPreviewDescription")}</p>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <OutcomeBadge entry={selected} />
                <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
                  {sourceLabel(selected, t)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(selected.createdAt, locale)} ·{" "}
                  {t("diagnosticsEvents", { count: selected.eventCount })}
                </span>
              </div>
              <Alert>
                <InfoIcon aria-hidden="true" />
                <AlertTitle>{t("diagnosticsGuidanceTitle")}</AlertTitle>
                <AlertDescription>{guidance(selected, t)}</AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">
                    {t("diagnosticsIncluded")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("diagnosticsIncludedDescription")}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-1 font-medium">
                    {t("diagnosticsExcluded")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("diagnosticsExcludedDescription")}
                  </p>
                </div>
              </div>
              <ScrollArea className="h-72 rounded-lg border bg-muted/30">
                <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {serializeDiagnosticIncident(selected)}
                </pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {t("diagnosticsEmailHint")}
              </p>
              <DialogFooter className="flex-wrap">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteEntry(selected)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  {t("diagnosticsDelete")}
                </Button>
                <Button variant="outline" onClick={() => void copy(selected)}>
                  <ClipboardIcon data-icon="inline-start" />
                  {copied ? t("diagnosticsCopied") : t("diagnosticsCopy")}
                </Button>
                <Button variant="outline" onClick={() => download(selected)}>
                  <DownloadIcon data-icon="inline-start" />
                  {t("diagnosticsDownload")}
                </Button>
                <Button
                  nativeButton={false}
                  render={<a href={diagnosticEmailHref(selected)} />}
                >
                  <MailIcon data-icon="inline-start" />
                  {t("diagnosticsEmail")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DeleteDialog
        entry={deleteEntry}
        setEntry={setDeleteEntry}
        onConfirm={confirmDelete}
        t={t}
      />
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {t("diagnosticsDeleteAllTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("diagnosticsDeleteAllDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmClear()}
            >
              {t("diagnosticsDeleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

type Translator = ReturnType<typeof useTranslations>

function readinessItem(
  label: string,
  ready: boolean,
  t: Translator
): ReadinessItem {
  return {
    label,
    ready,
    readyLabel: t("diagnosticsAvailable"),
    unavailableLabel: t("diagnosticsUnavailable"),
  }
}

function OutcomeBadge({ entry }: { entry: DiagnosticIncident }) {
  const t = useTranslations()
  if (entry.outcome === "success")
    return (
      <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
        {t("diagnosticsSuccess")}
      </span>
    )
  if (entry.outcome === "outcome-unknown")
    return (
      <span className="rounded-md border border-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
        {t("diagnosticsOutcomeUnknown")}
      </span>
    )
  return (
    <span className="rounded-md border border-destructive px-2 py-0.5 text-xs font-medium text-destructive">
      {t("diagnosticsFailed")}
    </span>
  )
}

function sourceLabel(entry: DiagnosticIncident, t: Translator) {
  return t(entry.source === "radio" ? "diagnosticsRadio" : "diagnosticsUpdate")
}

function operationLabel(operation: string, t: Translator) {
  const labels: Record<string, string> = {
    "radio-read": t("diagnosticsOperationRadioRead"),
    "radio-write": t("diagnosticsOperationRadioWrite"),
    "restore-preparation": t("diagnosticsOperationRestorePreparation"),
    "firmware-update": t("diagnosticsOperationFirmwareUpdate"),
    "language-update": t("diagnosticsOperationLanguageUpdate"),
    "image-update": t("diagnosticsOperationImageUpdate"),
    "combined-update": t("diagnosticsOperationCombinedUpdate"),
    update: t("diagnosticsOperationUpdate"),
  }
  if (labels[operation]) return labels[operation]
  return operation
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function guidance(entry: DiagnosticIncident, t: Translator) {
  if (entry.outcome === "outcome-unknown")
    return t("diagnosticsGuidanceUnknown")
  if (
    [
      "response-timeout",
      "connection-closed",
      "serial-permission",
      "serial-unavailable",
    ].includes(entry.errorCode ?? "")
  )
    return t("diagnosticsGuidanceConnection")
  return t("diagnosticsGuidanceDefault")
}

function DeleteDialog({
  entry,
  setEntry,
  onConfirm,
  t,
}: {
  entry: DiagnosticIncident | null
  setEntry(value: DiagnosticIncident | null): void
  onConfirm(): Promise<void>
  t: Translator
}) {
  return (
    <AlertDialog
      open={entry !== null}
      onOpenChange={(open) => !open && setEntry(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("diagnosticsDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("diagnosticsDeleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void onConfirm()}
          >
            {t("diagnosticsDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DiagnosticsWorkspace }
