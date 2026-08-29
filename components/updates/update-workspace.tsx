"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  useUpdateCoordinator,
  type UpdateCoordinatorPhase,
} from "@/components/update-coordinator-provider"
import { PackageSelection } from "@/components/updates/package-selection"
import { PreparationChecklist } from "@/components/updates/preparation-checklist"
import { ActiveTransfer } from "@/components/updates/transfer-progress"
import { UpdateSupportReport } from "@/components/updates/update-support-report"
import { UpdateBetaDialog } from "@/components/updates/update-beta-dialog"
import {
  CompletedUpdate,
  UnknownOutcome,
  VerifyInstallation,
} from "@/components/updates/verification"
import { PageHeader } from "@/components/page-header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { getUpdateStepState } from "@/modules/update-presentation/index"

function UpdateWorkspace() {
  const coordinator = useUpdateCoordinator()
  const t = useTranslations()
  const [betaAcknowledged, setBetaAcknowledged] = React.useState(false)

  return (
    <>
      <UpdateBetaDialog
        open={!betaAcknowledged}
        onAcknowledge={() => setBetaAcknowledged(true)}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("updatesTitle")} />
        <UpdateSteps phase={coordinator.phase} />

        {coordinator.recoveryRecord && !coordinator.recoveryRetryPrepared ? (
          <UnknownOutcome />
        ) : coordinator.phase === "complete" ? (
          <CompletedUpdate />
        ) : coordinator.phase === "awaiting-restart" ||
          coordinator.phase === "verifying-installation" ? (
          <VerifyInstallation />
        ) : coordinator.busy && coordinator.phase !== "validating-package" ? (
          <ActiveTransfer />
        ) : (
          <div className="flex flex-col gap-5">
            <PackageSelection />
            {coordinator.selectedPackage && (
              <PreparationChecklist betaRiskAccepted={betaAcknowledged} />
            )}
          </div>
        )}
        <UpdateSupportReport />
      </main>
    </>
  )
}

function UpdateSteps({ phase }: { readonly phase: UpdateCoordinatorPhase }) {
  const t = useTranslations()

  return (
    <div aria-label={t("updatesStepsLabel")} className="grid grid-cols-3 gap-3">
      {[
        t("updatesStepPackage"),
        t("updatesStepTransfer"),
        t("updatesStepVerify"),
      ].map((title, index) => {
        const number = index + 1
        const state = getUpdateStepState(phase, number)
        return (
          <Card
            key={title}
            size="sm"
            aria-current={state === "active" ? "step" : undefined}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex min-w-4 justify-center">
                  {state === "complete" ? (
                    <>
                      <CheckIcon aria-hidden="true" />
                      <span className="sr-only">
                        {t("updatesStepComplete")}
                      </span>
                    </>
                  ) : (
                    number
                  )}
                </span>
                {title}
              </CardTitle>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}

export { UpdateWorkspace }
