type UpdateStepState = "complete" | "active" | "upcoming"
type UpdateReadinessState = "checking" | "available" | "unsupported"
type NavigationItemState = "available" | "planned" | "locked"

function getNavigationItemState({
  planned,
  disabled,
}: {
  readonly planned: boolean
  readonly disabled: boolean
}): NavigationItemState {
  if (planned) return "planned"
  if (disabled) return "locked"
  return "available"
}

function getUpdateStepState(phase: string, step: number): UpdateStepState {
  if (phase === "complete") return "complete"

  const activeStep =
    phase === "idle" || phase === "validating-package" || phase === "failed"
      ? 1
      : phase === "ready" ||
          [
            "connecting",
            "handshake",
            "transferring",
            "verifying",
            "finalizing",
          ].includes(phase)
        ? 2
        : 3

  if (step < activeStep) return "complete"
  return step === activeStep ? "active" : "upcoming"
}

function getUpdateReadiness(
  capability: string,
  preparationReady: boolean
): { readonly state: UpdateReadinessState; readonly canStart: boolean } {
  const state: UpdateReadinessState =
    capability === "checking"
      ? "checking"
      : capability === "available"
        ? "available"
        : "unsupported"

  return {
    state,
    canStart: state === "available" && preparationReady,
  }
}

export { getNavigationItemState, getUpdateReadiness, getUpdateStepState }
export type { NavigationItemState, UpdateReadinessState, UpdateStepState }
