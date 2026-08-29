"use client"

import { AlertTriangleIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import type { WorkspaceError } from "@/components/cps-workspace-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function WorkspaceErrorAlert({
  error,
  operation,
}: {
  readonly error: WorkspaceError
  readonly operation: "read" | "write"
}) {
  const t = useTranslations()

  if ("kind" in error) {
    const values = {
      detectedVersion: error.detectedVersion || t("notReported"),
      validatedVersion: error.validatedVersion,
    }

    return (
      <Alert variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>{t("firmwareCompatibilityStopped")}</AlertTitle>
        <AlertDescription>
          {error.reason === "older"
            ? t("firmwareTooOld", values)
            : error.reason === "unvalidated"
              ? t("firmwareUnvalidated", values)
              : error.reason === "newer-unvalidated"
                ? t("firmwareNewerUnvalidated", values)
                : t("firmwareUnrecognized", values)}
        </AlertDescription>
      </Alert>
    )
  }

  const backupSaveFailed =
    "key" in error && error.key === "backupHistorySaveFailed"

  return (
    <Alert variant="destructive">
      <AlertTriangleIcon aria-hidden="true" />
      <AlertTitle>
        {backupSaveFailed
          ? t("backupHistorySaveFailedTitle")
          : t(operation === "read" ? "radioReadStopped" : "radioWriteStopped")}
      </AlertTitle>
      <AlertDescription>
        {"key" in error ? t(error.key) : error.message}
      </AlertDescription>
    </Alert>
  )
}

export { WorkspaceErrorAlert }
