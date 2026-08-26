import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000

const SHORT_PRESS_ACTIONS = [
  "none",
  "voice-control",
  "send-beacon",
  "squelch-off",
  "scan",
  "scrambler",
  "talk-around",
  "noise-reduction",
  "one-key-frequency-copy",
  "power-level",
  "reverse",
  "fm-radio",
  "channel-mode",
  "emergency-alarm",
  "aprs-stations",
  "squelch-level",
  "tone-scan",
  "gps",
  "gps-position",
  "gps-satellites",
  "bluetooth",
  "zone-selection",
  "scan-list-selection",
  "spectrum",
  "copy-to-mr",
  "monitor",
  "debug-information",
] as const

const LONG_PRESS_ACTIONS = [
  "none",
  "voice-control",
  "send-tone-burst",
  "send-beacon",
  "squelch-off",
  "scan",
  "scrambler",
  "talk-around",
  "noise-reduction",
  "one-key-frequency-copy",
  "power-level",
  "reverse",
  "fm-radio",
  "channel-mode",
  "emergency-alarm",
  "aprs-stations",
  "squelch-level",
  "tone-scan",
  "gps",
  "gps-position",
  "gps-satellites",
  "bluetooth",
  "zone-selection",
  "scan-list-selection",
  "spectrum",
  "copy-to-mr",
  "monitor",
  "debug-information",
] as const

const LOCK_TYPES = [
  "keys",
  "encoder",
  "keys-and-encoder",
  "ptt",
  "ptt-and-keys",
  "ptt-and-encoder",
  "ptt-encoder-and-keys",
] as const

const LOCK_DELAYS_SECONDS = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 35, 40, 45, 50, 55,
  60, 120, 180, 240, 300, 360, 420, 480, 540, 600,
] as const

const ADDRESS = {
  sideKey1ShortPress: 0x15410,
  sideKey1LongPress: 0x15411,
  sideKey2ShortPress: 0x15412,
  sideKey2LongPress: 0x15413,
  topKeyShortPress: 0x15414,
  topKeyLongPress: 0x15415,
  autoLock: 0x15420,
  lockType: 0x15421,
  lockDelaySeconds: 0x15422,
  digit0LongPress: 0x15450,
  digit1LongPress: 0x15451,
  digit2LongPress: 0x15452,
  digit3LongPress: 0x15453,
  digit4LongPress: 0x15454,
  digit5LongPress: 0x15455,
  digit6LongPress: 0x15456,
  digit7LongPress: 0x15457,
  digit8LongPress: 0x15458,
  digit9LongPress: 0x15459,
  menuKeyLongPress: 0x1545a,
  backKeyLongPress: 0x1545b,
} as const

const KEYBOARD_SETTING_OPTIONS = Object.freeze({
  shortPressActions: SHORT_PRESS_ACTIONS,
  longPressActions: LONG_PRESS_ACTIONS,
  lockTypes: LOCK_TYPES,
  lockDelaySeconds: LOCK_DELAYS_SECONDS,
})

type SettingValue<Value> = Value | UnknownSettingValue
type ShortPressAction = (typeof SHORT_PRESS_ACTIONS)[number]
type LongPressAction = (typeof LONG_PRESS_ACTIONS)[number]
type LockType = (typeof LOCK_TYPES)[number]
type LockDelaySeconds = (typeof LOCK_DELAYS_SECONDS)[number]

interface KeyboardSettings {
  readonly sideKey1ShortPress: SettingValue<ShortPressAction>
  readonly sideKey1LongPress: SettingValue<LongPressAction>
  readonly sideKey2ShortPress: SettingValue<ShortPressAction>
  readonly sideKey2LongPress: SettingValue<LongPressAction>
  readonly topKeyShortPress: SettingValue<ShortPressAction>
  readonly topKeyLongPress: SettingValue<LongPressAction>
  readonly digit0LongPress: SettingValue<LongPressAction>
  readonly digit1LongPress: SettingValue<LongPressAction>
  readonly digit2LongPress: SettingValue<LongPressAction>
  readonly digit3LongPress: SettingValue<LongPressAction>
  readonly digit4LongPress: SettingValue<LongPressAction>
  readonly digit5LongPress: SettingValue<LongPressAction>
  readonly digit6LongPress: SettingValue<LongPressAction>
  readonly digit7LongPress: SettingValue<LongPressAction>
  readonly digit8LongPress: SettingValue<LongPressAction>
  readonly digit9LongPress: SettingValue<LongPressAction>
  readonly menuKeyLongPress: SettingValue<LongPressAction>
  readonly backKeyLongPress: SettingValue<LongPressAction>
  readonly autoLock: SettingValue<boolean>
  readonly lockType: SettingValue<LockType>
  readonly lockDelaySeconds: SettingValue<LockDelaySeconds>
}

type KeyboardSettingsPatch = {
  readonly [Field in keyof KeyboardSettings]?: Exclude<
    KeyboardSettings[Field],
    UnknownSettingValue
  >
}

function decodeKeyboardSettings(bytes: Uint8Array): KeyboardSettings {
  const read = (field: keyof typeof ADDRESS) =>
    bytes[toCodeplugOffset(ADDRESS[field])]
  const shortAction = (field: keyof typeof ADDRESS) =>
    decodeIndex(read(field), SHORT_PRESS_ACTIONS)
  const longAction = (field: keyof typeof ADDRESS) =>
    decodeIndex(read(field), LONG_PRESS_ACTIONS)

  return Object.freeze({
    sideKey1ShortPress: shortAction("sideKey1ShortPress"),
    sideKey1LongPress: longAction("sideKey1LongPress"),
    sideKey2ShortPress: shortAction("sideKey2ShortPress"),
    sideKey2LongPress: longAction("sideKey2LongPress"),
    topKeyShortPress: shortAction("topKeyShortPress"),
    topKeyLongPress: longAction("topKeyLongPress"),
    digit0LongPress: longAction("digit0LongPress"),
    digit1LongPress: longAction("digit1LongPress"),
    digit2LongPress: longAction("digit2LongPress"),
    digit3LongPress: longAction("digit3LongPress"),
    digit4LongPress: longAction("digit4LongPress"),
    digit5LongPress: longAction("digit5LongPress"),
    digit6LongPress: longAction("digit6LongPress"),
    digit7LongPress: longAction("digit7LongPress"),
    digit8LongPress: longAction("digit8LongPress"),
    digit9LongPress: longAction("digit9LongPress"),
    menuKeyLongPress: longAction("menuKeyLongPress"),
    backKeyLongPress: longAction("backKeyLongPress"),
    autoLock: decodeBoolean(read("autoLock")),
    lockType: decodeIndex(read("lockType"), LOCK_TYPES),
    lockDelaySeconds: decodeIndex(
      read("lockDelaySeconds"),
      LOCK_DELAYS_SECONDS
    ),
  })
}

function editKeyboardSettingsBytes(
  source: Uint8Array,
  patch: KeyboardSettingsPatch
) {
  const bytes = source.slice()

  for (const field of Object.keys(patch) as (keyof KeyboardSettingsPatch)[]) {
    const value = patch[field]
    if (value === undefined) continue

    switch (field) {
      case "sideKey1ShortPress":
      case "sideKey2ShortPress":
      case "topKeyShortPress":
        writeIndex(bytes, ADDRESS[field], SHORT_PRESS_ACTIONS, value)
        break
      case "sideKey1LongPress":
      case "sideKey2LongPress":
      case "topKeyLongPress":
      case "digit0LongPress":
      case "digit1LongPress":
      case "digit2LongPress":
      case "digit3LongPress":
      case "digit4LongPress":
      case "digit5LongPress":
      case "digit6LongPress":
      case "digit7LongPress":
      case "digit8LongPress":
      case "digit9LongPress":
      case "menuKeyLongPress":
      case "backKeyLongPress":
        writeIndex(bytes, ADDRESS[field], LONG_PRESS_ACTIONS, value)
        break
      case "autoLock":
        writeBoolean(bytes, ADDRESS.autoLock, value)
        break
      case "lockType":
        writeIndex(bytes, ADDRESS.lockType, LOCK_TYPES, value)
        break
      case "lockDelaySeconds":
        writeIndex(bytes, ADDRESS.lockDelaySeconds, LOCK_DELAYS_SECONDS, value)
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

function decodeBoolean(raw: number): SettingValue<boolean> {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function writeIndex(
  bytes: Uint8Array,
  address: number,
  values: readonly unknown[],
  value: unknown
) {
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError("Unsupported Keyboard Setting value")
  bytes[toCodeplugOffset(address)] = index
}

function writeBoolean(bytes: Uint8Array, address: number, value: unknown) {
  if (typeof value !== "boolean") {
    throw new RangeError("A Keyboard Setting switch must be boolean")
  }
  bytes[toCodeplugOffset(address)] = value ? 1 : 0
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function toCodeplugOffset(absoluteAddress: number) {
  return absoluteAddress - CODEPLUG_FLASH_START
}

export {
  KEYBOARD_SETTING_OPTIONS,
  decodeKeyboardSettings,
  editKeyboardSettingsBytes,
}
export type {
  KeyboardSettings,
  KeyboardSettingsPatch,
  LockDelaySeconds,
  LockType,
  LongPressAction,
  ShortPressAction,
}
