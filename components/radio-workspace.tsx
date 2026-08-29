"use client"

import {
  ChevronDownIcon,
  DownloadIcon,
  InfoIcon,
  LoaderCircleIcon,
  RadioIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { StatusText } from "@/components/cps-app-shell"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { RadioReadButton } from "@/components/radio-read-button"
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
import { Separator } from "@/components/ui/separator"
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert"
import type { SourceRadio } from "@/modules/uvl15w-radio/index"

function RadioWorkspace() {
  const t = useTranslations()
  const {
    busy,
    capability,
    completedRead,
    error,
    phase,
    readRadio,
    sourceRadio,
  } = useCpsWorkspace()
  const displayedRadio = sourceRadio ?? completedRead?.sourceRadio ?? null

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioTitle")} />

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

      {displayedRadio ? (
        <div className="max-w-4xl">
          <RadioInformationCard
            radio={displayedRadio}
            phase={phase}
            busy={busy}
            canRead={capability === "available"}
            readAgain={completedRead !== null}
            onRead={() => void readRadio()}
          />
        </div>
      ) : (
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RadioIcon />
            </EmptyMedia>
            <EmptyTitle>{t("noRadioInformation")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <RadioReadButton
              busy={busy}
              disabled={capability !== "available"}
              onClick={() => void readRadio()}
            />
          </EmptyContent>
        </Empty>
      )}
    </main>
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
  radio: SourceRadio
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
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            {t("radioInformationDescription")}
          </p>
          <RadioDetails radio={radio} />
        </div>
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
          {busy
            ? t("readingRadio")
            : readAgain
              ? t("readAgain")
              : t("readRadio")}
        </Button>
      </CardFooter>
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

export { RadioWorkspace }
