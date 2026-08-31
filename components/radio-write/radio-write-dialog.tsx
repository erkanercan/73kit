"use client"

import * as React from "react"
import { LoaderCircleIcon, UploadIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { RadioWriteWorkflow } from "@/components/radio-write/radio-write-workflow"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert"
import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import { createRadioWriteReview } from "@/modules/cps-workspace/index"
import { canPrepareRadioWrite } from "@/modules/cps-workspace/codeplug-document"

const ACTIVE_WRITE_PHASES = new Set([
  "checking-radio",
  "writing-before-first-block",
  "writing",
])

function RadioWriteDialog() {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [writeAttempted, setWriteAttempted] = React.useState(false)
  const {
    busy,
    changes,
    completedRead,
    confirmRadioWrite,
    discardRadioWriteStatus,
    downloadRadioOperationReport,
    error,
    prepareRadioWrite,
    radioWriteReleased,
    radioWriteReview,
    radioWriteSnapshot,
  } = useCpsWorkspace()
  const { busy: updateBusy } = useUpdateCoordinator()
  const writeActive =
    radioWriteSnapshot !== null &&
    ACTIVE_WRITE_PHASES.has(radioWriteSnapshot.phase)
  const visibleReview =
    radioWriteReview.length > 0
      ? radioWriteReview
      : completedRead
        ? createRadioWriteReview(
            completedRead.baselineBackup.codeplug,
            completedRead.workingCodeplug.codeplug,
            changes
          )
        : []

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen && writeActive) return
    setOpen(nextOpen)
    if (!nextOpen) {
      setWriteAttempted(false)
      void discardRadioWriteStatus()
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={!radioWriteReleased || updateBusy}
          />
        }
      >
        {writeActive ? (
          <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
        ) : (
          <UploadIcon data-icon="inline-start" />
        )}
        <span className="hidden sm:inline">
          {writeActive ? t("radioWriteInProgress") : t("writeRadio")}
        </span>
        <span className="sr-only sm:hidden">
          {radioWriteReleased ? t("writeRadio") : t("writeRadioPlanned")}
        </span>
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!writeActive}
        closeLabel={t("close")}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("radioWriteTitle")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("radioWriteDescription")}
          </DialogDescription>
        </DialogHeader>

        {writeAttempted && error && (
          <WorkspaceErrorAlert error={error} operation="write" />
        )}

        <RadioWriteWorkflow
          released={radioWriteReleased}
          hasWorkingCodeplug={canPrepareRadioWrite(completedRead)}
          changeCount={changes.length}
          snapshot={radioWriteSnapshot}
          review={visibleReview}
          busy={busy}
          onPrepare={() => {
            setWriteAttempted(true)
            void prepareRadioWrite()
          }}
          onConfirm={() => {
            setWriteAttempted(true)
            void confirmRadioWrite()
          }}
          onDiscardStatus={() => {
            setWriteAttempted(false)
            void discardRadioWriteStatus()
          }}
          onDownloadReport={downloadRadioOperationReport}
        />
      </DialogContent>
    </Dialog>
  )
}

export { RadioWriteDialog }
