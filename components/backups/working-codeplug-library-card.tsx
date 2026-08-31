"use client"

import * as React from "react"
import {
  DownloadIcon,
  FilePenLineIcon,
  FilePlus2Icon,
  FolderOpenIcon,
  HardDriveIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { createIndexedDbWorkingCodeplugStore } from "@/adapters/indexed-db-working-codeplug-store/index"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createCpsFile, parseCpsFile } from "@/modules/cps-workspace/cps-file"
import {
  WORKING_CODEPLUG_NAME_MAX_LENGTH,
  createSavedWorkingCodeplug,
  type SavedWorkingCodeplug,
} from "@/modules/cps-workspace/working-codeplug-library"

const workingCodeplugStore = createIndexedDbWorkingCodeplugStore()

type StoragePersistence =
  "checking" | "persistent" | "best-effort" | "unavailable"

function WorkingCodeplugLibraryCard() {
  const t = useTranslations()
  const locale = useLocale()
  const { busy, completedRead, openCpsFile } = useCpsWorkspace()
  const [entries, setEntries] = React.useState<readonly SavedWorkingCodeplug[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)
  const [working, setWorking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [renameEntry, setRenameEntry] =
    React.useState<SavedWorkingCodeplug | null>(null)
  const [deleteEntry, setDeleteEntry] =
    React.useState<SavedWorkingCodeplug | null>(null)
  const [storagePersistence, setStoragePersistence] =
    React.useState<StoragePersistence>("checking")

  const refresh = React.useCallback(async () => {
    const nextEntries = await workingCodeplugStore.list()
    setEntries(nextEntries)
  }, [])

  React.useEffect(() => {
    let active = true
    void Promise.all([workingCodeplugStore.list(), readStoragePersistence()])
      .then(([nextEntries, persistence]) => {
        if (!active) return
        setEntries(nextEntries)
        setStoragePersistence(persistence)
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function saveCopy() {
    if (!completedRead || working) return
    setWorking(true)
    setError(null)
    try {
      const cpsFileBytes = await createCpsFile({
        sourceRadio: completedRead.sourceRadio,
        baseline: completedRead.baselineBackup.codeplug,
        working: completedRead.workingCodeplug.codeplug,
      })
      const parsed = await parseCpsFile(cpsFileBytes)
      await workingCodeplugStore.create(
        createSavedWorkingCodeplug({
          name,
          manifest: parsed.manifest,
          cpsFileBytes,
        })
      )
      setStoragePersistence(await requestPersistentStorage())
      await refresh()
      setName("")
      setSaveOpen(false)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setWorking(false)
    }
  }

  async function openEntry(entry: SavedWorkingCodeplug) {
    if (working || busy) return
    setWorking(true)
    setError(null)
    try {
      const current = await workingCodeplugStore.get(entry.id)
      if (!current) throw new Error(t("savedWorkingNotFound"))
      await openCpsFile(
        new File(
          [current.cpsFileBytes.slice().buffer],
          `${current.name}.uvl15cps`,
          {
            type: "application/vnd.tyt.uvl15-cps+zip",
          }
        )
      )
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setWorking(false)
    }
  }

  async function rename() {
    if (!renameEntry || working) return
    setWorking(true)
    setError(null)
    try {
      await workingCodeplugStore.rename(
        renameEntry.id,
        renameEntry.revision,
        name
      )
      await refresh()
      setRenameEntry(null)
      setName("")
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setWorking(false)
    }
  }

  async function deleteSavedCopy() {
    if (!deleteEntry || working) return
    setWorking(true)
    setError(null)
    try {
      await workingCodeplugStore.delete(deleteEntry.id, deleteEntry.revision)
      await refresh()
      setDeleteEntry(null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("savedWorkingTitle")}</CardTitle>
          <p className="text-sm">
            {t("savedWorkingDescription", {
              storage:
                storagePersistence === "persistent"
                  ? t("savedWorkingPersistent")
                  : t("savedWorkingBestEffort"),
            })}
          </p>
          <CardAction>
            <Button
              size="sm"
              disabled={busy || working || completedRead === null}
              onClick={() => {
                setName("")
                setSaveOpen(true)
              }}
            >
              <FilePlus2Icon data-icon="inline-start" />
              {t("savedWorkingSaveCopy")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>{t("savedWorkingErrorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : entries.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDriveIcon aria-hidden="true" />
              {t("savedWorkingEmpty")}
            </div>
          ) : (
            <Table containerClassName="max-h-52 overflow-auto rounded-lg border">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>{t("savedWorkingName")}</TableHead>
                  <TableHead>{t("backupsRadio")}</TableHead>
                  <TableHead>{t("savedWorkingUpdated")}</TableHead>
                  <TableHead className="w-40">
                    <span className="sr-only">{t("backupsActions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>
                      {entry.manifest.sourceRadio.model} ·{" "}
                      {entry.manifest.sourceRadio.firmwareVersion}
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.updatedAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy || working}
                          aria-label={t("savedWorkingOpen")}
                          title={t("savedWorkingOpen")}
                          onClick={() => void openEntry(entry)}
                        >
                          <FolderOpenIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("savedWorkingExport")}
                          title={t("savedWorkingExport")}
                          onClick={() => downloadEntry(entry)}
                        >
                          <DownloadIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("savedWorkingRename")}
                          title={t("savedWorkingRename")}
                          onClick={() => {
                            setName(entry.name)
                            setRenameEntry(entry)
                          }}
                        >
                          <PencilIcon />
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

      <NameDialog
        open={saveOpen}
        title={t("savedWorkingSaveTitle")}
        description={t("savedWorkingSaveDescription")}
        action={t("savedWorkingSaveCopy")}
        icon={<FilePlus2Icon />}
        name={name}
        busy={working}
        onNameChange={setName}
        onOpenChange={setSaveOpen}
        onSubmit={() => void saveCopy()}
      />
      <NameDialog
        open={renameEntry !== null}
        title={t("savedWorkingRenameTitle")}
        description={t("savedWorkingRenameDescription")}
        action={t("savedWorkingRename")}
        icon={<FilePenLineIcon />}
        name={name}
        busy={working}
        onNameChange={setName}
        onOpenChange={(open) => {
          if (!open) setRenameEntry(null)
        }}
        onSubmit={() => void rename()}
      />

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
            <AlertDialogTitle>{t("savedWorkingDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("savedWorkingDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={working}
              onClick={() => void deleteSavedCopy()}
            >
              {t("backupsDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function NameDialog({
  open,
  title,
  description,
  action,
  icon,
  name,
  busy,
  onNameChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  title: string
  description: string
  action: string
  icon: React.ReactNode
  name: string
  busy: boolean
  onNameChange(value: string): void
  onOpenChange(open: boolean): void
  onSubmit(): void
}) {
  const t = useTranslations()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="working-codeplug-name">
            {t("savedWorkingName")}
          </FieldLabel>
          <Input
            id="working-codeplug-name"
            autoFocus
            maxLength={WORKING_CODEPLUG_NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => onNameChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) onSubmit()
            }}
          />
          <FieldDescription>{t("savedWorkingLocalOnly")}</FieldDescription>
        </Field>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            disabled={busy || name.trim().length === 0}
            onClick={onSubmit}
          >
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function downloadEntry(entry: SavedWorkingCodeplug) {
  const blob = new Blob([entry.cpsFileBytes.slice().buffer], {
    type: "application/vnd.tyt.uvl15-cps+zip",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${safeFilename(entry.name)}.uvl15cps`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function readStoragePersistence(): Promise<StoragePersistence> {
  if (!navigator.storage?.persisted) return "unavailable"
  return (await navigator.storage.persisted()) ? "persistent" : "best-effort"
}

async function requestPersistentStorage(): Promise<StoragePersistence> {
  if (!navigator.storage?.persist) return "unavailable"
  return (await navigator.storage.persist()) ? "persistent" : "best-effort"
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Browser storage failed"
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export { WorkingCodeplugLibraryCard }
