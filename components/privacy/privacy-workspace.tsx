"use client"

import { useTranslations } from "next-intl"

import { useAnalytics } from "@/components/analytics/analytics-provider"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyticsConfig } from "@/lib/analytics/config"
import { analyticsEventContract } from "@/lib/analytics/index"

function PrivacyWorkspace() {
  const analytics = useAnalytics()
  const t = useTranslations()

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("privacyTitle")} />
      <Alert>
        <AlertTitle>{t("privacyReviewTitle")}</AlertTitle>
        <AlertDescription>{t("privacyReviewDescription")}</AlertDescription>
      </Alert>
      <PrivacyCard title={t("privacyControllerTitle")}>
        <p>{t("privacyControllerDescription")}</p>
      </PrivacyCard>
      <PrivacyCard title={t("privacyAnalyticsTitle")}>
        <div className="flex flex-col gap-3">
          <p>{t("privacyAnalyticsDescription")}</p>
          <p>{t("privacyProcessorPlaceholder")}</p>
          <p>{t("privacySessionDescription")}</p>
          <p>{t("privacySignalsDescription")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => analytics.setPreference("enabled")}
              disabled={analytics.privacySignal || !analytics.configured}
            >
              {t("analyticsAllow")}
            </Button>
            <Button
              variant="outline"
              onClick={() => analytics.setPreference("disabled")}
            >
              {t("analyticsTurnOff")}
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {t("privacyAnalyticsStatus", {
                status: analytics.privacySignal
                  ? t("privacyStatusBrowserDisabled")
                  : analytics.enabled
                    ? t("privacyStatusEnabled")
                    : t("privacyStatusDisabled"),
              })}
            </span>
          </div>
        </div>
      </PrivacyCard>
      <PrivacyCard title={t("privacyCollectedTitle")}>
        <p>{t("privacyCollectedDescription")}</p>
        <ul className="mt-3 flex flex-col gap-3 font-mono text-xs">
          {Object.entries(analyticsEventContract).map(([event, properties]) => (
            <li key={event}>
              <strong className="text-foreground">{event}</strong>
              <ul className="mt-1 flex flex-col gap-1 pl-4">
                {Object.entries(properties).map(([property, values]) => (
                  <li key={property}>
                    {property}: {values.join(", ")}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-3">{t("privacyProhibitedDescription")}</p>
      </PrivacyCard>
      <PrivacyCard title={t("privacyLocalFirstTitle")}>
        <p>{t("privacyLocalFirstDescription")}</p>
      </PrivacyCard>
      <PrivacyCard title={t("privacyStorageTitle")}>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>{t("privacyStorageCookies")}</li>
          <li>{t("privacyStorageLocal")}</li>
          <li>{t("privacyStorageRecovery")}</li>
          <li>{t("privacyStorageIndexedDb")}</li>
        </ul>
      </PrivacyCard>
      <p className="text-xs text-muted-foreground">
        {t("privacyNoticeVersion", { version: analyticsConfig.noticeVersion })}
      </p>
    </main>
  )
}

function PrivacyCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

export { PrivacyWorkspace }
