"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  RadioIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldGroup } from "@/components/ui/field"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { AcknowledgementField } from "@/components/updates/preparation-checklist"
import {
  UpdateErrorAlert,
  packageKindLabel,
} from "@/components/updates/update-ui"

function VerifyInstallation() {
  const {
    errorCode,
    phase,
    progress,
    selectedPackage,
    transferResult,
    verifyInstallation,
  } = useUpdateCoordinator()
  const t = useTranslations()
  const [languageConfirmed, setLanguageConfirmed] = React.useState(false)
  const verifying = phase === "verifying-installation"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("updatesRestartTitle")}</CardTitle>
        <CardDescription>{t("updatesRestartDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          <Instruction number="1" text={t("updatesRestartStepOff")} />
          <Instruction number="2" text={t("updatesRestartStepNormal")} />
          <Instruction number="3" text={t("updatesRestartStepConnect")} />
        </div>
        {transferResult?.requiresLanguageConfirmation && (
          <FieldGroup>
            <AcknowledgementField
              checked={languageConfirmed}
              title={t("updatesLanguageVerifyCheck", {
                version: transferResult.expectedLanguageVersion ?? "",
              })}
              description={t("updatesLanguageVerifyCheckHint")}
              onCheckedChange={setLanguageConfirmed}
            />
          </FieldGroup>
        )}
        {verifying && (
          <Progress value={progress}>
            <ProgressLabel>{t("updatesReadingRadio")}</ProgressLabel>
            <ProgressValue>{() => `${progress}%`}</ProgressValue>
          </Progress>
        )}
        {errorCode && <UpdateErrorAlert code={errorCode} />}
      </CardContent>
      <CardFooter className="justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {t("updatesVerificationHint", {
            operation: packageKindLabel(selectedPackage?.kind ?? "firmware", t),
          })}
        </p>
        <Button
          disabled={
            verifying ||
            (transferResult?.requiresLanguageConfirmation && !languageConfirmed)
          }
          onClick={() => void verifyInstallation(languageConfirmed)}
        >
          {verifying ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <RadioIcon data-icon="inline-start" />
          )}
          {t("updatesVerifyButton")}
        </Button>
      </CardFooter>
    </Card>
  )
}

function Instruction({
  number,
  text,
}: {
  readonly number: string
  readonly text: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <Badge variant="outline" className="w-fit">
          {number}
        </Badge>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function CompletedUpdate() {
  const { selectedPackage, startAnotherUpdate } = useUpdateCoordinator()
  const t = useTranslations()

  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2Icon />
            </EmptyMedia>
            <EmptyTitle>{t("updatesCompleteTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("updatesCompleteDescription", {
                operation: packageKindLabel(
                  selectedPackage?.kind ?? "firmware",
                  t
                ),
              })}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={startAnotherUpdate}>
              <RotateCcwIcon data-icon="inline-start" />
              {t("updatesAnother")}
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}

function UnknownOutcome() {
  const {
    busy,
    confirmOfficialCpsRecovery,
    errorCode,
    inspectRecoveryRadio,
    phase,
    progress,
    recoveryInspectionComplete,
    recoveryCanRetryInBrowser,
    recoveryRecord,
    selectRecoveryPackage,
    totalBlocks,
  } = useUpdateCoordinator()
  const t = useTranslations()
  const inputRef = React.useRef<HTMLInputElement>(null)
  if (!recoveryRecord) return null
  const checking = phase === "checking-recovery"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <TriangleAlertIcon />
          {t("updatesUnknownTitle")}
        </CardTitle>
        <CardDescription>{t("updatesUnknownDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>{t("updatesDoNotRetry")}</AlertTitle>
          <AlertDescription>{t("updatesDoNotRetryHint")}</AlertDescription>
        </Alert>
        <div className="grid grid-cols-3 gap-3">
          <RecoveryFact
            label={t("updatesRecoveryPackage")}
            value={packageKindLabel(recoveryRecord.packageKind, t)}
          />
          <RecoveryFact
            label={t("updatesRecoveryLastBlock")}
            value={
              totalBlocks > 0
                ? `${recoveryRecord.lastAcknowledgedBlock} / ${totalBlocks}`
                : String(recoveryRecord.lastAcknowledgedBlock)
            }
          />
          <RecoveryFact
            label={t("updatesRecoveryTime")}
            value={new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "medium",
            }).format(new Date(recoveryRecord.createdAt))}
          />
        </div>
        {checking && (
          <Progress value={progress}>
            <ProgressLabel>{t("updatesRecoveryChecking")}</ProgressLabel>
            <ProgressValue>{() => `${progress}%`}</ProgressValue>
          </Progress>
        )}
        {recoveryInspectionComplete ? (
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>{t("updatesRecoveryRadioReady")}</AlertTitle>
            <AlertDescription>
              {t(
                recoveryCanRetryInBrowser
                  ? "updatesRecoveryRadioReadyBrowserHint"
                  : "updatesRecoveryRadioReadyOfficialHint"
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <RadioIcon aria-hidden="true" />
            <AlertTitle>{t("updatesRecoveryCheckTitle")}</AlertTitle>
            <AlertDescription>{t("updatesRecoveryCheckHint")}</AlertDescription>
          </Alert>
        )}
        {errorCode && <UpdateErrorAlert code={errorCode} />}
      </CardContent>
      <CardFooter className="justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("updatesRecoveryInstructions")}
        </p>
        {recoveryInspectionComplete ? (
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".Fir,.fir,.DAT,.dat"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void selectRecoveryPackage(file)
                event.currentTarget.value = ""
              }}
            />
            {recoveryCanRetryInBrowser && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon data-icon="inline-start" />
                {t("updatesRecoveryChooseSamePackage")}
              </Button>
            )}
            <Button disabled={busy} onClick={confirmOfficialCpsRecovery}>
              <CheckCircle2Icon data-icon="inline-start" />
              {t("updatesRecoveryOfficialComplete")}
            </Button>
          </div>
        ) : (
          <Button disabled={busy} onClick={() => void inspectRecoveryRadio()}>
            {checking ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <RadioIcon data-icon="inline-start" />
            )}
            {t("updatesRecoveryCheckButton")}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function RecoveryFact({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

export { CompletedUpdate, UnknownOutcome, VerifyInstallation }
