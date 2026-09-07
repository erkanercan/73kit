"use client"

import { BarChart3Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useAnalytics } from "@/components/analytics/analytics-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { analyticsConfig } from "@/lib/analytics/config"

function AnalyticsNotice() {
  const analytics = useAnalytics()
  const t = useTranslations()
  const visible =
    analytics.configured &&
    analytics.resolved &&
    analytics.storageAvailable &&
    !analytics.privacySignal &&
    analytics.preference !== "disabled" &&
    analytics.noticeVersion < analyticsConfig.noticeVersion

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-4">
      <Alert className="pointer-events-auto mx-auto max-w-3xl bg-background shadow-lg">
        <BarChart3Icon aria-hidden="true" />
        <AlertTitle>{t("analyticsNoticeTitle")}</AlertTitle>
        <AlertDescription>
          <p>
            {t(
              analyticsConfig.mode === "notice-opt-out"
                ? "analyticsNoticeOptOutDescription"
                : "analyticsNoticeOptInDescription"
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {analyticsConfig.mode === "notice-opt-out" ? (
              <>
                <Button size="sm" onClick={analytics.acknowledgeNotice}>
                  {t("analyticsContinue")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analytics.setPreference("disabled")}
                >
                  {t("analyticsTurnOff")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analytics.setPreference("enabled")}
                >
                  {t("analyticsAllow")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analytics.setPreference("disabled")}
                >
                  {t("analyticsContinueWithout")}
                </Button>
              </>
            )}
            <Link
              href="/privacy"
              className={buttonVariants({ size: "sm", variant: "link" })}
            >
              {t("analyticsPrivacyDetails")}
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export { AnalyticsNotice }
