import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const GPS_SETTINGS_ADDRESS = 0x15401
const GPS_SETTINGS_OFFSET = GPS_SETTINGS_ADDRESS - CODEPLUG_FLASH_START

const GPS_CONSTELLATIONS = ["gps", "bds", "glonass"] as const
const GPS_TIMEZONE_OFFSETS_MINUTES = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180, -120,
  -60, 0, 60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 540,
  570, 600, 630, 660, 720, 765, 780, 840,
] as const

type GpsConstellation = (typeof GPS_CONSTELLATIONS)[number]
type GpsTimezoneOffsetMinutes = (typeof GPS_TIMEZONE_OFFSETS_MINUTES)[number]
type SettingValue<Value> = Value | UnknownSettingValue

interface GpsSettings {
  readonly enabled: SettingValue<boolean>
  readonly constellations: SettingValue<readonly GpsConstellation[]>
  readonly timezoneOffsetMinutes: SettingValue<GpsTimezoneOffsetMinutes>
}

type GpsSettingsPatch = {
  readonly [Field in keyof GpsSettings]?: Exclude<
    GpsSettings[Field],
    UnknownSettingValue
  >
}

const GPS_SETTING_OPTIONS = Object.freeze({
  constellations: GPS_CONSTELLATIONS,
  timezoneOffsetsMinutes: GPS_TIMEZONE_OFFSETS_MINUTES,
})

function decodeGpsSettings(bytes: Uint8Array): GpsSettings {
  return Object.freeze({
    enabled: decodeBoolean(bytes[GPS_SETTINGS_OFFSET]),
    constellations: decodeConstellations(bytes[GPS_SETTINGS_OFFSET + 1]),
    timezoneOffsetMinutes: decodeIndex(
      bytes[GPS_SETTINGS_OFFSET + 2],
      GPS_TIMEZONE_OFFSETS_MINUTES
    ),
  })
}

function editGpsSettingsBytes(source: Uint8Array, patch: GpsSettingsPatch) {
  const bytes = source.slice()

  if (patch.enabled !== undefined) {
    if (typeof patch.enabled !== "boolean") {
      throw new RangeError("The GPS switch must be boolean")
    }
    bytes[GPS_SETTINGS_OFFSET] = patch.enabled ? 1 : 0
  }

  if (patch.constellations !== undefined) {
    bytes[GPS_SETTINGS_OFFSET + 1] = encodeConstellations(patch.constellations)
  }

  if (patch.timezoneOffsetMinutes !== undefined) {
    const index = GPS_TIMEZONE_OFFSETS_MINUTES.indexOf(
      patch.timezoneOffsetMinutes
    )
    if (index === -1) {
      throw new RangeError("Unsupported GPS time-zone offset")
    }
    bytes[GPS_SETTINGS_OFFSET + 2] = index
  }

  return bytes
}

function decodeBoolean(raw: number): SettingValue<boolean> {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function decodeConstellations(
  raw: number
): SettingValue<readonly GpsConstellation[]> {
  if (raw > 6) return unknownValue(raw)

  const mask = raw + 1
  return Object.freeze(
    GPS_CONSTELLATIONS.filter((_, index) => (mask & (1 << index)) !== 0)
  )
}

function encodeConstellations(values: readonly GpsConstellation[]) {
  if (values.length === 0) {
    throw new RangeError("At least one GPS constellation must be enabled")
  }

  let mask = 0
  for (const value of values) {
    const index = GPS_CONSTELLATIONS.indexOf(value)
    if (index === -1) {
      throw new RangeError("Unsupported GPS constellation")
    }
    mask |= 1 << index
  }

  return mask - 1
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

export {
  GPS_SETTING_OPTIONS,
  GPS_SETTINGS_ADDRESS,
  GPS_SETTINGS_OFFSET,
  decodeGpsSettings,
  editGpsSettingsBytes,
}
export type {
  GpsConstellation,
  GpsSettings,
  GpsSettingsPatch,
  GpsTimezoneOffsetMinutes,
}
