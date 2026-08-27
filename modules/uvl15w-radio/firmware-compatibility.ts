const VALIDATED_FIRMWARE_VERSIONS = Object.freeze(["3.07.23"] as const)

type UnsupportedFirmwareReason =
  "older" | "unvalidated" | "newer-unvalidated" | "unrecognized"

type FirmwareCompatibility =
  | {
      readonly status: "supported"
      readonly detectedVersion: string
      readonly normalizedVersion: string
      readonly validatedVersions: readonly string[]
    }
  | {
      readonly status: "unsupported"
      readonly detectedVersion: string
      readonly normalizedVersion: string | null
      readonly validatedVersions: readonly string[]
      readonly reason: UnsupportedFirmwareReason
    }

interface FirmwareVersion {
  readonly major: number
  readonly minor: number
  readonly patch: number
}

const VALIDATED_FIRMWARE: readonly {
  readonly label: string
  readonly parsed: FirmwareVersion
}[] = VALIDATED_FIRMWARE_VERSIONS.flatMap((label) => {
  const parsed = parseFirmwareVersion(label)
  return parsed ? [{ label, parsed }] : []
}).sort((left, right) => compareFirmwareVersions(left.parsed, right.parsed))

const VALIDATED_VERSION_LABELS = Object.freeze(
  VALIDATED_FIRMWARE.map(({ label }) => label)
)

function evaluateFirmwareCompatibility(
  detectedVersion: string
): FirmwareCompatibility {
  const parsed = parseFirmwareVersion(detectedVersion)
  const validatedVersions = VALIDATED_VERSION_LABELS

  if (!parsed || VALIDATED_FIRMWARE.length === 0) {
    return Object.freeze({
      status: "unsupported",
      detectedVersion,
      normalizedVersion: null,
      validatedVersions,
      reason: "unrecognized",
    })
  }

  const normalizedVersion = formatFirmwareVersion(parsed)
  const supported = VALIDATED_FIRMWARE.some(
    ({ parsed: validated }) => compareFirmwareVersions(parsed, validated) === 0
  )

  if (supported) {
    return Object.freeze({
      status: "supported",
      detectedVersion,
      normalizedVersion,
      validatedVersions,
    })
  }

  const earliest = VALIDATED_FIRMWARE[0]?.parsed
  const latest = VALIDATED_FIRMWARE.at(-1)?.parsed
  const reason =
    earliest && compareFirmwareVersions(parsed, earliest) < 0
      ? "older"
      : latest && compareFirmwareVersions(parsed, latest) > 0
        ? "newer-unvalidated"
        : "unvalidated"

  return Object.freeze({
    status: "unsupported",
    detectedVersion,
    normalizedVersion,
    validatedVersions,
    reason,
  })
}

function parseFirmwareVersion(value: string): FirmwareVersion | null {
  const match = /^[vV]?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) {
    return null
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])

  if (![major, minor, patch].every(Number.isSafeInteger)) {
    return null
  }

  return Object.freeze({ major, minor, patch })
}

function compareFirmwareVersions(
  left: FirmwareVersion,
  right: FirmwareVersion
) {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  )
}

function formatFirmwareVersion(version: FirmwareVersion) {
  return [
    String(version.major),
    String(version.minor).padStart(2, "0"),
    String(version.patch).padStart(2, "0"),
  ].join(".")
}

export { evaluateFirmwareCompatibility }
export type { FirmwareCompatibility, UnsupportedFirmwareReason }
