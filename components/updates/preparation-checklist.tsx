"use client"

import * as React from "react"
import {
  CircleAlertIcon,
  HardDriveUploadIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  UpdateErrorAlert,
  packageKindLabel,
} from "@/components/updates/update-ui"
import {
  isUpdatePreparationConfirmed,
  type UpdateAcknowledgements,
} from "@/modules/update-policy/index"
import { getUpdateReadiness } from "@/modules/update-presentation/index"

function PreparationChecklist({
  betaRiskAccepted,
}: {
  readonly betaRiskAccepted: boolean
}) {
  const { capability, errorCode, selectedPackage, startUpdate } =
    useUpdateCoordinator()
  const t = useTranslations()
  const [acknowledgements, setAcknowledgements] = React.useState<
    Omit<UpdateAcknowledgements, "betaRiskAccepted">
  >({
    backupReady: false,
    stablePower: false,
    bootModeReady: false,
    languagePrerequisiteReady: false,
  })
  const languagePrerequisite = selectedPackage?.prerequisites.find(
    (prerequisite) => prerequisite.kind === "language"
  )
  const confirmations = { ...acknowledgements, betaRiskAccepted }
  const preparationReady = selectedPackage
    ? isUpdatePreparationConfirmed(selectedPackage, confirmations)
    : false
  const readiness = getUpdateReadiness(capability, preparationReady)

  const updateAcknowledgement = (
    key: keyof typeof acknowledgements,
    checked: boolean
  ) => setAcknowledgements((current) => ({ ...current, [key]: checked }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("updatesPrepareTitle")}</CardTitle>
        <CardDescription>{t("updatesPrepareDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {readiness.state === "checking" && (
          <Alert>
            <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            <AlertTitle>{t("updatesBrowserCheckingTitle")}</AlertTitle>
            <AlertDescription>
              {t("updatesBrowserCheckingDescription")}
            </AlertDescription>
          </Alert>
        )}
        {readiness.state === "unsupported" && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>{t("updatesBrowserUnavailableTitle")}</AlertTitle>
            <AlertDescription>
              {t(
                capability === "insecure-context"
                  ? "updatesBrowserInsecureDescription"
                  : "updatesBrowserUnavailableDescription"
              )}
            </AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <AcknowledgementField
            checked={acknowledgements.backupReady}
            title={t("updatesBackupCheck")}
            description={t("updatesBackupCheckHint")}
            onCheckedChange={(checked) =>
              updateAcknowledgement("backupReady", checked)
            }
          />
          <AcknowledgementField
            checked={acknowledgements.stablePower}
            title={t("updatesPowerCheck")}
            description={t("updatesPowerCheckHint")}
            onCheckedChange={(checked) =>
              updateAcknowledgement("stablePower", checked)
            }
          />
          {languagePrerequisite && (
            <AcknowledgementField
              checked={acknowledgements.languagePrerequisiteReady}
              title={t("updatesLanguagePrerequisiteCheck", {
                version: languagePrerequisite.version,
              })}
              description={t("updatesLanguagePrerequisiteCheckHint", {
                languageVersion: languagePrerequisite.version,
                firmwareVersion:
                  selectedPackage?.targets.firmware ??
                  selectedPackage?.version ??
                  "",
              })}
              onCheckedChange={(checked) =>
                updateAcknowledgement("languagePrerequisiteReady", checked)
              }
            />
          )}
          <AcknowledgementField
            checked={acknowledgements.bootModeReady}
            title={t("updatesBootModeCheck")}
            description={t("updatesBootModeCheckHint")}
            onCheckedChange={(checked) =>
              updateAcknowledgement("bootModeReady", checked)
            }
          />
        </FieldGroup>
        {errorCode === "confirmation-required" && (
          <UpdateErrorAlert code={errorCode} />
        )}
      </CardContent>
      <CardFooter className="justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {t("updatesNoCancelHint")}
        </p>
        <Button
          disabled={!readiness.canStart}
          onClick={() => void startUpdate(confirmations)}
        >
          <HardDriveUploadIcon data-icon="inline-start" />
          {t("updatesStart", {
            operation: packageKindLabel(selectedPackage?.kind ?? "firmware", t),
          })}
        </Button>
      </CardFooter>
    </Card>
  )
}

function AcknowledgementField({
  checked,
  title,
  description,
  onCheckedChange,
}: {
  readonly checked: boolean
  readonly title: string
  readonly description: string
  onCheckedChange(checked: boolean): void
}) {
  return (
    <FieldLabel>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      </Field>
    </FieldLabel>
  )
}

export { AcknowledgementField, PreparationChecklist }
