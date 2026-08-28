"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  PlugZapIcon,
  RadioTowerIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  RADIO_WRITE_STAGES,
  radioWritePresentation,
} from "@/modules/cps-workspace/radio-write-presentation"
import type {
  RadioWriteOperationSnapshot,
  RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"

interface RadioWriteWorkflowProps {
  readonly released: boolean
  readonly hasWorkingCodeplug: boolean
  readonly changeCount: number
  readonly snapshot: RadioWriteOperationSnapshot | null
  readonly review: readonly RadioWriteReviewItem[]
  readonly busy: boolean
  onPrepare(): void
  onConfirm(): void
  onRecover(): void
  onRequestPort(): void
}

function RadioWriteWorkflow({
  released,
  hasWorkingCodeplug,
  changeCount,
  snapshot,
  review,
  busy,
  onPrepare,
  onConfirm,
  onRecover,
  onRequestPort,
}: RadioWriteWorkflowProps) {
  const t = useTranslations()
  const [confirmationOpen, setConfirmationOpen] = React.useState(false)
  const phase = snapshot?.phase ?? null
  const bytesAcknowledged =
    snapshot && "bytesAcknowledged" in snapshot
      ? snapshot.bytesAcknowledged
      : snapshot?.phase === "verified"
        ? snapshot.preparedWrite.intendedWriteImage.byteLength
        : 0
  const presentation = phase
    ? radioWritePresentation(phase, bytesAcknowledged)
    : null
  const reviewRequired = phase === "review-required"
  const outcomeUnknown = phase === "write-outcome-unknown"
  const verified = phase === "verified"
  const active =
    phase !== null && !reviewRequired && !outcomeUnknown && !verified

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("radioWriteTitle")}</CardTitle>
        <CardDescription>{t("radioWriteDescription")}</CardDescription>
        <CardAction>
          <Badge variant={released ? "secondary" : "outline"}>
            {released ? t("radioWriteControlled") : t("radioWriteUnavailable")}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!released && !outcomeUnknown && (
          <Alert>
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>{t("radioWriteUnavailableTitle")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteUnavailableDescription")}
            </AlertDescription>
          </Alert>
        )}

        {outcomeUnknown && (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>{t("radioWriteUnknownTitle")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteUnknownDescription")}
            </AlertDescription>
          </Alert>
        )}

        {verified && (
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>{t("radioWriteVerifiedTitle")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteVerifiedDescription")}
            </AlertDescription>
          </Alert>
        )}

        {(review.length > 0 || reviewRequired) && (
          <ChangeSetReview review={review} changeCount={changeCount} />
        )}

        {presentation && snapshot && <WriteStages snapshot={snapshot} />}

        {presentation?.destructive && !outcomeUnknown && (
          <Alert>
            <PlugZapIcon aria-hidden="true" />
            <AlertTitle>{t("radioWriteDoNotInterrupt")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteDoNotInterruptDescription")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {outcomeUnknown ? (
          <>
            <Button variant="outline" disabled={busy} onClick={onRequestPort}>
              <PlugZapIcon data-icon="inline-start" />
              {t("radioWriteSelectPort")}
            </Button>
            <Button disabled={busy} onClick={onRecover}>
              {busy && (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              {t("radioWriteCheckRadio")}
            </Button>
          </>
        ) : reviewRequired ? (
          <Button
            disabled={!released || busy}
            onClick={() => setConfirmationOpen(true)}
          >
            {t("radioWriteReviewAndConfirm")}
          </Button>
        ) : active ? (
          <Button disabled>
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
            {t("radioWriteInProgress")}
          </Button>
        ) : (
          <Button
            disabled={
              !released || !hasWorkingCodeplug || changeCount === 0 || busy
            }
            onClick={onPrepare}
          >
            <RadioTowerIcon data-icon="inline-start" />
            {t("radioWritePrepare")}
          </Button>
        )}
      </CardFooter>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangleIcon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("radioWriteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("radioWriteConfirmDescription", { count: review.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert>
            <PlugZapIcon aria-hidden="true" />
            <AlertTitle>{t("radioWriteDoNotInterrupt")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteConfirmationWarning")}
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmationOpen(false)
                onConfirm()
              }}
            >
              {t("radioWriteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function ChangeSetReview({
  review,
  changeCount,
}: {
  readonly review: readonly RadioWriteReviewItem[]
  readonly changeCount: number
}) {
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-sm font-medium">
            {t("radioWriteChangeSet")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("radioWriteChangeSetDescription")}
          </p>
        </div>
        <Badge variant="secondary">
          {t("radioWriteChangeCount", { count: changeCount })}
        </Badge>
      </div>
      <ScrollArea className="h-64 rounded-lg border">
        <div className="flex flex-col p-4">
          {review.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="grid grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium">{entry.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.field}
                  </span>
                </div>
                <ReviewValue label={t("before")} value={entry.before} />
                <ReviewValue label={t("after")} value={entry.after} />
              </div>
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ReviewValue({ label, value }: { label: string; value: unknown }) {
  const t = useTranslations()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm break-words">
        {typeof value === "boolean"
          ? t(value ? "on" : "off")
          : formatReviewValue(value)}
      </span>
    </div>
  )
}

function WriteStages({ snapshot }: { snapshot: RadioWriteOperationSnapshot }) {
  const t = useTranslations()
  const bytes = "bytesAcknowledged" in snapshot ? snapshot.bytesAcknowledged : 0
  const presentation = radioWritePresentation(snapshot.phase, bytes)
  const labels = [
    t("radioWriteStagePreflight"),
    t("radioWriteStageWrite"),
    t("radioWriteStageReboot"),
    t("radioWriteStageReconnect"),
    t("radioWriteStageVerification"),
    t("radioWriteStageComparison"),
  ]

  return (
    <div className="flex flex-col gap-4">
      {snapshot.phase === "writing" && (
        <Progress value={presentation.progress.percent}>
          <ProgressLabel>{t("radioWriteStageWrite")}</ProgressLabel>
          <ProgressValue>
            {() =>
              t("radioWriteBlockProgress", {
                completed: presentation.progress.completedBlocks,
                total: presentation.progress.totalBlocks,
              })
            }
          </ProgressValue>
        </Progress>
      )}
      <div className="grid grid-cols-6 gap-2">
        {RADIO_WRITE_STAGES.map((stage, index) => (
          <div key={stage} className="flex min-w-0 flex-col gap-2">
            <Separator />
            <Badge
              variant={
                index === presentation.activeStage
                  ? "default"
                  : index < presentation.activeStage
                    ? "secondary"
                    : "outline"
              }
              className="w-fit"
            >
              {index + 1}
            </Badge>
            <span
              className={
                index === presentation.activeStage
                  ? "text-xs font-medium"
                  : "text-xs text-muted-foreground"
              }
            >
              {labels[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatReviewValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export { RadioWriteWorkflow }
export type { RadioWriteWorkflowProps }
