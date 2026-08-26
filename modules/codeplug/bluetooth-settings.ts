import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const BLUETOOTH_SETTINGS_ADDRESS = 0x15440
const BLUETOOTH_SETTINGS_OFFSET =
  BLUETOOTH_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const BLUETOOTH_HOLD_TIME_ADDRESS = 0x1544b
const BLUETOOTH_HOLD_TIME_OFFSET =
  BLUETOOTH_HOLD_TIME_ADDRESS - CODEPLUG_FLASH_START

const BLUETOOTH_ROLES = ["host", "peripheral"] as const
const BLUETOOTH_GAIN_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const
const BLUETOOTH_HOLD_TIMES = [
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
  12,
  14,
  16,
  18,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  70,
  80,
  90,
  100,
  110,
  120,
  150,
  180,
  210,
  240,
  270,
  300,
  "infinite",
] as const

type BluetoothRole = (typeof BLUETOOTH_ROLES)[number]
type BluetoothGainLevel = (typeof BLUETOOTH_GAIN_LEVELS)[number]
type BluetoothHoldTime = (typeof BLUETOOTH_HOLD_TIMES)[number]
type SettingValue<Value> = Value | UnknownSettingValue
type BooleanSetting = SettingValue<boolean>

interface BluetoothSettings {
  readonly enabled: BooleanSetting
  readonly role: SettingValue<BluetoothRole>
  readonly localSpeaker: BooleanSetting
  readonly localMicrophone: BooleanSetting
  readonly speakerGainLevel: SettingValue<BluetoothGainLevel>
  readonly microphoneGainLevel: SettingValue<BluetoothGainLevel>
  readonly holdTime: SettingValue<BluetoothHoldTime>
}

type BluetoothSettingsPatch = {
  readonly [Field in keyof BluetoothSettings]?: Exclude<
    BluetoothSettings[Field],
    UnknownSettingValue
  >
}

const BLUETOOTH_SETTING_OPTIONS = Object.freeze({
  roles: BLUETOOTH_ROLES,
  gainLevels: BLUETOOTH_GAIN_LEVELS,
  holdTimes: BLUETOOTH_HOLD_TIMES,
})

function decodeBluetoothSettings(bytes: Uint8Array): BluetoothSettings {
  return Object.freeze({
    enabled: decodeBoolean(bytes[BLUETOOTH_SETTINGS_OFFSET]),
    localMicrophone: decodeBoolean(bytes[BLUETOOTH_SETTINGS_OFFSET + 1]),
    localSpeaker: decodeBoolean(bytes[BLUETOOTH_SETTINGS_OFFSET + 2]),
    microphoneGainLevel: decodeIndex(
      bytes[BLUETOOTH_SETTINGS_OFFSET + 3],
      BLUETOOTH_GAIN_LEVELS
    ),
    speakerGainLevel: decodeIndex(
      bytes[BLUETOOTH_SETTINGS_OFFSET + 4],
      BLUETOOTH_GAIN_LEVELS
    ),
    role: decodeIndex(bytes[BLUETOOTH_SETTINGS_OFFSET + 5], BLUETOOTH_ROLES),
    holdTime: decodeIndex(
      bytes[BLUETOOTH_HOLD_TIME_OFFSET],
      BLUETOOTH_HOLD_TIMES
    ),
  })
}

function editBluetoothSettingsBytes(
  source: Uint8Array,
  patch: BluetoothSettingsPatch
) {
  const bytes = source.slice()

  if (patch.enabled !== undefined) {
    writeBoolean(bytes, BLUETOOTH_SETTINGS_OFFSET, patch.enabled)
  }
  if (patch.localMicrophone !== undefined) {
    writeBoolean(bytes, BLUETOOTH_SETTINGS_OFFSET + 1, patch.localMicrophone)
  }
  if (patch.localSpeaker !== undefined) {
    writeBoolean(bytes, BLUETOOTH_SETTINGS_OFFSET + 2, patch.localSpeaker)
  }
  if (patch.microphoneGainLevel !== undefined) {
    writeIndex(
      bytes,
      BLUETOOTH_SETTINGS_OFFSET + 3,
      BLUETOOTH_GAIN_LEVELS,
      patch.microphoneGainLevel,
      "Bluetooth microphone gain"
    )
  }
  if (patch.speakerGainLevel !== undefined) {
    writeIndex(
      bytes,
      BLUETOOTH_SETTINGS_OFFSET + 4,
      BLUETOOTH_GAIN_LEVELS,
      patch.speakerGainLevel,
      "Bluetooth speaker gain"
    )
  }
  if (patch.role !== undefined) {
    writeIndex(
      bytes,
      BLUETOOTH_SETTINGS_OFFSET + 5,
      BLUETOOTH_ROLES,
      patch.role,
      "Bluetooth role"
    )
  }
  if (patch.holdTime !== undefined) {
    writeIndex(
      bytes,
      BLUETOOTH_HOLD_TIME_OFFSET,
      BLUETOOTH_HOLD_TIMES,
      patch.holdTime,
      "Bluetooth hold time"
    )
  }

  return bytes
}

function decodeBoolean(raw: number): BooleanSetting {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function writeBoolean(bytes: Uint8Array, offset: number, value: boolean) {
  if (typeof value !== "boolean") {
    throw new RangeError("The Bluetooth switch value must be boolean")
  }
  bytes[offset] = value ? 1 : 0
}

function writeIndex<const Values extends readonly unknown[]>(
  bytes: Uint8Array,
  offset: number,
  values: Values,
  value: Values[number],
  label: string
) {
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError(`Unsupported ${label}`)
  bytes[offset] = index
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

export {
  BLUETOOTH_SETTING_OPTIONS,
  BLUETOOTH_HOLD_TIME_ADDRESS,
  BLUETOOTH_HOLD_TIME_OFFSET,
  BLUETOOTH_SETTINGS_ADDRESS,
  BLUETOOTH_SETTINGS_OFFSET,
  decodeBluetoothSettings,
  editBluetoothSettingsBytes,
}
export type {
  BluetoothGainLevel,
  BluetoothHoldTime,
  BluetoothRole,
  BluetoothSettings,
  BluetoothSettingsPatch,
}
