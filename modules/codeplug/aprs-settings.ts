import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const APRS_SETTINGS_ADDRESS = 0x15500
const APRS_SETTINGS_OFFSET = APRS_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const APRS_SETTINGS_SIZE = 0x400
const CALLSIGN_BYTES = 6
const COMMENT_BYTES = 64
const TRANSMIT_CHANNEL_COUNT = 8
const TRANSMIT_CHANNEL_BYTES = 10
const DIGIPEATER_COUNT = 8
const DIGIPEATER_ENTRY_BYTES = 7

const APRS_REPORT_KINDS = [
  "mic-e",
  "position",
  "weather",
  "object",
  "item",
  "status",
  "other",
] as const

const APRS_SYMBOL_TABLES = ["primary", "secondary"] as const
const APRS_BEACON_TYPES = ["fixed", "gps"] as const
const APRS_MANUAL_BEACON_MODES = ["off", "ptt-start", "ptt-end"] as const
const APRS_MANUAL_BEACON_BANDS = ["band-a", "band-b", "band-a-b"] as const
const APRS_BANDWIDTHS = ["wide", "narrow"] as const
const APRS_TRANSMIT_POWERS = ["low", "medium", "high"] as const
const APRS_TONE_TYPES = ["none", "ctcss", "dcs"] as const
const APRS_TNC_OUTPUTS = ["off", "rx", "tx", "rx-tx"] as const
const APRS_TNC_FORMATS = ["kiss", "gpwpl", "ui-text"] as const
const APRS_ALTITUDE_UNITS = ["feet", "meters"] as const

const APRS_POPUP_DURATIONS = [
  null,
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
  22,
  24,
  26,
  28,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  "always",
] as const

const APRS_AUTO_BEACON_INTERVALS = [
  null,
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  90,
  120,
  150,
  180,
  210,
  240,
  270,
  300,
  360,
  420,
  480,
  540,
  600,
  720,
  840,
  960,
  1080,
  1200,
  1500,
  1800,
  2100,
  2400,
  2700,
  3000,
  3300,
  3600,
] as const

const APRS_MANUAL_BEACON_INTERVALS = [
  null,
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
  22,
  24,
  26,
  28,
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
  130,
  140,
  150,
  160,
  170,
  180,
  190,
  200,
  210,
  220,
  230,
  240,
  250,
  260,
  270,
  280,
  290,
  300,
] as const

const APRS_CARRIER_DELAYS_MS = [
  30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 210, 240, 270, 300, 350,
  400, 450, 500, 600, 700, 800, 900, 1000,
] as const

type SettingValue<Value> = Value | UnknownSettingValue
type AprsReportKind = (typeof APRS_REPORT_KINDS)[number]
type AprsSymbolTable = (typeof APRS_SYMBOL_TABLES)[number]
type AprsBeaconType = (typeof APRS_BEACON_TYPES)[number]
type AprsManualBeaconMode = (typeof APRS_MANUAL_BEACON_MODES)[number]
type AprsManualBeaconBand = (typeof APRS_MANUAL_BEACON_BANDS)[number]
type AprsBandwidth = (typeof APRS_BANDWIDTHS)[number]
type AprsTransmitPower = (typeof APRS_TRANSMIT_POWERS)[number]
type AprsToneType = (typeof APRS_TONE_TYPES)[number]
type AprsTncOutput = (typeof APRS_TNC_OUTPUTS)[number]
type AprsTncFormat = (typeof APRS_TNC_FORMATS)[number]
type AprsAltitudeUnit = (typeof APRS_ALTITUDE_UNITS)[number]

interface AprsReportSettings {
  readonly decode: SettingValue<boolean>
  readonly popupIndex: SettingValue<number>
  readonly alert: SettingValue<boolean>
}

interface AprsTransmitChannel {
  readonly number: number
  readonly used: boolean
  readonly frequencyHz: number | null
  readonly bandwidth: SettingValue<AprsBandwidth>
  readonly power: SettingValue<AprsTransmitPower>
  readonly toneType: SettingValue<AprsToneType>
  readonly ctcssIndex: number
  readonly dcsIndex: number
}

interface AprsFixedPosition {
  readonly latitude: number | null
  readonly longitude: number | null
  readonly altitudeMeters: number | null
  readonly altitudeUnit: SettingValue<AprsAltitudeUnit>
}

interface AprsDigipeaterEntry {
  readonly callsign: string
  readonly ssid: number
}

interface AprsTncInterfaceSettings {
  readonly output: SettingValue<AprsTncOutput>
  readonly format: SettingValue<AprsTncFormat>
}

interface AprsSettings {
  readonly localCallsign: string
  readonly localSsid: number
  readonly symbolTable: SettingValue<AprsSymbolTable>
  readonly symbolIndex: SettingValue<number>
  readonly decodeCrc: SettingValue<boolean>
  readonly reports: Readonly<Record<AprsReportKind, AprsReportSettings>>
  readonly destinationCallsign: string
  readonly destinationSsid: number
  readonly transmitChannels: readonly AprsTransmitChannel[]
  readonly beaconTransmitChannel: SettingValue<number>
  readonly beaconType: SettingValue<AprsBeaconType>
  readonly automaticBeaconIntervalIndex: SettingValue<number>
  readonly manualBeaconMode: SettingValue<AprsManualBeaconMode>
  readonly fixedPosition: AprsFixedPosition
  readonly preCarrierIndex: SettingValue<number>
  readonly postTransmitDelayIndex: SettingValue<number>
  readonly transmitSidetone: SettingValue<boolean>
  readonly manualBeaconIntervalIndex: SettingValue<number>
  readonly manualBeaconBand: SettingValue<AprsManualBeaconBand>
  readonly rfBeaconTransmission: SettingValue<boolean>
  readonly digipeaterPath: readonly AprsDigipeaterEntry[]
  readonly comment: string
  readonly tncUsb: AprsTncInterfaceSettings
  readonly tncBluetoothSpp: AprsTncInterfaceSettings
  readonly tncBluetoothBle: AprsTncInterfaceSettings
}

type AprsSettingsPatch = Partial<AprsSettings>

const APRS_SETTING_OPTIONS = Object.freeze({
  symbolTables: APRS_SYMBOL_TABLES,
  beaconTypes: APRS_BEACON_TYPES,
  manualBeaconModes: APRS_MANUAL_BEACON_MODES,
  manualBeaconBands: APRS_MANUAL_BEACON_BANDS,
  bandwidths: APRS_BANDWIDTHS,
  transmitPowers: APRS_TRANSMIT_POWERS,
  toneTypes: APRS_TONE_TYPES,
  tncOutputs: APRS_TNC_OUTPUTS,
  tncFormats: APRS_TNC_FORMATS,
  altitudeUnits: APRS_ALTITUDE_UNITS,
  popupDurations: APRS_POPUP_DURATIONS,
  automaticBeaconIntervals: APRS_AUTO_BEACON_INTERVALS,
  manualBeaconIntervals: APRS_MANUAL_BEACON_INTERVALS,
  carrierDelaysMs: APRS_CARRIER_DELAYS_MS,
})

function decodeAprsSettings(bytes: Uint8Array): AprsSettings {
  assertAprsBlock(bytes)
  const offset = APRS_SETTINGS_OFFSET
  const reports = Object.fromEntries(
    APRS_REPORT_KINDS.map((kind, index) => [
      kind,
      Object.freeze({
        decode: decodeBoolean(bytes[offset + 0x0b + index]),
        popupIndex: decodeBoundedIndex(
          bytes[offset + 0x12 + index],
          APRS_POPUP_DURATIONS.length
        ),
        alert: decodeBoolean(bytes[offset + 0x19 + index]),
      }),
    ])
  ) as unknown as Readonly<Record<AprsReportKind, AprsReportSettings>>

  return Object.freeze({
    localCallsign: decodeCallsign(bytes, offset),
    localSsid: bytes[offset + 0x06],
    symbolTable: decodeEnum(bytes[offset + 0x07], APRS_SYMBOL_TABLES),
    symbolIndex: decodeBoundedIndex(bytes[offset + 0x08], 94),
    decodeCrc: decodeBoolean(bytes[offset + 0x20]),
    reports: Object.freeze(reports),
    destinationCallsign: decodeCallsign(bytes, offset + 0x21),
    destinationSsid: bytes[offset + 0x27],
    transmitChannels: Object.freeze(
      Array.from({ length: TRANSMIT_CHANNEL_COUNT }, (_, index) =>
        decodeTransmitChannel(bytes, offset + 0x28, index)
      )
    ),
    beaconTransmitChannel: decodeBoundedIndex(bytes[offset + 0xc8], 8),
    beaconType: decodeEnum(bytes[offset + 0xc9], APRS_BEACON_TYPES),
    automaticBeaconIntervalIndex: decodeBoundedIndex(
      bytes[offset + 0xcb],
      APRS_AUTO_BEACON_INTERVALS.length
    ),
    manualBeaconMode: decodeEnum(
      bytes[offset + 0xca],
      APRS_MANUAL_BEACON_MODES
    ),
    fixedPosition: Object.freeze({
      latitude: decodeCoordinate(bytes, offset + 0xcc),
      longitude: decodeCoordinate(bytes, offset + 0xd4),
      altitudeMeters: decodeScaledValue(bytes, offset + 0xdc),
      altitudeUnit: decodeEnum(bytes[offset + 0xe4], APRS_ALTITUDE_UNITS),
    }),
    preCarrierIndex: decodeBoundedIndex(
      bytes[offset + 0xe5],
      APRS_CARRIER_DELAYS_MS.length
    ),
    postTransmitDelayIndex: decodeBoundedIndex(
      bytes[offset + 0xe6],
      APRS_CARRIER_DELAYS_MS.length
    ),
    transmitSidetone: decodeBoolean(bytes[offset + 0xe7]),
    manualBeaconIntervalIndex: decodeBoundedIndex(
      bytes[offset + 0xe8],
      APRS_MANUAL_BEACON_INTERVALS.length
    ),
    manualBeaconBand: decodeEnum(
      bytes[offset + 0xe9],
      APRS_MANUAL_BEACON_BANDS
    ),
    rfBeaconTransmission: decodeBoolean(bytes[offset + 0xea]),
    digipeaterPath: decodeDigipeaterPath(bytes, offset + 0xff),
    comment: decodeAsciiText(bytes, offset + 0x200, COMMENT_BYTES),
    tncUsb: decodeTnc(bytes, offset + 0x240),
    tncBluetoothSpp: decodeTnc(bytes, offset + 0x242),
    tncBluetoothBle: decodeTnc(bytes, offset + 0x244),
  })
}

function editAprsSettingsBytes(source: Uint8Array, patch: AprsSettingsPatch) {
  assertAprsBlock(source)
  const bytes = source.slice()
  const offset = APRS_SETTINGS_OFFSET

  if (patch.localCallsign !== undefined)
    writeCallsign(bytes, offset, patch.localCallsign)
  if (patch.localSsid !== undefined)
    writeInteger(bytes, offset + 0x06, patch.localSsid, 0, 15, "Local SSID")
  if (patch.symbolTable !== undefined)
    writeEnum(bytes, offset + 0x07, patch.symbolTable, APRS_SYMBOL_TABLES)
  if (patch.symbolIndex !== undefined)
    writeBoundedIndex(bytes, offset + 0x08, patch.symbolIndex, 94, "Symbol")
  if (patch.decodeCrc !== undefined)
    writeBoolean(bytes, offset + 0x20, patch.decodeCrc)
  if (patch.reports !== undefined) writeReports(bytes, offset, patch.reports)
  if (patch.destinationCallsign !== undefined)
    writeCallsign(bytes, offset + 0x21, patch.destinationCallsign)
  if (patch.destinationSsid !== undefined)
    writeInteger(
      bytes,
      offset + 0x27,
      patch.destinationSsid,
      0,
      15,
      "Destination SSID"
    )
  if (patch.transmitChannels !== undefined)
    writeTransmitChannels(bytes, offset + 0x28, patch.transmitChannels)
  if (patch.beaconTransmitChannel !== undefined)
    writeBoundedIndex(
      bytes,
      offset + 0xc8,
      patch.beaconTransmitChannel,
      8,
      "Beacon transmit channel"
    )
  if (patch.beaconType !== undefined)
    writeEnum(bytes, offset + 0xc9, patch.beaconType, APRS_BEACON_TYPES)
  if (patch.manualBeaconMode !== undefined)
    writeEnum(
      bytes,
      offset + 0xca,
      patch.manualBeaconMode,
      APRS_MANUAL_BEACON_MODES
    )
  if (patch.automaticBeaconIntervalIndex !== undefined)
    writeBoundedIndex(
      bytes,
      offset + 0xcb,
      patch.automaticBeaconIntervalIndex,
      APRS_AUTO_BEACON_INTERVALS.length,
      "Automatic beacon interval"
    )
  if (patch.fixedPosition !== undefined)
    writeFixedPosition(bytes, offset, patch.fixedPosition)
  if (patch.preCarrierIndex !== undefined)
    writeBoundedIndex(
      bytes,
      offset + 0xe5,
      patch.preCarrierIndex,
      APRS_CARRIER_DELAYS_MS.length,
      "Pre-carrier"
    )
  if (patch.postTransmitDelayIndex !== undefined)
    writeBoundedIndex(
      bytes,
      offset + 0xe6,
      patch.postTransmitDelayIndex,
      APRS_CARRIER_DELAYS_MS.length,
      "Post-transmit delay"
    )
  if (patch.transmitSidetone !== undefined)
    writeBoolean(bytes, offset + 0xe7, patch.transmitSidetone)
  if (patch.manualBeaconIntervalIndex !== undefined)
    writeBoundedIndex(
      bytes,
      offset + 0xe8,
      patch.manualBeaconIntervalIndex,
      APRS_MANUAL_BEACON_INTERVALS.length,
      "Manual beacon interval"
    )
  if (patch.manualBeaconBand !== undefined)
    writeEnum(
      bytes,
      offset + 0xe9,
      patch.manualBeaconBand,
      APRS_MANUAL_BEACON_BANDS
    )
  if (patch.rfBeaconTransmission !== undefined)
    writeBoolean(bytes, offset + 0xea, patch.rfBeaconTransmission)
  if (patch.digipeaterPath !== undefined)
    writeDigipeaterPath(bytes, offset + 0xff, patch.digipeaterPath)
  if (patch.comment !== undefined)
    writeAsciiText(
      bytes,
      offset + 0x200,
      COMMENT_BYTES,
      patch.comment,
      "Comment"
    )
  if (patch.tncUsb !== undefined) writeTnc(bytes, offset + 0x240, patch.tncUsb)
  if (patch.tncBluetoothSpp !== undefined)
    writeTnc(bytes, offset + 0x242, patch.tncBluetoothSpp)
  if (patch.tncBluetoothBle !== undefined)
    writeTnc(bytes, offset + 0x244, patch.tncBluetoothBle)

  return bytes
}

function decodeTransmitChannel(
  bytes: Uint8Array,
  start: number,
  index: number
): AprsTransmitChannel {
  const offset = start + index * TRANSMIT_CHANNEL_BYTES
  const record = bytes.subarray(offset, offset + TRANSMIT_CHANNEL_BYTES)
  const used = !record.every((byte) => byte === 0xff)

  return Object.freeze({
    number: index,
    used,
    frequencyHz: used ? readUint32BigEndian(bytes, offset) : null,
    bandwidth: used
      ? decodeEnum(bytes[offset + 0x05], APRS_BANDWIDTHS)
      : "wide",
    power: used
      ? decodeEnum(bytes[offset + 0x06], APRS_TRANSMIT_POWERS)
      : "low",
    toneType: used ? decodeEnum(bytes[offset + 0x07], APRS_TONE_TYPES) : "none",
    ctcssIndex: used ? bytes[offset + 0x08] : 0,
    dcsIndex: used ? bytes[offset + 0x09] : 0,
  })
}

function writeTransmitChannels(
  bytes: Uint8Array,
  start: number,
  channels: readonly AprsTransmitChannel[]
) {
  if (channels.length !== TRANSMIT_CHANNEL_COUNT)
    throw new RangeError("APRS must contain exactly eight transmit channels")

  channels.forEach((channel, index) => {
    const offset = start + index * TRANSMIT_CHANNEL_BYTES
    if (!channel.used) {
      bytes.fill(0xff, offset, offset + TRANSMIT_CHANNEL_BYTES)
      return
    }
    if (
      channel.frequencyHz === null ||
      !Number.isInteger(channel.frequencyHz) ||
      channel.frequencyHz < 108_000_000 ||
      channel.frequencyHz > 660_000_000
    ) {
      throw new RangeError("APRS transmit frequency must be 108–660 MHz")
    }
    writeUint32BigEndian(bytes, offset, channel.frequencyHz)
    bytes[offset + 0x04] = 0xff
    writeEnum(bytes, offset + 0x05, channel.bandwidth, APRS_BANDWIDTHS)
    writeEnum(bytes, offset + 0x06, channel.power, APRS_TRANSMIT_POWERS)
    writeEnum(bytes, offset + 0x07, channel.toneType, APRS_TONE_TYPES)
    writeInteger(
      bytes,
      offset + 0x08,
      channel.ctcssIndex,
      0,
      255,
      "CTCSS index"
    )
    writeInteger(bytes, offset + 0x09, channel.dcsIndex, 0, 255, "DCS index")
  })
}

function decodeDigipeaterPath(bytes: Uint8Array, offset: number) {
  const count = Math.min(bytes[offset], DIGIPEATER_COUNT)
  return Object.freeze(
    Array.from({ length: count }, (_, index) => {
      const entryOffset = offset + 1 + index * DIGIPEATER_ENTRY_BYTES
      return Object.freeze({
        callsign: decodeCallsign(bytes, entryOffset),
        ssid: bytes[entryOffset + CALLSIGN_BYTES],
      })
    })
  )
}

function writeDigipeaterPath(
  bytes: Uint8Array,
  offset: number,
  path: readonly AprsDigipeaterEntry[]
) {
  if (path.length > DIGIPEATER_COUNT)
    throw new RangeError("APRS digipeater path supports at most eight entries")
  bytes[offset] = path.length
  bytes.fill(
    0xff,
    offset + 1,
    offset + 1 + DIGIPEATER_COUNT * DIGIPEATER_ENTRY_BYTES
  )
  path.forEach((entry, index) => {
    const entryOffset = offset + 1 + index * DIGIPEATER_ENTRY_BYTES
    writeCallsign(bytes, entryOffset, entry.callsign)
    writeInteger(
      bytes,
      entryOffset + CALLSIGN_BYTES,
      entry.ssid,
      0,
      15,
      "Digipeater SSID"
    )
  })
}

function decodeTnc(bytes: Uint8Array, offset: number) {
  return Object.freeze({
    output: decodeEnum(bytes[offset], APRS_TNC_OUTPUTS),
    format: decodeEnum(bytes[offset + 1], APRS_TNC_FORMATS),
  })
}

function writeTnc(
  bytes: Uint8Array,
  offset: number,
  value: AprsTncInterfaceSettings
) {
  writeEnum(bytes, offset, value.output, APRS_TNC_OUTPUTS)
  writeEnum(bytes, offset + 1, value.format, APRS_TNC_FORMATS)
}

function writeReports(
  bytes: Uint8Array,
  offset: number,
  reports: Readonly<Record<AprsReportKind, AprsReportSettings>>
) {
  APRS_REPORT_KINDS.forEach((kind, index) => {
    const report = reports[kind]
    writeBoolean(bytes, offset + 0x0b + index, report.decode)
    writeBoundedIndex(
      bytes,
      offset + 0x12 + index,
      report.popupIndex,
      APRS_POPUP_DURATIONS.length,
      `${kind} popup`
    )
    writeBoolean(bytes, offset + 0x19 + index, report.alert)
  })
}

function writeFixedPosition(
  bytes: Uint8Array,
  offset: number,
  position: AprsFixedPosition
) {
  if (position.latitude === null || position.longitude === null)
    throw new RangeError("Fixed APRS latitude and longitude are required")
  writeCoordinate(bytes, offset + 0xcc, position.latitude, -90, 90, "Latitude")
  writeCoordinate(
    bytes,
    offset + 0xd4,
    position.longitude,
    -180,
    180,
    "Longitude"
  )
  if (
    position.altitudeMeters === null ||
    !Number.isFinite(position.altitudeMeters)
  )
    throw new RangeError("Fixed APRS altitude is required")
  writeInt32LittleEndian(
    bytes,
    offset + 0xdc,
    Math.round(position.altitudeMeters * 1000)
  )
  writeInt32LittleEndian(bytes, offset + 0xe0, 1000)
  writeEnum(bytes, offset + 0xe4, position.altitudeUnit, APRS_ALTITUDE_UNITS)
}

function decodeCoordinate(bytes: Uint8Array, offset: number) {
  const value = readInt32LittleEndian(bytes, offset)
  const scale = readInt32LittleEndian(bytes, offset + 4)
  if (scale <= 0 || value === -1) return null
  const sign = value < 0 ? -1 : 1
  const absolute = Math.abs(value)
  const degrees = Math.trunc(absolute / 10_000_000)
  const fraction = (absolute % 10_000_000) / 6_000_000
  return sign * (degrees + fraction)
}

function writeCoordinate(
  bytes: Uint8Array,
  offset: number,
  coordinate: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max)
    throw new RangeError(`${label} must be between ${min} and ${max}`)
  const sign = coordinate < 0 ? -1 : 1
  const absolute = Math.abs(coordinate)
  const degrees = Math.trunc(absolute)
  const encoded = Math.round(
    degrees * 10_000_000 + (absolute - degrees) * 6_000_000
  )
  writeInt32LittleEndian(bytes, offset, sign * encoded)
  writeInt32LittleEndian(bytes, offset + 4, 100_000)
}

function decodeScaledValue(bytes: Uint8Array, offset: number) {
  const value = readInt32LittleEndian(bytes, offset)
  const scale = readInt32LittleEndian(bytes, offset + 4)
  return scale > 0 && value !== -1 ? value / scale : null
}

function decodeCallsign(bytes: Uint8Array, offset: number) {
  let result = ""
  for (let index = 0; index < CALLSIGN_BYTES; index += 1) {
    const byte = bytes[offset + index]
    if (byte === 0 || byte === 0xff || !isCallsignByte(byte)) break
    result += String.fromCharCode(byte)
  }
  return result
}

function writeCallsign(bytes: Uint8Array, offset: number, value: string) {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z0-9]{1,6}$/.test(normalized))
    throw new RangeError(
      "APRS callsigns must contain 1–6 ASCII letters or digits"
    )
  bytes.fill(0, offset, offset + CALLSIGN_BYTES)
  for (let index = 0; index < normalized.length; index += 1)
    bytes[offset + index] = normalized.charCodeAt(index)
}

function decodeAsciiText(bytes: Uint8Array, offset: number, length: number) {
  let result = ""
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[offset + index]
    if (byte === 0 || byte === 0xff) break
    if (byte < 0x20 || byte > 0x7e) break
    result += String.fromCharCode(byte)
  }
  return result
}

function writeAsciiText(
  bytes: Uint8Array,
  offset: number,
  length: number,
  value: string,
  label: string
) {
  if (
    value.length > length ||
    Array.from(value).some((char) => {
      const code = char.charCodeAt(0)
      return code < 0x20 || code > 0x7e
    })
  ) {
    throw new RangeError(
      `${label} must contain at most ${length} printable ASCII characters`
    )
  }
  bytes.fill(0, offset, offset + length)
  for (let index = 0; index < value.length; index += 1)
    bytes[offset + index] = value.charCodeAt(index)
}

function decodeBoolean(raw: number): SettingValue<boolean> {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function writeBoolean(
  bytes: Uint8Array,
  offset: number,
  value: SettingValue<boolean>
) {
  bytes[offset] = isUnknown(value) ? value.raw : value ? 1 : 0
}

function decodeBoundedIndex(raw: number, length: number): SettingValue<number> {
  return raw < length ? raw : unknownValue(raw)
}

function writeBoundedIndex(
  bytes: Uint8Array,
  offset: number,
  value: SettingValue<number>,
  length: number,
  label: string
) {
  if (isUnknown(value)) {
    bytes[offset] = value.raw
    return
  }
  writeInteger(bytes, offset, value, 0, length - 1, label)
}

function decodeEnum<const Values extends readonly string[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function writeEnum<const Values extends readonly string[]>(
  bytes: Uint8Array,
  offset: number,
  value: SettingValue<Values[number]>,
  values: Values
) {
  if (isUnknown(value)) {
    bytes[offset] = value.raw
    return
  }
  const index = values.indexOf(value)
  if (index < 0) throw new RangeError(`Unsupported APRS value: ${value}`)
  bytes[offset] = index
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function isUnknown(value: unknown): value is UnknownSettingValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "unknown" &&
    "raw" in value &&
    typeof value.raw === "number"
  )
}

function writeInteger(
  bytes: Uint8Array,
  offset: number,
  value: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new RangeError(
      `${label} must be an integer between ${min} and ${max}`
    )
  bytes[offset] = value
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getUint32(offset, false)
}

function writeUint32BigEndian(
  bytes: Uint8Array,
  offset: number,
  value: number
) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
    offset,
    value,
    false
  )
}

function readInt32LittleEndian(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getInt32(offset, true)
}

function writeInt32LittleEndian(
  bytes: Uint8Array,
  offset: number,
  value: number
) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setInt32(
    offset,
    value,
    true
  )
}

function isCallsignByte(byte: number) {
  return (byte >= 0x30 && byte <= 0x39) || (byte >= 0x41 && byte <= 0x5a)
}

function assertAprsBlock(bytes: Uint8Array) {
  if (bytes.byteLength < APRS_SETTINGS_OFFSET + APRS_SETTINGS_SIZE)
    throw new RangeError(
      "Codeplug is too short to contain the APRS settings block"
    )
}

export {
  APRS_REPORT_KINDS,
  APRS_SETTING_OPTIONS,
  APRS_SETTINGS_ADDRESS,
  APRS_SETTINGS_OFFSET,
  APRS_SETTINGS_SIZE,
  decodeAprsSettings,
  editAprsSettingsBytes,
}
export type {
  AprsAltitudeUnit,
  AprsBandwidth,
  AprsBeaconType,
  AprsDigipeaterEntry,
  AprsFixedPosition,
  AprsManualBeaconBand,
  AprsManualBeaconMode,
  AprsReportKind,
  AprsReportSettings,
  AprsSettings,
  AprsSettingsPatch,
  AprsSymbolTable,
  AprsTncFormat,
  AprsTncInterfaceSettings,
  AprsTncOutput,
  AprsToneType,
  AprsTransmitChannel,
  AprsTransmitPower,
}
