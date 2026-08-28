"use client"

import { DownloadIcon, LifeBuoyIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

function UpdateSupportReport() {
  const { diagnosticReportAvailable, downloadDiagnosticReport } =
    useUpdateCoordinator()
  const t = useTranslations()

  if (!diagnosticReportAvailable) return null

  return (
    <Alert>
      <LifeBuoyIcon aria-hidden="true" />
      <AlertTitle>{t("updatesSupportReportTitle")}</AlertTitle>
      <AlertDescription>
        {t("updatesSupportReportDescription")}
      </AlertDescription>
      <AlertAction>
        <Button size="xs" variant="outline" onClick={downloadDiagnosticReport}>
          <DownloadIcon data-icon="inline-start" />
          {t("updatesSupportReportDownload")}
        </Button>
      </AlertAction>
    </Alert>
  )
}

export { UpdateSupportReport }
