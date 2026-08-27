import { decodeNullPaddedUtf8, readUint32BigEndian } from "./binary.ts"
import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const FM_BROADCAST_CHANNEL_COUNT = 32
const FM_BROADCAST_CHANNEL_RECORD_SIZE = 0x20
const FM_BROADCAST_CHANNEL_NAME_SIZE = 0x18
const FM_BROADCAST_CHANNELS_ADDRESS = 0x13e80
const FM_BROADCAST_CHANNELS_OFFSET =
  FM_BROADCAST_CHANNELS_ADDRESS - CODEPLUG_FLASH_START
const FM_BROADCAST_VALIDITY_ADDRESS = 0x15180
const FM_BROADCAST_VALIDITY_OFFSET =
  FM_BROADCAST_VALIDITY_ADDRESS - CODEPLUG_FLASH_START
const FM_BROADCAST_ENABLED_ADDRESS = 0x15404
const FM_BROADCAST_ENABLED_OFFSET =
  FM_BROADCAST_ENABLED_ADDRESS - CODEPLUG_FLASH_START
const FM_BROADCAST_MODE_ADDRESS = 0x15309
const FM_BROADCAST_MODE_OFFSET =
  FM_BROADCAST_MODE_ADDRESS - CODEPLUG_FLASH_START
const FM_BROADCAST_VFO_FREQUENCY_ADDRESS = 0x15312
const FM_BROADCAST_VFO_FREQUENCY_OFFSET =
  FM_BROADCAST_VFO_FREQUENCY_ADDRESS - CODEPLUG_FLASH_START
const FM_BROADCAST_MIN_FREQUENCY_HZ = 64_000_000
const FM_BROADCAST_MAX_FREQUENCY_HZ = 108_000_000
const FM_BROADCAST_FREQUENCY_STEP_HZ = 100_000
const FM_BROADCAST_DEFAULT_FREQUENCY_HZ = 88_000_000

const FM_BROADCAST_MODES = ["vfo", "memory"] as const

type FmBroadcastMode = (typeof FM_BROADCAST_MODES)[number]
type SettingValue<Value> = Value | UnknownSettingValue

interface FmBroadcastChannel {
  readonly number: number
  readonly valid: boolean
  readonly name: string
  readonly frequencyHz: number
}

interface FmBroadcastSettings {
  readonly enabled: SettingValue<boolean>
  readonly mode: SettingValue<FmBroadcastMode>
  readonly vfoFrequencyHz: SettingValue<number>
}

interface FmBroadcast {
  readonly channels: readonly FmBroadcastChannel[]
  readonly settings: FmBroadcastSettings
}

type FmBroadcastChannelPatch = Partial<
  Pick<FmBroadcastChannel, "valid" | "name" | "frequencyHz">
>

type FmBroadcastSettingsPatch = {
  readonly [Field in keyof FmBroadcastSettings]?: Exclude<
    FmBroadcastSettings[Field],
    UnknownSettingValue
  >
}

const FM_BROADCAST_SETTING_OPTIONS = Object.freeze({
  modes: FM_BROADCAST_MODES,
})

function decodeFmBroadcast(bytes: Uint8Array): FmBroadcast {
  return Object.freeze({
    channels: Object.freeze(
      Array.from({ length: FM_BROADCAST_CHANNEL_COUNT }, (_, number) =>
        decodeChannel(bytes, number)
      )
    ),
    settings: Object.freeze({
      enabled: decodeBoolean(bytes[FM_BROADCAST_ENABLED_OFFSET]),
      mode: decodeMode(bytes[FM_BROADCAST_MODE_OFFSET]),
      vfoFrequencyHz: decodeFrequencySetting(
        readUint32BigEndian(bytes, FM_BROADCAST_VFO_FREQUENCY_OFFSET)
      ),
    }),
  })
}

function editFmBroadcastChannelBytes(
  source: Uint8Array,
  number: number,
  patch: FmBroadcastChannelPatch
) {
  assertChannelNumber(number)
  const bytes = source.slice()
  const recordOffset = channelRecordOffset(number)

  if (patch.valid !== undefined) {
    if (typeof patch.valid !== "boolean") {
      throw new RangeError(
        "The FM Broadcast channel Used value must be boolean"
      )
    }
    writeValidity(bytes, number, patch.valid)
  }

  if (patch.name !== undefined) {
    writeName(bytes, recordOffset + 4, patch.name)
  }

  if (patch.frequencyHz !== undefined) {
    assertFrequency(patch.frequencyHz)
    writeUint32BigEndian(bytes, recordOffset, patch.frequencyHz)
  }

  return bytes
}

function editFmBroadcastSettingsBytes(
  source: Uint8Array,
  patch: FmBroadcastSettingsPatch
) {
  const bytes = source.slice()

  if (patch.enabled !== undefined) {
    if (typeof patch.enabled !== "boolean") {
      throw new RangeError("The FM Broadcast switch must be boolean")
    }
    bytes[FM_BROADCAST_ENABLED_OFFSET] = patch.enabled ? 1 : 0
  }

  if (patch.mode !== undefined) {
    const index = FM_BROADCAST_MODES.indexOf(patch.mode)
    if (index === -1) {
      throw new RangeError("Unsupported FM Broadcast mode")
    }
    bytes[FM_BROADCAST_MODE_OFFSET] = index + 5
  }

  if (patch.vfoFrequencyHz !== undefined) {
    assertFrequency(patch.vfoFrequencyHz)
    writeUint32BigEndian(
      bytes,
      FM_BROADCAST_VFO_FREQUENCY_OFFSET,
      patch.vfoFrequencyHz
    )
  }

  return bytes
}

function decodeChannel(bytes: Uint8Array, number: number): FmBroadcastChannel {
  const recordOffset = channelRecordOffset(number)
  return Object.freeze({
    number,
    valid: readValidity(bytes, number),
    frequencyHz: readUint32BigEndian(bytes, recordOffset),
    name: decodeNullPaddedUtf8(
      bytes.subarray(
        recordOffset + 4,
        recordOffset + 4 + FM_BROADCAST_CHANNEL_NAME_SIZE
      )
    ),
  })
}

function readValidity(bytes: Uint8Array, number: number) {
  return (
    (bytes[FM_BROADCAST_VALIDITY_OFFSET + Math.floor(number / 8)] &
      (1 << (number % 8))) !==
    0
  )
}

function writeValidity(bytes: Uint8Array, number: number, valid: boolean) {
  const offset = FM_BROADCAST_VALIDITY_OFFSET + Math.floor(number / 8)
  const mask = 1 << (number % 8)
  bytes[offset] = valid ? bytes[offset] | mask : bytes[offset] & ~mask
}

function writeName(bytes: Uint8Array, offset: number, value: string) {
  if (value.includes("\0")) {
    throw new RangeError("FM Broadcast channel names cannot contain NUL bytes")
  }
  const encoded = new TextEncoder().encode(value)
  if (encoded.byteLength > FM_BROADCAST_CHANNEL_NAME_SIZE) {
    throw new RangeError(
      `FM Broadcast channel names must fit in ${FM_BROADCAST_CHANNEL_NAME_SIZE} UTF-8 bytes`
    )
  }
  bytes.fill(0, offset, offset + FM_BROADCAST_CHANNEL_NAME_SIZE)
  bytes.set(encoded, offset)
}

function decodeBoolean(raw: number): SettingValue<boolean> {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function decodeMode(raw: number): SettingValue<FmBroadcastMode> {
  return raw === 5 ? "vfo" : raw === 6 ? "memory" : unknownValue(raw)
}

function decodeFrequencySetting(raw: number): SettingValue<number> {
  return isSupportedFrequency(raw) ? raw : unknownValue(raw)
}

function isSupportedFrequency(value: number) {
  return (
    Number.isInteger(value) &&
    value >= FM_BROADCAST_MIN_FREQUENCY_HZ &&
    value <= FM_BROADCAST_MAX_FREQUENCY_HZ &&
    value % FM_BROADCAST_FREQUENCY_STEP_HZ === 0
  )
}

function assertFrequency(value: number) {
  if (!isSupportedFrequency(value)) {
    throw new RangeError(
      "FM Broadcast frequencies must be between 64.0 and 108.0 MHz in 0.1 MHz steps"
    )
  }
}

function assertChannelNumber(number: number) {
  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number >= FM_BROADCAST_CHANNEL_COUNT
  ) {
    throw new RangeError(
      `FM Broadcast channel number must be between 0 and ${FM_BROADCAST_CHANNEL_COUNT - 1}`
    )
  }
}

function channelRecordOffset(number: number) {
  return (
    FM_BROADCAST_CHANNELS_OFFSET + number * FM_BROADCAST_CHANNEL_RECORD_SIZE
  )
}

function writeUint32BigEndian(
  bytes: Uint8Array,
  offset: number,
  value: number
) {
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).setUint32(
    0,
    value,
    false
  )
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

export {
  FM_BROADCAST_CHANNEL_COUNT,
  FM_BROADCAST_CHANNEL_NAME_SIZE,
  FM_BROADCAST_CHANNEL_RECORD_SIZE,
  FM_BROADCAST_CHANNELS_ADDRESS,
  FM_BROADCAST_CHANNELS_OFFSET,
  FM_BROADCAST_DEFAULT_FREQUENCY_HZ,
  FM_BROADCAST_ENABLED_ADDRESS,
  FM_BROADCAST_ENABLED_OFFSET,
  FM_BROADCAST_FREQUENCY_STEP_HZ,
  FM_BROADCAST_MAX_FREQUENCY_HZ,
  FM_BROADCAST_MIN_FREQUENCY_HZ,
  FM_BROADCAST_MODE_ADDRESS,
  FM_BROADCAST_MODE_OFFSET,
  FM_BROADCAST_SETTING_OPTIONS,
  FM_BROADCAST_VALIDITY_ADDRESS,
  FM_BROADCAST_VALIDITY_OFFSET,
  FM_BROADCAST_VFO_FREQUENCY_ADDRESS,
  FM_BROADCAST_VFO_FREQUENCY_OFFSET,
  decodeFmBroadcast,
  editFmBroadcastChannelBytes,
  editFmBroadcastSettingsBytes,
}
export type {
  FmBroadcast,
  FmBroadcastChannel,
  FmBroadcastChannelPatch,
  FmBroadcastMode,
  FmBroadcastSettings,
  FmBroadcastSettingsPatch,
}
