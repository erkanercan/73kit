"use client"

import {
  ChevronDownIcon,
  DownloadIcon,
  HardDriveIcon,
  InfoIcon,
  LoaderCircleIcon,
  RadioIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import { StatusText } from "@/components/cps-app-shell"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert"
import { formatPercent } from "@/lib/format-percent"
import type { SourceRadio } from "@/modules/uvl15w-radio/index"

function RadioOverview() {
  const t = useTranslations()
  const {
    busy,
    capability,
    changes,
    completedRead,
    downloadRawBackup,
    error,
    phase,
    progress,
    readRadio,
    sourceRadio,
  } = useCpsWorkspace()
  const displayedRadio = sourceRadio ?? completedRead?.sourceRadio ?? null

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title="UVL-15W" />

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
          <AlertDescription>{t("secureContextHelp")}</AlertDescription>
        </Alert>
      )}

      {error && <WorkspaceErrorAlert error={error} operation="read" />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
        <RadioInformationCard
          radio={displayedRadio}
          phase={phase}
          busy={busy}
          canRead={capability === "available"}
          readAgain={completedRead !== null}
          onRead={() => void readRadio()}
        />
        <WorkspaceCard
          phase={phase}
          progress={progress}
          completedRead={completedRead}
          changeCount={changes.length}
          onDownload={downloadRawBackup}
        />
      </div>
    </div>
  )
}

function RadioInformationCard({
  radio,
  phase,
  busy,
  canRead,
  readAgain,
  onRead,
}: {
  radio: SourceRadio | null
  phase: "idle" | "connecting" | "reading" | "ready"
  busy: boolean
  canRead: boolean
  readAgain: boolean
  onRead(): void
}) {
  const t = useTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("radioInformation")}</CardTitle>
        <CardAction>
          <StatusText phase={phase} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {radio ? (
          <RadioDetails radio={radio} />
        ) : (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RadioIcon />
              </EmptyMedia>
              <EmptyTitle>{t("noRadioInformation")}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button disabled={!canRead || busy} onClick={onRead}>
                {busy ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                {busy
                  ? t("readingRadio")
                  : readAgain
                    ? t("readAgain")
                    : t("readRadio")}
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
      {radio && (
        <CardFooter className="justify-end">
          <Button disabled={!canRead || busy} onClick={onRead}>
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            {busy
              ? t("readingRadio")
              : readAgain
                ? t("readAgain")
                : t("readRadio")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function RadioDetails({ radio }: { radio: SourceRadio }) {
  const t = useTranslations()
  const details = [
    [t("serialNumber"), radio.serialNumber || t("notReported")],
    [t("firmware"), radio.firmwareVersion || t("notReported")],
    [t("hardware"), radio.hardwareVersion || t("notReported")],
    [t("imageResources"), radio.imageResourceVersion || t("notReported")],
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <RadioIcon aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-heading text-lg font-medium">
            {radio.model}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("sourceRadioVerified")}
          </span>
        </div>
      </div>

      <Separator />

      <dl className="grid gap-5 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {label}
            </dt>
            <dd className="truncate font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <ProtectionStatus
          label={t("readProtection")}
          enabled={radio.readProtected}
        />
        <ProtectionStatus
          label={t("writeProtection")}
          enabled={radio.writeProtected}
        />
      </div>

      <Separator />

      <Collapsible>
        <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
          <ChevronDownIcon data-icon="inline-start" />
          {t("technicalDetails")}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <dl className="grid gap-4 rounded-lg bg-muted p-4 sm:grid-cols-2">
            <TechnicalDetail
              label={t("subModel")}
              value={String(radio.subModel)}
            />
            <TechnicalDetail
              label={t("bootloaderModel")}
              value={radio.bootloaderModel || t("notReported")}
            />
            <TechnicalDetail
              label={t("cpuId")}
              value={radio.cpuId || t("notReported")}
            />
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ProtectionStatus({
  label,
  enabled,
}: {
  label: string
  enabled: boolean
}) {
  const t = useTranslations()

  return (
    <span className="text-sm">
      {label}: {enabled ? t("on") : t("off")}
    </span>
  )
}

function TechnicalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs break-all">{value}</dd>
    </div>
  )
}

function WorkspaceCard({
  phase,
  progress,
  completedRead,
  changeCount,
  onDownload,
}: {
  phase: "idle" | "connecting" | "reading" | "ready"
  progress: number
  completedRead: ReturnType<typeof useCpsWorkspace>["completedRead"]
  changeCount: number
  onDownload(): void
}) {
  const format = useFormatter()
  const t = useTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workingCodeplug")}</CardTitle>
        <CardAction>
          <HardDriveIcon aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {phase === "reading" ? (
          <Progress value={progress}>
            <ProgressLabel>{t("readingCodeplug")}</ProgressLabel>
            <ProgressValue>{() => formatPercent(progress)}</ProgressValue>
          </Progress>
        ) : (
          <dl className="flex flex-col gap-4">
            <WorkspaceDetail
              label={t("baselineBackup")}
              value={completedRead ? t("ready") : t("notCreated")}
            />
            <WorkspaceDetail
              label={t("workingCodeplug")}
              value={completedRead ? t("readyToInspect") : t("none")}
            />
            <WorkspaceDetail
              label={t("pendingChanges")}
              value={String(changeCount)}
            />
            <WorkspaceDetail
              label={t("localPersistence")}
              value={completedRead ? t("sessionOnly") : t("noData")}
            />
          </dl>
        )}

        {completedRead && (
          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>{t("codeplugBackupReady")}</AlertTitle>
            <AlertDescription>{t("codeplugBackupValidated")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      {completedRead && (
        <CardFooter className="justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {format.dateTime(completedRead.baselineBackup.createdAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <DownloadIcon data-icon="inline-start" />
            {t("rawBackup")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function WorkspaceDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  )
}

export { RadioOverview }
