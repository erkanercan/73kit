import type { UpdatePackageSummary } from "../update-package/index.ts"

interface UpdateAcknowledgements {
  readonly backupReady: boolean
  readonly stablePower: boolean
  readonly bootModeReady: boolean
  readonly languagePrerequisiteReady: boolean
  readonly betaRiskAccepted: boolean
}

function isUpdatePreparationConfirmed(
  updatePackage: UpdatePackageSummary,
  acknowledgements: UpdateAcknowledgements
) {
  if (updatePackage.releaseStatus === "disabled") return false
  return (
    acknowledgements.backupReady &&
    acknowledgements.stablePower &&
    acknowledgements.bootModeReady &&
    (!updatePackage.prerequisites.some(
      (prerequisite) => prerequisite.kind === "language"
    ) ||
      acknowledgements.languagePrerequisiteReady) &&
    (updatePackage.releaseStatus !== "beta" ||
      acknowledgements.betaRiskAccepted)
  )
}

export { isUpdatePreparationConfirmed }
export type { UpdateAcknowledgements }
