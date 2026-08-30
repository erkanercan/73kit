"use client"

import * as React from "react"
import {
  ArchiveIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileUpIcon,
  InfoIcon,
  RadioTowerIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { createIndexedDbBackupHistoryStore } from "@/adapters/indexed-db-backup-history-store/index"
import { PageHeader } from "@/components/page-header"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert"
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BackupHistoryEntry } from "@/modules/cps-workspace/index"
import { createCpsFile } from "@/modules/cps-workspace/cps-file"
import { createCodeplug } from "@/modules/codeplug/index"

const backupHistoryStore = createIndexedDbBackupHistoryStore()

function BackupsWorkspace() {
  const t = useTranslations()
  const locale = useLocale()
  const {
    busy,
    capability,
    completedRead,
    downloadCpsFile,
    error,
    importedCpsFile,
    importedRestoreResult,
    openCpsFile,
    prepareBackupRestore,
    prepareImportedRestore,
  } = useCpsWorkspace()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [entries, setEntries] = React.useState<readonly BackupHistoryEntry[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [storageError, setStorageError] = React.useState(false)
  const [deleteEntry, setDeleteEntry] =
    React.useState<BackupHistoryEntry | null>(null)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    void backupHistoryStore
      .list()
      .then((nextEntries) => {
        if (active) setEntries(nextEntries)
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function confirmDelete() {
    if (!deleteEntry) return
    try {
      await backupHistoryStore.delete(deleteEntry.id)
      setEntries((current) =>
        current.filter((entry) => entry.id !== deleteEntry.id)
      )
      setDeleteEntry(null)
    } catch {
      setStorageError(true)
    }
  }

  async function confirmClear() {
    try {
      await backupHistoryStore.clear()
      setEntries([])
      setClearOpen(false)
    } catch {
      setStorageError(true)
    }
  }

  async function selectCpsFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setFileError(null)
    try {
      await openCpsFile(file)
    } catch (cause) {
      setFileError(
        cause instanceof Error ? cause.message : t("cpsFileOpenFailed")
      )
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("backupsTitle")}>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept=".uvl15cps,application/vnd.tyt.uvl15-cps+zip"
            onChange={(event) => void selectCpsFile(event)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUpIcon data-icon="inline-start" />
            {t("cpsFileOpen")}
          </Button>
          <Button
            size="sm"
            disabled={busy || completedRead === null}
            onClick={() => void downloadCpsFile()}
          >
            <DownloadIcon data-icon="inline-start" />
            {t("cpsFileExport")}
          </Button>
        </div>
      </PageHeader>

      {(importedCpsFile || importedRestoreResult || fileError || error) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {fileError
                ? t("cpsFileOpenFailed")
                : error
                  ? t("cpsFileRestoreFailedTitle")
                  : importedRestoreResult?.status === "already-current"
                    ? t("cpsFileAlreadyCurrentTitle")
                    : importedRestoreResult?.status === "restore-ready"
                      ? t("cpsFileRestoreReadyTitle")
                      : t("cpsFileOpenReady")}
            </CardTitle>
            {importedCpsFile && (
              <CardAction>
                <Button
                  size="sm"
                  disabled={busy || capability !== "available"}
                  onClick={() =>
                    void prepareImportedRestore().catch(() => undefined)
                  }
                >
                  <RadioTowerIcon data-icon="inline-start" />
                  {t("cpsFilePrepareRestore")}
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {fileError ? (
              <p className="text-sm text-destructive">{fileError}</p>
            ) : error ? (
              <WorkspaceErrorAlert error={error} operation="read" />
            ) : importedRestoreResult?.status === "already-current" ? (
              <Alert>
                <CircleCheckIcon aria-hidden="true" />
                <AlertDescription>
                  {t("cpsFileAlreadyCurrentDescription")}
                </AlertDescription>
              </Alert>
            ) : importedRestoreResult?.status === "restore-ready" ? (
              <Alert>
                <CircleCheckIcon aria-hidden="true" />
                <AlertDescription>
                  {t("cpsFileRestoreReadyDescription", {
                    count: importedRestoreResult.changedByteCount,
                  })}
                </AlertDescription>
              </Alert>
            ) : importedCpsFile ? (
              <div className="flex flex-col gap-3">
                {capability === "unsupported" && (
                  <Alert>
                    <InfoIcon aria-hidden="true" />
                    <AlertTitle>{t("webSerialUnavailable")}</AlertTitle>
                    <AlertDescription>{t("webSerialHelp")}</AlertDescription>
                  </Alert>
                )}
                {capability === "insecure-context" && (
                  <Alert>
                    <InfoIcon aria-hidden="true" />
                    <AlertTitle>{t("secureContextRequired")}</AlertTitle>
                    <AlertDescription>
                      {t("secureContextHelp")}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground">
                      {t("backupsRadio")}
                    </div>
                    <div className="font-medium">
                      {importedCpsFile.sourceRadio.model}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {importedCpsFile.sourceRadio.serialNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t("backupsFirmware")}
                    </div>
                    <div className="font-medium">
                      {importedCpsFile.layout.firmwareVersion}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {importedCpsFile.layout.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t("cpsFileCreated")}
                    </div>
                    <div className="font-medium">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(importedCpsFile.createdAt))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("cpsFileRestoreReadFirst")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle>{t("backupsCardTitle")}</CardTitle>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || entries.length === 0}
              onClick={() => setClearOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              {t("backupsDeleteAll")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {storageError ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>{t("backupsStorageErrorTitle")}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : loading ? (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>{t("backupsEmptyTitle")}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table containerClassName="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>{t("backupsDate")}</TableHead>
                  <TableHead>{t("backupsSource")}</TableHead>
                  <TableHead>{t("backupsRadio")}</TableHead>
                  <TableHead>{t("backupsFirmware")}</TableHead>
                  <TableHead>{t("backupsChanges")}</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">{t("backupsActions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </TableCell>
                    <TableCell>
                      {entry.origin === "radio-read"
                        ? t("backupsRadioRead")
                        : t("backupsRadioWrite")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {entry.sourceRadio.model}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {entry.sourceRadio.serialNumber}
                      </div>
                    </TableCell>
                    <TableCell>{entry.sourceRadio.firmwareVersion}</TableCell>
                    <TableCell>
                      {entry.origin === "radio-write"
                        ? t("backupsChangeCount", { count: entry.changeCount })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy || capability !== "available"}
                          aria-label={t("backupsRestore")}
                          title={t("backupsRestore")}
                          onClick={() =>
                            void prepareBackupRestore(entry).catch(
                              () => undefined
                            )
                          }
                        >
                          <RadioTowerIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("backupsDownload")}
                          title={t("backupsDownload")}
                          onClick={() => void downloadBackup(entry)}
                        >
                          <DownloadIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("backupsDelete")}
                          title={t("backupsDelete")}
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

      <AlertDialog
        open={deleteEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteEntry(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("backupsDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("backupsDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t("backupsDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("backupsDeleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("backupsDeleteAllDescription", { count: entries.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmClear}>
              {t("backupsDeleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

async function downloadBackup(entry: BackupHistoryEntry) {
  const date = entry.createdAt.slice(0, 10)
  const origin = entry.origin === "radio-read" ? "read" : "write"
  const serial = safeFilename(
    entry.sourceRadio.serialNumber || entry.sourceRadio.model
  )
  const codeplug = createCodeplug(entry.bytes)
  const bytes = await createCpsFile({
    sourceRadio: entry.sourceRadio,
    baseline: codeplug,
    working: codeplug,
    createdAt: new Date(entry.createdAt),
  })
  const blob = new Blob([bytes.slice().buffer], {
    type: "application/vnd.tyt.uvl15-cps+zip",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${serial}-${origin}-${date}.uvl15cps`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export { BackupsWorkspace }
