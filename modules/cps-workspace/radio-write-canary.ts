interface RadioWriteCanaryGate {
  readonly development: boolean
  readonly requested: boolean
}

function canEnableRadioWriteCanary({
  development,
  requested,
}: RadioWriteCanaryGate) {
  return development && requested
}

export { canEnableRadioWriteCanary }
export type { RadioWriteCanaryGate }
