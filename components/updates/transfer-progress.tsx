"use client"

import { LoaderCircleIcon, PlugZapIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  useUpdateCoordinator,
  type UpdateCoordinatorPhase,
} from "@/components/update-coordinator-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { UpdateErrorAlert, phaseLabel } from "@/components/updates/update-ui"

function ActiveTransfer() {
  const {
    completedBlocks,
    errorCode,
    phase,
    progress,
    selectedPackage,
    totalBlocks,
  } = useUpdateCoordinator()
  const t = useTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LoaderCircleIcon className="animate-spin" />
          {phaseLabel(phase, t)}
        </CardTitle>
        <CardDescription>
          {selectedPackage?.fileName ?? t("updatesPackageTitle")}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{progress}%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Alert>
          <PlugZapIcon aria-hidden="true" />
          <AlertTitle>{t("updatesDoNotDisconnect")}</AlertTitle>
          <AlertDescription>{t("updatesDoNotDisconnectHint")}</AlertDescription>
        </Alert>
        <Progress value={progress}>
          <ProgressLabel>{phaseLabel(phase, t)}</ProgressLabel>
          <ProgressValue>
            {() =>
              t("updatesProgressValue", {
                completed: completedBlocks,
                total: totalBlocks,
              })
            }
          </ProgressValue>
        </Progress>
        <TransferPhases active={phase} />
        {errorCode && <UpdateErrorAlert code={errorCode} />}
      </CardContent>
    </Card>
  )
}

function TransferPhases({
  active,
}: {
  readonly active: UpdateCoordinatorPhase
}) {
  const t = useTranslations()
  const phases: Array<[UpdateCoordinatorPhase, string]> = [
    ["connecting", t("updatesPhaseConnecting")],
    ["handshake", t("updatesPhaseHandshake")],
    ["transferring", t("updatesPhaseTransfer")],
    ["verifying", t("updatesPhaseVerify")],
    ["finalizing", t("updatesPhaseFinalize")],
  ]
  const activeIndex = phases.findIndex(([phase]) => phase === active)

  return (
    <div className="grid grid-cols-5 gap-2">
      {phases.map(([phase, label], index) => (
        <div key={phase} className="flex min-w-0 flex-col gap-2">
          <Separator />
          <Badge
            variant={
              index === activeIndex
                ? "default"
                : index < activeIndex
                  ? "secondary"
                  : "outline"
            }
            className="w-fit"
          >
            {index + 1}
          </Badge>
          <span
            className={
              index === activeIndex
                ? "text-xs font-medium"
                : "text-xs text-muted-foreground"
            }
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

export { ActiveTransfer }
