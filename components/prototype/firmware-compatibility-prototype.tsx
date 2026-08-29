"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ShieldXIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { PageHeader } from "@/components/page-header"
import { RadioOperationSimulator } from "@/components/prototype/radio-operation-simulator"
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  evaluateFirmwareCompatibility,
  type FirmwareCompatibility,
} from "@/modules/uvl15w-radio/index"

const PRESET_VERSIONS = [
  "V3.07.23",
  "3.07.23",
  "3.07.22",
  "3.07.9",
  "3.08.00",
  "4.00.00",
  "FW1.0",
  "",
] as const

const VARIANTS = ["a", "b", "c", "d"] as const
type PrototypeVariant = (typeof VARIANTS)[number]

function FirmwareCompatibilityPrototype() {
  const searchParams = useSearchParams()
  const requestedVariant = searchParams.get("variant")
  const variant: PrototypeVariant = VARIANTS.includes(
    requestedVariant as PrototypeVariant
  )
    ? (requestedVariant as PrototypeVariant)
    : "a"
  const [firmwareVersion, setFirmwareVersion] = React.useState("V3.07.23")
  const compatibility = evaluateFirmwareCompatibility(firmwareVersion)

  return (
    <>
      {variant === "a" && (
        <VariantDecisionLab
          firmwareVersion={firmwareVersion}
          compatibility={compatibility}
          onFirmwareVersionChange={setFirmwareVersion}
        />
      )}
      {variant === "b" && (
        <VariantHandshakePipeline
          firmwareVersion={firmwareVersion}
          compatibility={compatibility}
          onFirmwareVersionChange={setFirmwareVersion}
        />
      )}
      {variant === "c" && (
        <VariantVersionMatrix
          firmwareVersion={firmwareVersion}
          compatibility={compatibility}
          onFirmwareVersionChange={setFirmwareVersion}
        />
      )}
      {variant === "d" && (
        <RadioOperationSimulator
          firmwareVersion={firmwareVersion}
          compatibility={compatibility}
          onFirmwareVersionChange={setFirmwareVersion}
        />
      )}
      <PrototypeSwitcher current={variant} />
    </>
  )
}

interface VariantProps {
  readonly firmwareVersion: string
  readonly compatibility: FirmwareCompatibility
  onFirmwareVersionChange(version: string): void
}

function VariantDecisionLab({
  firmwareVersion,
  compatibility,
  onFirmwareVersionChange,
}: VariantProps) {
  const t = useTranslations()

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-8 pb-24">
      <PageHeader title={t("firmwareDemoTitle")} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("firmwareDemoInputTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <VersionInput
              value={firmwareVersion}
              onChange={onFirmwareVersionChange}
            />
            <PresetButtons onSelect={onFirmwareVersionChange} />
          </CardContent>
          <CardFooter>
            <span className="text-xs text-muted-foreground">
              {t("firmwareDemoNoRadio")}
            </span>
          </CardFooter>
        </Card>

        <div className="flex flex-col gap-4">
          <CompatibilityAlert compatibility={compatibility} />
          <CompatibilityState compatibility={compatibility} />
        </div>
      </div>
    </div>
  )
}

function VariantHandshakePipeline({
  firmwareVersion,
  compatibility,
  onFirmwareVersionChange,
}: VariantProps) {
  const t = useTranslations()
  const allowed = compatibility.status === "supported"

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-8 pb-24">
      <PageHeader title={t("firmwareDemoPipelineTitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("firmwareDemoSimulatedRadio")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] gap-6">
          <div className="flex flex-col gap-5">
            <VersionInput
              value={firmwareVersion}
              onChange={onFirmwareVersionChange}
            />
            <PresetButtons onSelect={onFirmwareVersionChange} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <PipelineStage
              number="1"
              title="E0"
              description={t("firmwareDemoStageHandshake")}
              status="complete"
            />
            <PipelineStage
              number="2"
              title="E1"
              description={t("firmwareDemoStageInformation")}
              status="complete"
            />
            <PipelineStage
              number="3"
              title={t("firmwareDemoStageDecision")}
              description={firmwareVersion || t("notReported")}
              status={allowed ? "complete" : "blocked"}
            />
            <PipelineStage
              number="4"
              title="E2"
              description={
                allowed
                  ? t("firmwareDemoStageReadAllowed")
                  : t("firmwareDemoStageReadBlocked")
              }
              status={allowed ? "ready" : "blocked"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] gap-6">
        <CompatibilityAlert compatibility={compatibility} />
        <CompatibilityState compatibility={compatibility} compact />
      </div>
    </div>
  )
}

function VariantVersionMatrix({
  firmwareVersion,
  compatibility,
  onFirmwareVersionChange,
}: VariantProps) {
  const t = useTranslations()

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-8 pb-24">
      <PageHeader title={t("firmwareDemoMatrixTitle")} />

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)] items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("firmwareDemoMatrixTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("firmwareDemoDetectedVersion")}</TableHead>
                  <TableHead>{t("firmwareDemoNormalizedVersion")}</TableHead>
                  <TableHead>{t("firmwareDemoDecision")}</TableHead>
                  <TableHead className="text-right">
                    {t("firmwareDemoAction")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRESET_VERSIONS.map((version, index) => {
                  const result = evaluateFirmwareCompatibility(version)
                  return (
                    <TableRow key={`${version}-${index}`}>
                      <TableCell className="font-mono font-medium">
                        {version || t("firmwareDemoBlankVersion")}
                      </TableCell>
                      <TableCell className="font-mono">
                        {result.normalizedVersion ?? "—"}
                      </TableCell>
                      <TableCell>
                        <CompatibilityStatus compatibility={result} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onFirmwareVersionChange(version)}
                        >
                          {t("firmwareDemoSimulate")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("firmwareDemoCustomVersion")}</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionInput
                value={firmwareVersion}
                onChange={onFirmwareVersionChange}
              />
            </CardContent>
          </Card>
          <CompatibilityAlert compatibility={compatibility} />
        </div>
      </div>
    </div>
  )
}

function VersionInput({
  value,
  onChange,
}: {
  readonly value: string
  onChange(value: string): void
}) {
  const t = useTranslations()

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="firmware-version-demo">
          {t("firmwareDemoDetectedVersion")}
        </FieldLabel>
        <Input
          id="firmware-version-demo"
          value={value}
          placeholder="V3.07.23"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
        <FieldDescription>{t("firmwareDemoInputDescription")}</FieldDescription>
      </Field>
    </FieldGroup>
  )
}

function PresetButtons({ onSelect }: { onSelect(version: string): void }) {
  const t = useTranslations()

  return (
    <Field>
      <FieldLabel>{t("firmwareDemoPresets")}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {PRESET_VERSIONS.map((version, index) => (
          <Button
            key={`${version}-${index}`}
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onSelect(version)}
          >
            {version || t("firmwareDemoBlankVersion")}
          </Button>
        ))}
      </div>
    </Field>
  )
}

function CompatibilityAlert({
  compatibility,
}: {
  readonly compatibility: FirmwareCompatibility
}) {
  const t = useTranslations()

  if (compatibility.status === "supported") {
    return (
      <Alert>
        <ShieldCheckIcon aria-hidden="true" />
        <AlertTitle>{t("firmwareDemoSupportedTitle")}</AlertTitle>
        <AlertDescription>
          {t("firmwareDemoSupportedDescription", {
            detectedVersion: compatibility.detectedVersion,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  const values = {
    detectedVersion: compatibility.detectedVersion || t("notReported"),
    validatedVersion: compatibility.validatedVersions.at(-1) ?? "—",
  }

  return (
    <Alert variant="destructive">
      <ShieldXIcon aria-hidden="true" />
      <AlertTitle>{t("firmwareCompatibilityStopped")}</AlertTitle>
      <AlertDescription>
        {compatibility.reason === "older"
          ? t("firmwareTooOld", values)
          : compatibility.reason === "unvalidated"
            ? t("firmwareUnvalidated", values)
            : compatibility.reason === "newer-unvalidated"
              ? t("firmwareNewerUnvalidated", values)
              : t("firmwareUnrecognized", values)}
      </AlertDescription>
    </Alert>
  )
}

function CompatibilityState({
  compatibility,
  compact = false,
}: {
  readonly compatibility: FirmwareCompatibility
  readonly compact?: boolean
}) {
  const t = useTranslations()
  const snapshot = JSON.stringify(compatibility, null, 2)

  return (
    <Card size={compact ? "sm" : "default"}>
      <CardHeader>
        <CardTitle>{t("firmwareDemoStateSnapshot")}</CardTitle>
        <CardAction>
          <CompatibilityStatus compatibility={compatibility} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
          {snapshot}
        </pre>
      </CardContent>
    </Card>
  )
}

function CompatibilityStatus({
  compatibility,
}: {
  readonly compatibility: FirmwareCompatibility
}) {
  const t = useTranslations()

  return (
    <span
      className={
        compatibility.status === "supported"
          ? "text-sm font-medium"
          : "text-sm font-medium text-destructive"
      }
    >
      {compatibility.status === "supported" ? (
        t("firmwareDemoSupported")
      ) : (
        <CompatibilityReason reason={compatibility.reason} />
      )}
    </span>
  )
}

function CompatibilityReason({
  reason,
}: {
  readonly reason: Exclude<
    FirmwareCompatibility,
    { readonly status: "supported" }
  >["reason"]
}) {
  const t = useTranslations()

  switch (reason) {
    case "older":
      return t("firmwareDemoReasonOlder")
    case "unvalidated":
      return t("firmwareDemoReasonUnvalidated")
    case "newer-unvalidated":
      return t("firmwareDemoReasonNewer")
    case "unrecognized":
      return t("firmwareDemoReasonUnrecognized")
  }
}

function PipelineStage({
  number,
  title,
  description,
  status,
}: {
  readonly number: string
  readonly title: string
  readonly description: string
  readonly status: "complete" | "ready" | "blocked"
}) {
  const t = useTranslations()

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {number}. {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{description}</p>
      </CardContent>
      <CardFooter>
        <span
          className={
            status === "blocked"
              ? "text-xs font-medium text-destructive"
              : "text-xs font-medium"
          }
        >
          {status === "complete"
            ? t("firmwareDemoStageComplete")
            : status === "ready"
              ? t("firmwareDemoStageReady")
              : t("firmwareDemoStageBlocked")}
        </span>
      </CardFooter>
    </Card>
  )
}

function PrototypeSwitcher({
  current,
}: {
  readonly current: PrototypeVariant
}) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectVariant = React.useCallback(
    (direction: -1 | 1) => {
      const currentIndex = VARIANTS.indexOf(current)
      const nextIndex =
        (currentIndex + direction + VARIANTS.length) % VARIANTS.length
      const params = new URLSearchParams(searchParams.toString())
      params.set("variant", VARIANTS[nextIndex])
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [current, pathname, router, searchParams]
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      if (event.key === "ArrowLeft") {
        selectVariant(-1)
      } else if (event.key === "ArrowRight") {
        selectVariant(1)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectVariant])

  if (process.env.NODE_ENV === "production") {
    return null
  }

  const labels = {
    a: t("firmwareDemoVariantA"),
    b: t("firmwareDemoVariantB"),
    c: t("firmwareDemoVariantC"),
    d: t("firmwareDemoVariantD"),
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-background p-2 shadow-lg">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={t("firmwareDemoPreviousVariant")}
        onClick={() => selectVariant(-1)}
      >
        <ArrowLeftIcon />
      </Button>
      <span className="px-2 text-sm font-medium">
        {current.toUpperCase()} · {labels[current]}
      </span>
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={t("firmwareDemoNextVariant")}
        onClick={() => selectVariant(1)}
      >
        <ArrowRightIcon />
      </Button>
    </div>
  )
}

export { FirmwareCompatibilityPrototype }
