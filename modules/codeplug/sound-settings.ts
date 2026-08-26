import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000

const ADDRESS = {
  aiNoiseReduction: 0x1540c,
  aiVox: 0x1540d,
  aiVoxSensitivity: 0x1540e,
  aiVoxDelaySeconds: 0x1540f,
  keyBeep: 0x1541a,
  lowBatteryBeep: 0x1541b,
  callBeep: 0x1541d,
  microphoneGain: 0x1541e,
  powerOnBeep: 0x1541f,
  scanPauseBeep: 0x15426,
  amAnalogGain: 0x15427,
  amDigitalGain: 0x15428,
  amNAnalogGain: 0x15429,
  txTimeoutBeep: 0x1542a,
  amNDigitalGain: 0x1542f,
  scanStartBeep: 0x15446,
  scanStopBeep: 0x15447,
} as const

const SOUND_SETTING_OPTIONS = Object.freeze({
  microphoneGains: [
    "low",
    "medium",
    "high",
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
  ] as const,
  aiVoxSensitivities: ["low", "medium", "high", "very-high"] as const,
  aiVoxDelaySeconds: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const,
  analogRxGains: Object.freeze(Array.from({ length: 16 }, (_, value) => value)),
  digitalRxGainsDb: Object.freeze(
    Array.from({ length: 64 }, (_, raw) => (raw - 52) / 2)
  ),
})

type SettingValue<Value> = Value | UnknownSettingValue
type OptionValue<Values extends readonly unknown[]> = Values[number]
type BooleanSetting = SettingValue<boolean>

interface SoundSettings {
  readonly keyBeep: BooleanSetting
  readonly lowBatteryBeep: BooleanSetting
  readonly powerOnBeep: BooleanSetting
  readonly txTimeoutBeep: BooleanSetting
  readonly callStartBeep: boolean
  readonly callEndBeep: boolean
  readonly scanStartBeep: BooleanSetting
  readonly scanPauseBeep: BooleanSetting
  readonly scanStopBeep: BooleanSetting
  readonly microphoneGain: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.microphoneGains>
  >
  readonly amAnalogGain: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.analogRxGains>
  >
  readonly amDigitalGain: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.digitalRxGainsDb>
  >
  readonly amNAnalogGain: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.analogRxGains>
  >
  readonly amNDigitalGain: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.digitalRxGainsDb>
  >
  readonly aiVox: BooleanSetting
  readonly aiVoxSensitivity: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.aiVoxSensitivities>
  >
  readonly aiVoxDelaySeconds: SettingValue<
    OptionValue<typeof SOUND_SETTING_OPTIONS.aiVoxDelaySeconds>
  >
  readonly aiNoiseReduction: BooleanSetting
}

type SoundSettingsPatch = {
  readonly [Field in keyof SoundSettings]?: Exclude<
    SoundSettings[Field],
    UnknownSettingValue
  >
}

function decodeSoundSettings(bytes: Uint8Array): SoundSettings {
  const read = (address: number) => bytes[toCodeplugOffset(address)]
  const callBeep = read(ADDRESS.callBeep)

  return Object.freeze({
    keyBeep: decodeBoolean(read(ADDRESS.keyBeep)),
    lowBatteryBeep: decodeBoolean(read(ADDRESS.lowBatteryBeep)),
    powerOnBeep: decodeBoolean(read(ADDRESS.powerOnBeep)),
    txTimeoutBeep: decodeBoolean(read(ADDRESS.txTimeoutBeep)),
    callStartBeep: (callBeep & 0b0000_0001) !== 0,
    callEndBeep: (callBeep & 0b0000_0010) !== 0,
    scanStartBeep: decodeBoolean(read(ADDRESS.scanStartBeep)),
    scanPauseBeep: decodeBoolean(read(ADDRESS.scanPauseBeep)),
    scanStopBeep: decodeBoolean(read(ADDRESS.scanStopBeep)),
    microphoneGain: decodeIndex(
      read(ADDRESS.microphoneGain),
      SOUND_SETTING_OPTIONS.microphoneGains
    ),
    amAnalogGain: decodeIndex(
      read(ADDRESS.amAnalogGain),
      SOUND_SETTING_OPTIONS.analogRxGains
    ),
    amDigitalGain: decodeIndex(
      read(ADDRESS.amDigitalGain),
      SOUND_SETTING_OPTIONS.digitalRxGainsDb
    ),
    amNAnalogGain: decodeIndex(
      read(ADDRESS.amNAnalogGain),
      SOUND_SETTING_OPTIONS.analogRxGains
    ),
    amNDigitalGain: decodeIndex(
      read(ADDRESS.amNDigitalGain),
      SOUND_SETTING_OPTIONS.digitalRxGainsDb
    ),
    aiVox: decodeBoolean(read(ADDRESS.aiVox)),
    aiVoxSensitivity: decodeIndex(
      read(ADDRESS.aiVoxSensitivity),
      SOUND_SETTING_OPTIONS.aiVoxSensitivities
    ),
    aiVoxDelaySeconds: decodeIndex(
      read(ADDRESS.aiVoxDelaySeconds),
      SOUND_SETTING_OPTIONS.aiVoxDelaySeconds
    ),
    aiNoiseReduction: decodeBoolean(read(ADDRESS.aiNoiseReduction)),
  })
}

function editSoundSettingsBytes(source: Uint8Array, patch: SoundSettingsPatch) {
  const bytes = source.slice()

  for (const field of Object.keys(patch) as (keyof SoundSettingsPatch)[]) {
    const value = patch[field]
    if (value === undefined) continue

    switch (field) {
      case "keyBeep":
      case "lowBatteryBeep":
      case "powerOnBeep":
      case "txTimeoutBeep":
      case "scanStartBeep":
      case "scanPauseBeep":
      case "scanStopBeep":
      case "aiVox":
      case "aiNoiseReduction":
        writeBoolean(bytes, ADDRESS[field], value)
        break
      case "callStartBeep":
        writeBitBoolean(bytes, ADDRESS.callBeep, 0, value)
        break
      case "callEndBeep":
        writeBitBoolean(bytes, ADDRESS.callBeep, 1, value)
        break
      case "microphoneGain":
        writeIndex(
          bytes,
          ADDRESS.microphoneGain,
          SOUND_SETTING_OPTIONS.microphoneGains,
          value
        )
        break
      case "amAnalogGain":
      case "amNAnalogGain":
        writeIndex(
          bytes,
          ADDRESS[field],
          SOUND_SETTING_OPTIONS.analogRxGains,
          value
        )
        break
      case "amDigitalGain":
      case "amNDigitalGain":
        writeIndex(
          bytes,
          ADDRESS[field],
          SOUND_SETTING_OPTIONS.digitalRxGainsDb,
          value
        )
        break
      case "aiVoxSensitivity":
        writeIndex(
          bytes,
          ADDRESS.aiVoxSensitivity,
          SOUND_SETTING_OPTIONS.aiVoxSensitivities,
          value
        )
        break
      case "aiVoxDelaySeconds":
        writeIndex(
          bytes,
          ADDRESS.aiVoxDelaySeconds,
          SOUND_SETTING_OPTIONS.aiVoxDelaySeconds,
          value
        )
        break
    }
  }

  return bytes
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function decodeBoolean(raw: number): BooleanSetting {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function writeIndex(
  bytes: Uint8Array,
  address: number,
  values: readonly unknown[],
  value: unknown
) {
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError("Unsupported Sound Setting value")
  bytes[toCodeplugOffset(address)] = index
}

function writeBoolean(bytes: Uint8Array, address: number, value: unknown) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Sound Setting switch must be boolean")
  }
  bytes[toCodeplugOffset(address)] = value ? 1 : 0
}

function writeBitBoolean(
  bytes: Uint8Array,
  address: number,
  bit: number,
  value: unknown
) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Sound Setting flag must be boolean")
  }
  const offset = toCodeplugOffset(address)
  const mask = 1 << bit
  bytes[offset] = value ? bytes[offset] | mask : bytes[offset] & ~mask
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function toCodeplugOffset(absoluteAddress: number) {
  return absoluteAddress - CODEPLUG_FLASH_START
}

export { SOUND_SETTING_OPTIONS, decodeSoundSettings, editSoundSettingsBytes }
export type { SoundSettings, SoundSettingsPatch }
