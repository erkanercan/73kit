"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { formatPercent } from "@/lib/format-percent"
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
  onDiscardStatus(): void
  onDownloadReport(): void
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
  onDiscardStatus,
  onDownloadReport,
}: RadioWriteWorkflowProps) {
  const t = useTranslations()
  const [confirmationOpen, setConfirmationOpen] = React.useState(false)
  const phase = snapshot?.phase ?? null
  const bytesAcknowledged =
    snapshot && "bytesAcknowledged" in snapshot
      ? snapshot.bytesAcknowledged
      : snapshot?.phase === "completed"
        ? snapshot.preparedWrite.intendedWriteImage.byteLength
        : 0
  const presentation = phase
    ? radioWritePresentation(phase, bytesAcknowledged)
    : null
  const reviewRequired = phase === "review-required"
  const outcomeUnknown = phase === "write-outcome-unknown"
  const completed = phase === "completed"
  const active =
    phase !== null && !reviewRequired && !outcomeUnknown && !completed

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("radioWriteTitle")}</CardTitle>
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

        {released && !hasWorkingCodeplug && !outcomeUnknown && (
          <Alert>
            <RadioTowerIcon aria-hidden="true" />
            <AlertTitle>{t("radioWriteReadRequiredTitle")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteReadRequiredDescription")}
            </AlertDescription>
          </Alert>
        )}

        {released &&
          hasWorkingCodeplug &&
          changeCount === 0 &&
          !outcomeUnknown &&
          !completed && (
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertTitle>{t("radioWriteNoChangesTitle")}</AlertTitle>
              <AlertDescription>
                {t("radioWriteNoChangesDescription")}
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

        {completed && (
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>{t("radioWriteCompletedTitle")}</AlertTitle>
            <AlertDescription>
              {t("radioWriteCompletedDescription")}
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
            {released && (
              <Button variant="outline" onClick={onDownloadReport}>
                <DownloadIcon data-icon="inline-start" />
                {t("radioOperationReport")}
              </Button>
            )}
            <Button onClick={onDiscardStatus}>
              {t("radioWriteCloseStatus")}
            </Button>
          </>
        ) : completed && released ? (
          <Button variant="outline" onClick={onDownloadReport}>
            <DownloadIcon data-icon="inline-start" />
            {t("radioOperationReport")}
          </Button>
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
            <AlertDialogDescription className="sr-only">
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
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-heading text-sm font-medium">
            {t("radioWriteChangeSet")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("radioWriteChangeSetDescription")}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("radioWriteChangeCount", { count: changeCount })}
        </span>
      </div>
      <ScrollArea className="h-64 rounded-lg border">
        <div className="flex flex-col p-4">
          {review.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="grid grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium">
                    {formatReviewSubject(entry.subject, t)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatReviewField(entry.field, t)}
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
          : formatReviewValue(value, t)}
      </span>
    </div>
  )
}

function WriteStages({ snapshot }: { snapshot: RadioWriteOperationSnapshot }) {
  const t = useTranslations()
  const bytes = "bytesAcknowledged" in snapshot ? snapshot.bytesAcknowledged : 0
  const presentation = radioWritePresentation(snapshot.phase, bytes)
  const labels = [
    t("radioWriteStageRadioCheck"),
    t("radioWriteStageWrite"),
    t("radioWriteStageReboot"),
  ]

  return (
    <div className="flex flex-col gap-4">
      {snapshot.phase === "writing" && (
        <Progress value={presentation.progress.percent}>
          <ProgressLabel>{t("radioWriteStageWrite")}</ProgressLabel>
          <ProgressValue>
            {() => formatPercent(presentation.progress.percent)}
          </ProgressValue>
        </Progress>
      )}
      <div className="grid grid-cols-3 gap-2">
        {RADIO_WRITE_STAGES.map((stage, index) => (
          <div key={stage} className="flex min-w-0 flex-col gap-2">
            <Separator />
            <span className="text-xs font-medium">{index + 1}</span>
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

type Translator = ReturnType<typeof useTranslations>

const REVIEW_SUBJECT_KEYS = {
  "Memory channel order": "radioWriteSubjectMemoryChannelOrder",
  "Function settings": "radioWriteSubjectFunctionSettings",
  "Display settings": "radioWriteSubjectDisplaySettings",
  "Sound settings": "radioWriteSubjectSoundSettings",
  "Keyboard settings": "radioWriteSubjectKeyboardSettings",
  "Menu visibility": "radioWriteSubjectMenuVisibility",
  "APRS settings": "radioWriteSubjectAprsSettings",
  "GPS settings": "radioWriteSubjectGpsSettings",
  "Bluetooth settings": "radioWriteSubjectBluetoothSettings",
  "Spectrum settings": "radioWriteSubjectSpectrumSettings",
  "DTMF settings": "radioWriteSubjectDtmfSettings",
  "2-Tone settings": "radioWriteSubjectTwoToneSettings",
  "5-Tone settings": "radioWriteSubjectFiveToneSettings",
  "FM broadcast settings": "radioWriteSubjectFmBroadcastSettings",
  "Write image preparation": "radioWriteSubjectWriteImagePreparation",
} as const

const REVIEW_FIELD_KEYS = {
  Position: "position",
  Channel: "radioWriteFieldChannel",
  Name: "channelName",
  "Receive frequency hz": "rxFrequency",
  "Transmit frequency hz": "txFrequency",
  "Selected zones": "zonesTitle",
  "Selected scan lists": "scanListsTitle",
  "Selected scan edges": "vfoScanEdgesTitle",
  "Mirror vfo temporary channels": "radioWriteFieldMirrorVfoChannels",
  "Restore fixed weather channels": "radioWriteFieldRestoreWeatherChannels",
} as const

function formatReviewSubject(subject: string, t: Translator): string {
  const exactKey =
    REVIEW_SUBJECT_KEYS[subject as keyof typeof REVIEW_SUBJECT_KEYS]
  if (exactKey) return t(exactKey)

  const patterns: readonly [RegExp, string, string][] = [
    [/^Memory channel (\d+)$/, "channelDetailsTitle", "number"],
    [/^VFO ([AB])$/, "vfoSlot", "slot"],
    [/^Call channel (\d+)$/, "callSlot", "slot"],
    [/^Zone (\d+)$/, "zoneNumber", "number"],
    [/^Scan list (\d+)$/, "scanListNumber", "number"],
    [/^VFO scan edge (\d+)$/, "radioWriteSubjectVfoScanEdge", "number"],
    [/^FM broadcast channel (\d+)$/, "radioWriteSubjectFmChannel", "number"],
    [/^Band ([AB]) zone selection$/, "radioWriteSubjectBandZones", "band"],
    [
      /^Band ([AB]) scan list selection$/,
      "radioWriteSubjectBandScanLists",
      "band",
    ],
    [/^Band ([AB]) VFO scan edges$/, "radioWriteSubjectBandScanEdges", "band"],
  ]

  for (const [pattern, key, argument] of patterns) {
    const match = pattern.exec(subject)
    if (!match) continue
    const value = argument === "number" ? Number(match[1]) : match[1]
    return t(key as never, { [argument]: value } as never)
  }

  return subject
}

function formatReviewField(field: string, t: Translator): string {
  const exactKey = REVIEW_FIELD_KEYS[field as keyof typeof REVIEW_FIELD_KEYS]
  if (exactKey) return t(exactKey)

  const suffix = messageSuffix(field)
  const shortenedSuffixes = [
    suffix.replace(/Seconds$/, ""),
    suffix.replace(/Minutes$/, ""),
    suffix.replace(/Ms$/, ""),
    suffix.replace(/K?Hz$/, ""),
    suffix.replace(/Index$/, ""),
  ]
  const candidates = [
    `setting${suffix}`,
    `aprs${suffix}`,
    `gps${suffix}`,
    `bluetooth${suffix}`,
    `spectrum${suffix}`,
    `signal${suffix}`,
    `fmBroadcast${suffix}`,
    ...shortenedSuffixes.flatMap((shortened) => [
      `setting${shortened}`,
      `aprs${shortened}`,
      `gps${shortened}`,
      `bluetooth${shortened}`,
      `spectrum${shortened}`,
      `signal${shortened}`,
      `fmBroadcast${shortened}`,
    ]),
  ]
  const key = candidates.find((candidate) => t.has(candidate as never))
  return key ? t(key as never) : field
}

function formatReviewValue(value: unknown, t: Translator): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value))
    return value.length > 0
      ? value.map((entry) => formatReviewValue(entry, t)).join(", ")
      : "—"
  if (typeof value === "object") return JSON.stringify(value)
  if (typeof value !== "string") return String(value)

  const exactKeys = {
    "Working Codeplug": "radioWriteValueWorkingCodeplug",
    "Applied to write image": "radioWriteValueAppliedToWriteImage",
  } as const
  const exactKey = exactKeys[value as keyof typeof exactKeys]
  if (exactKey) return t(exactKey)

  const valueKey = `value${messageSuffix(value)}`
  return t.has(valueKey as never) ? t(valueKey as never) : value
}

function messageSuffix(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

export { RadioWriteWorkflow }
export type { RadioWriteWorkflowProps }
