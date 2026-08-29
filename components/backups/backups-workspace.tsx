"use client"

import * as React from "react"
import {
  ArchiveIcon,
  DownloadIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { createIndexedDbBackupHistoryStore } from "@/adapters/indexed-db-backup-history-store/index"
import { PageHeader } from "@/components/page-header"
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

const backupHistoryStore = createIndexedDbBackupHistoryStore()

function BackupsWorkspace() {
  const t = useTranslations()
  const locale = useLocale()
  const [entries, setEntries] = React.useState<readonly BackupHistoryEntry[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [storageError, setStorageError] = React.useState(false)
  const [deleteEntry, setDeleteEntry] =
    React.useState<BackupHistoryEntry | null>(null)
  const [clearOpen, setClearOpen] = React.useState(false)

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

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("backupsTitle")} />

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
                  <TableHead className="w-20">
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
                          aria-label={t("backupsDownload")}
                          title={t("backupsDownload")}
                          onClick={() => downloadBackup(entry)}
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

function downloadBackup(entry: BackupHistoryEntry) {
  const date = entry.createdAt.slice(0, 10)
  const origin = entry.origin === "radio-read" ? "read" : "write"
  const serial = safeFilename(
    entry.sourceRadio.serialNumber || entry.sourceRadio.model
  )
  const blob = new Blob([entry.bytes.slice().buffer], {
    type: "application/octet-stream",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${serial}-${origin}-${date}-codeplug.bin`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export { BackupsWorkspace }
