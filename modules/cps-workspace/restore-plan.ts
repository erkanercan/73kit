type RestorePlanEvaluation =
  | { readonly status: "already-current" }
  | { readonly status: "restore-required"; readonly changedByteCount: number }

const RADIO_MANAGED_TAIL_OFFSET = 0x18bc0

function materializeRestoreTarget(
  currentRadioBytes: Uint8Array,
  desiredBytes: Uint8Array
) {
  if (currentRadioBytes.byteLength !== desiredBytes.byteLength) {
    throw new RangeError(
      "Current Radio and desired Codeplug must have the same byte length"
    )
  }
  if (currentRadioBytes.byteLength <= RADIO_MANAGED_TAIL_OFFSET) {
    throw new RangeError("Codeplug does not contain the Radio-managed tail")
  }

  const target = desiredBytes.slice()
  target.set(
    currentRadioBytes.subarray(RADIO_MANAGED_TAIL_OFFSET),
    RADIO_MANAGED_TAIL_OFFSET
  )
  return target
}

function evaluateRestorePlan(
  currentRadioBytes: Uint8Array,
  desiredBytes: Uint8Array
): RestorePlanEvaluation {
  if (currentRadioBytes.byteLength !== desiredBytes.byteLength) {
    throw new RangeError(
      "Current Radio and desired Codeplug must have the same byte length"
    )
  }

  let changedByteCount = 0
  for (let index = 0; index < currentRadioBytes.byteLength; index += 1) {
    if (currentRadioBytes[index] !== desiredBytes[index]) changedByteCount += 1
  }

  return changedByteCount === 0
    ? Object.freeze({ status: "already-current" })
    : Object.freeze({ status: "restore-required", changedByteCount })
}

export {
  RADIO_MANAGED_TAIL_OFFSET,
  evaluateRestorePlan,
  materializeRestoreTarget,
}
export type { RestorePlanEvaluation }
