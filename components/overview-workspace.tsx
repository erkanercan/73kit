"use client"

import * as React from "react"
import {
  ArchiveIcon,
  ArrowRightIcon,
  DownloadIcon,
  HardDriveIcon,
  InfoIcon,
  ListIcon,
  LoaderCircleIcon,
  MapIcon,
  RadioIcon,
  Settings2Icon,
  ShieldCheckIcon,
  WaypointsIcon,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import { createIndexedDbBackupHistoryStore } from "@/adapters/indexed-db-backup-history-store/index"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { useRadioCpsPath } from "@/components/radio-model-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
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
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert"
import { Link } from "@/i18n/navigation"
import { formatPercent } from "@/lib/format-percent"
import { cn } from "@/lib/utils"
import type { BackupHistoryEntry } from "@/modules/cps-workspace/index"

const backupHistoryStore = createIndexedDbBackupHistoryStore()

function OverviewWorkspace() {
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
  } = useCpsWorkspace()
  const latestBackup = useLatestBackup(completedRead?.baselineBackup.id)

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("overviewTitle")} />

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

      {completedRead ? (
        <ReadyOverview
          phase={phase}
          progress={progress}
          changeCount={changes.length}
          completedRead={completedRead}
          sourceRadio={completedRead.sourceRadio}
          latestBackup={latestBackup}
          onDownload={downloadRawBackup}
        />
      ) : (
        <FirstVisitOverview
          phase={phase}
          progress={progress}
          busy={busy}
          canRead={capability === "available"}
          latestBackup={latestBackup}
          onRead={() => void readRadio()}
        />
      )}
    </main>
  )
}

function FirstVisitOverview({
  phase,
  progress,
  busy,
  canRead,
  latestBackup,
  onRead,
}: {
  phase: "idle" | "connecting" | "reading" | "ready"
  progress: number
  busy: boolean
  canRead: boolean
  latestBackup: LatestBackupState
  onRead(): void
}) {
  const t = useTranslations()

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("overviewStartTitle")}</CardTitle>
          <CardAction>
            <RadioIcon aria-hidden="true" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {phase === "reading" ? (
            <Progress value={progress}>
              <ProgressLabel>{t("readingCodeplug")}</ProgressLabel>
              <ProgressValue>{() => formatPercent(progress)}</ProgressValue>
            </Progress>
          ) : (
            <>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("overviewStartDescription")}
              </p>
              <ol className="grid gap-4 md:grid-cols-3">
                <WorkflowStep
                  number={1}
                  title={t("overviewStepReadTitle")}
                  description={t("overviewStepReadDescription")}
                />
                <WorkflowStep
                  number={2}
                  title={t("overviewStepProgramTitle")}
                  description={t("overviewStepProgramDescription")}
                />
                <WorkflowStep
                  number={3}
                  title={t("overviewStepWriteTitle")}
                  description={t("overviewStepWriteDescription")}
                />
              </ol>
            </>
          )}

          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>{t("overviewLocalTitle")}</AlertTitle>
            <AlertDescription>{t("overviewLocalDescription")}</AlertDescription>
          </Alert>
        </CardContent>
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
            {busy ? t("readingRadio") : t("readRadio")}
          </Button>
        </CardFooter>
      </Card>

      <LatestBackupCard state={latestBackup} />
    </div>
  )
}

function ReadyOverview({
  phase,
  progress,
  changeCount,
  completedRead,
  sourceRadio,
  latestBackup,
  onDownload,
}: {
  phase: "idle" | "connecting" | "reading" | "ready"
  progress: number
  changeCount: number
  completedRead: NonNullable<
    ReturnType<typeof useCpsWorkspace>["completedRead"]
  >
  sourceRadio: ReturnType<typeof useCpsWorkspace>["sourceRadio"]
  latestBackup: LatestBackupState
  onDownload(): void
}) {
  const format = useFormatter()
  const t = useTranslations()
  const channelsPath = useRadioCpsPath("channels")
  const radioPath = useRadioCpsPath("radio")

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
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
              <OverviewDetail
                label={t("baselineBackup")}
                value={format.dateTime(completedRead.baselineBackup.createdAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <OverviewDetail
                label={t("pendingChanges")}
                value={t("changesCount", { count: changeCount })}
              />
              <OverviewDetail
                label={t("workingCodeplugStorage")}
                value={t("sessionOnly")}
              />
            </dl>
          )}

          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>{t("codeplugBackupReady")}</AlertTitle>
            <AlertDescription>{t("codeplugBackupValidated")}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <DownloadIcon data-icon="inline-start" />
            {completedRead.binding === "unbound"
              ? t("rawWorkingExport")
              : t("rawBackup")}
          </Button>
          <Link href={channelsPath} className={buttonVariants({ size: "sm" })}>
            {changeCount === 0
              ? t("continueToChannels")
              : t("continueProgramming")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {sourceRadio ? t("sourceRadio") : t("rawImportUnboundTitle")}
          </CardTitle>
          <CardAction>
            <RadioIcon aria-hidden="true" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {sourceRadio ? (
            <dl className="flex flex-col gap-4">
              <OverviewDetail
                label={t("radioModel")}
                value={sourceRadio.model}
              />
              <OverviewDetail
                label={t("serialNumber")}
                value={sourceRadio.serialNumber || t("notReported")}
                mono
              />
              <OverviewDetail
                label={t("firmware")}
                value={sourceRadio.firmwareVersion || t("notReported")}
              />
            </dl>
          ) : (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertTitle>{t("rawImportNoRadioTitle")}</AlertTitle>
              <AlertDescription>
                {t("rawImportUnboundDescription")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        {sourceRadio && (
          <CardFooter className="justify-end">
            <Link
              href={radioPath}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("viewRadioDetails")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </CardFooter>
        )}
      </Card>

      <ProgrammingDestinationsCard />
      <LatestBackupCard state={latestBackup} />
    </div>
  )
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <li className="flex min-w-0 gap-3 rounded-lg border p-4">
      <span className="shrink-0 font-mono text-sm font-medium">
        {String(number).padStart(2, "0")}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </li>
  )
}

function ProgrammingDestinationsCard() {
  const t = useTranslations()
  const channelsPath = useRadioCpsPath("channels")
  const zonesPath = useRadioCpsPath("zones")
  const settingsPath = useRadioCpsPath("radio-settings/functions")
  const aprsPath = useRadioCpsPath("aprs")
  const destinations = [
    { href: channelsPath, label: t("navChannels"), icon: ListIcon },
    { href: zonesPath, label: t("navZones"), icon: MapIcon },
    {
      href: settingsPath,
      label: t("navSettings"),
      icon: Settings2Icon,
    },
    { href: aprsPath, label: t("navAprs"), icon: WaypointsIcon },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("continueProgrammingTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {destinations.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className={buttonVariants({
              variant: "outline",
              className: "justify-start",
            })}
          >
            <destination.icon data-icon="inline-start" />
            {destination.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function LatestBackupCard({ state }: { state: LatestBackupState }) {
  const format = useFormatter()
  const t = useTranslations()
  const backupsPath = useRadioCpsPath("backups")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("latestBackupTitle")}</CardTitle>
        <CardAction>
          <ArchiveIcon aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-28 flex-col justify-center">
        {state.loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : state.entry ? (
          <dl className="flex flex-col gap-4">
            <OverviewDetail
              label={t("backupsDate")}
              value={format.dateTime(new Date(state.entry.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            <OverviewDetail
              label={t("backupsSource")}
              value={
                state.entry.origin === "radio-read"
                  ? t("backupsRadioRead")
                  : t("backupsRadioWrite")
              }
            />
            <OverviewDetail
              label={t("sourceRadio")}
              value={state.entry.sourceRadio.model}
            />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {state.error
              ? t("latestBackupUnavailable")
              : t("latestBackupEmpty")}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          href={backupsPath}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("openBackupHistory")}
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardFooter>
    </Card>
  )
}

function OverviewDetail({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn("text-right text-sm", mono ? "font-mono" : "font-medium")}
      >
        {value}
      </dd>
    </div>
  )
}

type LatestBackupState = {
  readonly loading: boolean
  readonly error: boolean
  readonly entry: BackupHistoryEntry | null
}

function useLatestBackup(refreshKey: string | undefined): LatestBackupState {
  const [state, setState] = React.useState<LatestBackupState>({
    loading: true,
    error: false,
    entry: null,
  })

  React.useEffect(() => {
    let active = true
    void backupHistoryStore
      .list()
      .then((entries) => {
        if (active) {
          setState({ loading: false, error: false, entry: entries[0] ?? null })
        }
      })
      .catch(() => {
        if (active) setState({ loading: false, error: true, entry: null })
      })

    return () => {
      active = false
    }
  }, [refreshKey])

  return state
}

export { OverviewWorkspace }
