"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  FileArchiveIcon,
  FileDownIcon,
  FolderOpenIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { canExportCpsFile } from "@/modules/cps-workspace/codeplug-document"

function CodeplugFileActions() {
  const t = useTranslations()
  const {
    busy,
    changes,
    completedRead,
    downloadCpsFile,
    downloadPfFile,
    downloadRawBackup,
    openCpsFile,
    openRawCodeplug,
    radioWriteSnapshot,
  } = useCpsWorkspace()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const openBlockedByRadioWrite =
    radioWriteSnapshot !== null && radioWriteSnapshot.phase !== "completed"

  async function openFile(file: File) {
    if (file.name.toLocaleLowerCase("en-US").endsWith(".73kcps")) {
      await openCpsFile(file)
    } else {
      await openRawCodeplug(file)
    }
  }

  async function openSelectedFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (changes.length > 0) {
      setPendingFile(file)
      return
    }
    try {
      await openFile(file)
    } catch {
      // The workspace exposes the localized operation error to the page shell.
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".73kcps,.PF,.pf,.bin,application/vnd.73kit.cps+zip,application/octet-stream,text/plain"
          onChange={(event) => void openSelectedFile(event)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={busy || openBlockedByRadioWrite}
          onClick={() => inputRef.current?.click()}
        >
          <FolderOpenIcon data-icon="inline-start" />
          {t("fileOpen")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" />}
            disabled={busy || !completedRead}
          >
            <FileDownIcon data-icon="inline-start" />
            {t("fileSave")}
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={downloadPfFile}>
                <FileDownIcon />
                {t("fileSavePf")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadRawBackup}>
                <FileDownIcon />
                {t("fileSaveBin")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={!canExportCpsFile(completedRead)}
                onClick={() => void downloadCpsFile()}
              >
                <FileArchiveIcon />
                {t("fileSave73Kit")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFile(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <FolderOpenIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("fileOpenReplaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("fileOpenReplaceDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert>
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>{t("fileOpenUnsavedTitle")}</AlertTitle>
            <AlertDescription>
              {t("fileOpenReplaceDescription")}
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                if (file) void openFile(file).catch(() => undefined)
              }}
            >
              {t("fileOpenReplaceAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { CodeplugFileActions }
