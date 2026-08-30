interface RadioWriteReleasePolicy {
  readonly emergencyDisabled: boolean
}

function isRadioWriteReleased({ emergencyDisabled }: RadioWriteReleasePolicy) {
  return !emergencyDisabled
}

export { isRadioWriteReleased }
export type { RadioWriteReleasePolicy }
