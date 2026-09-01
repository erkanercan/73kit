import { CODEPLUG_LAYOUT_3_07_23 } from "../codeplug/index.ts"

const RADIO_CAPABILITIES = [
  "radio-information",
  "channels",
  "zones",
  "scan-lists",
  "vfo-scan-edges",
  "radio-settings",
  "aprs",
  "gps",
  "spectrum",
  "bluetooth-settings",
  "fm-radio",
  "signal-system",
  "backups",
  "firmware-updates",
] as const

type RadioCapability = (typeof RADIO_CAPABILITIES)[number]
type FirmwareSupportStatus = "validated" | "not-validated"
type RadioModelId = "tyt-uvl15w"

interface FirmwareSupportProfile {
  readonly id: string
  readonly version: string
  readonly status: FirmwareSupportStatus
  readonly codeplugLayoutId: string | null
}

interface RadioModelDefinition {
  readonly id: RadioModelId
  readonly manufacturer: string
  readonly model: string
  readonly aliases: readonly string[]
  readonly displayName: string
  readonly driverId: string
  readonly capabilities: readonly RadioCapability[]
  readonly firmwareProfiles: readonly FirmwareSupportProfile[]
}

const TYT_UVL15W = Object.freeze({
  id: "tyt-uvl15w",
  manufacturer: "TYT",
  model: "UVL-15W",
  aliases: Object.freeze(["Tekser TR-UV15"]),
  displayName: "TYT UVL-15W / Tekser TR-UV15",
  driverId: "uvl15w-normal-mode-v3",
  capabilities: RADIO_CAPABILITIES,
  firmwareProfiles: Object.freeze([
    Object.freeze({
      id: "tyt-uvl15w-3.07.23",
      version: CODEPLUG_LAYOUT_3_07_23.firmwareVersion,
      status: "validated" as const,
      codeplugLayoutId: CODEPLUG_LAYOUT_3_07_23.id,
    }),
  ]),
}) satisfies RadioModelDefinition

const RADIO_MODELS = Object.freeze([TYT_UVL15W])

function listRadioModels(): readonly RadioModelDefinition[] {
  return RADIO_MODELS
}

function findRadioModel(id: string): RadioModelDefinition | undefined {
  return RADIO_MODELS.find((radio) => radio.id === id)
}

function isRadioModelId(value: string): value is RadioModelId {
  return findRadioModel(value) !== undefined
}

function getRadioModel(id: RadioModelId): RadioModelDefinition {
  const radio = findRadioModel(id)
  if (!radio) throw new Error(`Unknown Radio Model: ${id}`)
  return radio
}

function evaluateFirmwareSupport(
  radioModelId: RadioModelId,
  firmwareVersion: string
): FirmwareSupportProfile {
  const normalizedVersion = firmwareVersion.trim().replace(/^[vV]/, "")
  const profile = getRadioModel(radioModelId).firmwareProfiles.find(
    (candidate) => candidate.version === normalizedVersion
  )

  return (
    profile ??
    Object.freeze({
      id: `${radioModelId}-${normalizedVersion || "unrecognized"}`,
      version: normalizedVersion || firmwareVersion,
      status: "not-validated" as const,
      codeplugLayoutId: null,
    })
  )
}

function radioCpsPath(radioModelId: RadioModelId, suffix = "") {
  const normalizedSuffix = suffix.replace(/^\/+|\/+$/g, "")
  return normalizedSuffix
    ? `/cps/${radioModelId}/${normalizedSuffix}`
    : `/cps/${radioModelId}`
}

export {
  RADIO_CAPABILITIES,
  TYT_UVL15W,
  evaluateFirmwareSupport,
  findRadioModel,
  getRadioModel,
  isRadioModelId,
  listRadioModels,
  radioCpsPath,
}
export type {
  FirmwareSupportProfile,
  FirmwareSupportStatus,
  RadioCapability,
  RadioModelDefinition,
  RadioModelId,
}
