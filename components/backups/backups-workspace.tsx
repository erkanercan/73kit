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
import { WorkingCodeplugLibraryCard } from "@/components/backups/working-codeplug-library-card"
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
import { canExportCpsFile } from "@/modules/cps-workspace/codeplug-document"
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
    downloadRawBackup,
    error,
    importedCpsFile,
    importedRestoreResult,
    openCpsFile,
    openRawCodeplug,
    prepareBackupRestore,
    prepareImportedRestore,
  } = useCpsWorkspace()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const rawFileInputRef = React.useRef<HTMLInputElement>(null)
  const [entries, setEntries] = React.useState<readonly BackupHistoryEntry[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [storageError, setStorageError] = React.useState(false)
  const [deleteEntry, setDeleteEntry] =
    React.useState<BackupHistoryEntry | null>(null)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [fileErrorKind, setFileErrorKind] = React.useState<"cps" | "raw">("cps")
  const [pendingRawFile, setPendingRawFile] = React.useState<File | null>(null)
  const rawImport =
    completedRead?.binding === "unbound" ? completedRead.rawImport : null

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
    setFileErrorKind("cps")
    try {
      await openCpsFile(file)
    } catch (cause) {
      setFileError(
        cause instanceof Error ? cause.message : t("cpsFileOpenFailed")
      )
    }
  }

  function selectRawFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setFileError(null)
    setFileErrorKind("raw")
    setPendingRawFile(file)
  }

  async function confirmRawImport() {
    if (!pendingRawFile) return
    const file = pendingRawFile
    setPendingRawFile(null)
    try {
      await openRawCodeplug(file)
    } catch (cause) {
      setFileError(
        cause instanceof Error ? cause.message : t("rawImportFailed")
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
            accept=".73kcps,application/vnd.73kit.cps+zip"
            onChange={(event) => void selectCpsFile(event)}
          />
          <input
            ref={rawFileInputRef}
            hidden
            type="file"
            accept=".bin,application/octet-stream"
            onChange={selectRawFile}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => rawFileInputRef.current?.click()}
          >
            <FileUpIcon data-icon="inline-start" />
            {t("rawImportAction")}
          </Button>
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
            disabled={busy || !canExportCpsFile(completedRead)}
            onClick={() => void downloadCpsFile()}
          >
            <DownloadIcon data-icon="inline-start" />
            {t("cpsFileExport")}
          </Button>
        </div>
      </PageHeader>

      {(importedCpsFile ||
        rawImport ||
        importedRestoreResult ||
        fileError ||
        error) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {fileError
                ? t(
                    fileErrorKind === "raw"
                      ? "rawImportFailed"
                      : "cpsFileOpenFailed"
                  )
                : error
                  ? t("cpsFileRestoreFailedTitle")
                  : importedRestoreResult?.status === "already-current"
                    ? t("cpsFileAlreadyCurrentTitle")
                    : importedRestoreResult?.status === "restore-ready"
                      ? t("cpsFileRestoreReadyTitle")
                      : rawImport
                        ? t("rawImportReady")
                        : t("cpsFileOpenReady")}
            </CardTitle>
            {importedCpsFile ? (
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
            ) : rawImport ? (
              <CardAction>
                <Button size="sm" disabled={busy} onClick={downloadRawBackup}>
                  <DownloadIcon data-icon="inline-start" />
                  {t("rawWorkingExport")}
                </Button>
              </CardAction>
            ) : null}
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
            ) : rawImport ? (
              <div className="flex flex-col gap-3">
                <Alert>
                  <TriangleAlertIcon aria-hidden="true" />
                  <AlertTitle>{t("rawImportUnboundTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("rawImportUnboundDescription")}
                  </AlertDescription>
                </Alert>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground">
                      {t("rawImportFile")}
                    </div>
                    <div className="truncate font-medium">
                      {rawImport.fileName}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t("rawImportLayout")}
                    </div>
                    <div className="font-mono text-xs">
                      {rawImport.layoutId}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t("rawImportSize")}
                    </div>
                    <div className="font-medium">
                      {new Intl.NumberFormat(locale).format(
                        rawImport.byteLength
                      )}{" "}
                      {t("bytes")}
                    </div>
                  </div>
                </div>
              </div>
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

      <WorkingCodeplugLibraryCard />

      <Dialog
        open={pendingRawFile !== null}
        onOpenChange={(open) => !open && setPendingRawFile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rawImportReviewTitle")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("rawImportReviewDescription")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">{t("rawImportReviewDescription")}</p>
          {pendingRawFile && (
            <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("rawImportFile")}</dt>
                <dd className="font-medium break-all">{pendingRawFile.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("rawImportSize")}</dt>
                <dd className="font-medium">
                  {new Intl.NumberFormat(locale).format(pendingRawFile.size)}{" "}
                  {t("bytes")}
                </dd>
              </div>
            </dl>
          )}
          <Alert>
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>{t("rawImportUnboundTitle")}</AlertTitle>
            <AlertDescription>{t("rawImportReviewSafety")}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRawFile(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void confirmRawImport()}>
              {t("rawImportConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        : "-"}
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
    type: "application/vnd.73kit.cps+zip",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${serial}-${origin}-${date}.73kcps`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export { BackupsWorkspace }
