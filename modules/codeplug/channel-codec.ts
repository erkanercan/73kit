import {
  decodeNullPaddedUtf8,
  readBits,
  readUint32BigEndian,
} from "./binary.ts"
import type {
  Channel,
  ChannelAprsReceive,
  ChannelBusyLockout,
  ChannelCompander,
  ChannelDcsPolarity,
  ChannelDuplex,
  ChannelModulation,
  ChannelOptionalSignalingKind,
  ChannelPttId,
  ChannelReverse,
  ChannelScan,
  ChannelScrambler,
  ChannelSquelch,
  ChannelStepKHz,
  ChannelTone,
  ChannelTransmitPower,
  SpecialChannel,
} from "./channel.ts"
import {
  CALL_RECORDS_OFFSET,
  CHANNEL_COUNT,
  CHANNEL_RECORD_SIZE,
  CHANNEL_RECORDS_OFFSET,
  CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
  CHANNEL_ZONE_MEMBERSHIP_OFFSET,
  MEMBERSHIP_GROUP_COUNT,
  MEMBERSHIP_NAME_SIZE,
  SCAN_BITMAP_OFFSET,
  SCAN_LIST_NAMES_OFFSET,
  SPECIAL_CHANNEL_COUNT,
  VALIDITY_BITMAP_OFFSET,
  VFO_RECORDS_OFFSET,
  ZONE_NAMES_OFFSET,
} from "./memory-map.ts"

const DUPLEX = [
  "off",
  "negative",
  "positive",
  "split",
] as const satisfies readonly ChannelDuplex[]
const REVERSE = [
  "off",
  "talk-around",
  "reverse",
  "reserved",
] as const satisfies readonly ChannelReverse[]
const STEP_KHZ = [
  2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100,
] as const satisfies readonly Exclude<ChannelStepKHz, "unknown">[]
const MODULATION = [
  "fm",
  "fm-narrow",
  "am",
  "am-narrow",
] as const satisfies readonly Exclude<ChannelModulation, "unknown">[]
const TRANSMIT_POWER = [
  "low",
  "medium",
  "high",
  "reserved",
] as const satisfies readonly Exclude<ChannelTransmitPower, "unknown">[]
const BUSY_LOCKOUT = [
  "off",
  "repeater",
  "carrier",
  "reserved",
] as const satisfies readonly ChannelBusyLockout[]
const SQUELCH = [
  "carrier",
  "tone",
  "optional-signaling",
  "tone-and-optional-signaling",
  "tone-or-optional-signaling",
] as const satisfies readonly Exclude<ChannelSquelch, "unknown">[]
const DCS_POLARITY = [
  "normal",
  "tx-normal-rx-inverted",
  "tx-inverted-rx-normal",
  "inverted",
] as const satisfies readonly ChannelDcsPolarity[]
const COMPANDER = [
  "off",
  "transmit",
  "receive",
  "transmit-and-receive",
] as const satisfies readonly ChannelCompander[]
const OPTIONAL_SIGNALING = [
  "off",
  "dtmf",
  "two-tone",
  "five-tone",
] as const satisfies readonly Exclude<ChannelOptionalSignalingKind, "unknown">[]
const SCRAMBLER = [
  "off",
  2700,
  2800,
  2900,
  3000,
  3100,
  3200,
  3300,
  3400,
] as const satisfies readonly Exclude<ChannelScrambler, "unknown">[]
const PTT_ID = [
  "off",
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
] as const satisfies readonly Exclude<ChannelPttId, "unknown">[]
const APRS_RECEIVE = [
  "off",
  "on",
  "on-muted",
] as const satisfies readonly Exclude<ChannelAprsReceive, "unknown">[]
const SCAN = [
  "off",
  "skip",
  "priority",
  "reserved",
] as const satisfies readonly ChannelScan[]

const CTCSS_FREQUENCIES_HZ = [
  67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100.0,
  103.5, 107.2, 110.9, 114.8, 118.8, 123.0, 127.3, 131.8, 136.5, 141.3, 146.2,
  151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3, 173.8, 177.3, 179.9, 183.5,
  186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5, 210.7, 218.1, 225.7, 229.1,
  233.6, 241.8, 250.3, 254.1,
] as const

const DCS_CODES = [
  "023",
  "025",
  "026",
  "031",
  "032",
  "036",
  "043",
  "047",
  "051",
  "053",
  "054",
  "065",
  "071",
  "072",
  "073",
  "074",
  "114",
  "115",
  "116",
  "122",
  "125",
  "131",
  "132",
  "134",
  "143",
  "145",
  "152",
  "155",
  "156",
  "162",
  "165",
  "172",
  "174",
  "205",
  "212",
  "223",
  "225",
  "226",
  "243",
  "244",
  "245",
  "246",
  "251",
  "252",
  "255",
  "261",
  "263",
  "265",
  "266",
  "271",
  "274",
  "306",
  "311",
  "315",
  "325",
  "331",
  "332",
  "343",
  "346",
  "351",
  "356",
  "364",
  "365",
  "371",
  "411",
  "412",
  "413",
  "423",
  "431",
  "432",
  "445",
  "446",
  "452",
  "454",
  "455",
  "462",
  "464",
  "465",
  "466",
  "503",
  "506",
  "516",
  "523",
  "526",
  "532",
  "546",
  "565",
  "606",
  "612",
  "624",
  "627",
  "631",
  "632",
  "654",
  "662",
  "664",
  "703",
  "712",
  "723",
  "731",
  "732",
  "734",
  "743",
  "754",
] as const

function decodeChannels(bytes: Uint8Array) {
  return Object.freeze(
    Array.from({ length: CHANNEL_COUNT }, (_, index) =>
      decodeChannel(bytes, index)
    )
  )
}

function decodeChannel(bytes: Uint8Array, index: number): Channel {
  const offset = CHANNEL_RECORDS_OFFSET + index * CHANNEL_RECORD_SIZE
  return Object.freeze({
    number: index + 1,
    valid: readValidity(bytes, index),
    scan: readScan(bytes, index),
    zoneNames: decodeMembershipNames(
      bytes,
      index,
      CHANNEL_ZONE_MEMBERSHIP_OFFSET,
      ZONE_NAMES_OFFSET
    ),
    scanListNames: decodeMembershipNames(
      bytes,
      index,
      CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
      SCAN_LIST_NAMES_OFFSET
    ),
    ...decodeChannelRecord(bytes, offset),
  })
}

function decodeVfoChannels(bytes: Uint8Array) {
  return decodeSpecialChannels(bytes, VFO_RECORDS_OFFSET, ["A", "B"])
}

function decodeCallChannels(bytes: Uint8Array) {
  return decodeSpecialChannels(bytes, CALL_RECORDS_OFFSET, [1, 2])
}

function decodeSpecialChannels(
  bytes: Uint8Array,
  recordsOffset: number,
  slots: readonly SpecialChannel["slot"][]
) {
  return Object.freeze(
    Array.from({ length: SPECIAL_CHANNEL_COUNT }, (_, index) =>
      Object.freeze({
        slot: slots[index],
        ...decodeChannelRecord(
          bytes,
          recordsOffset + index * CHANNEL_RECORD_SIZE
        ),
      })
    )
  )
}

function decodeChannelRecord(
  bytes: Uint8Array,
  offset: number
): Omit<Channel, "number" | "valid" | "scan" | "zoneNames" | "scanListNames"> {
  const byte36 = bytes[offset + 0x24]
  const byte37 = bytes[offset + 0x25]
  const byte38 = bytes[offset + 0x26]
  const byte39 = bytes[offset + 0x27]
  const transmitToneType = readBits(byte38, 5, 3)
  const receiveToneType = readBits(byte39, 0, 3)
  const optionalSignaling = Object.freeze({
    kind: lookup(OPTIONAL_SIGNALING, readBits(bytes[offset + 0x2a], 0, 3)),
    index: bytes[offset + 0x2b],
  })

  return {
    name: decodeNullPaddedUtf8(bytes.subarray(offset + 0x08, offset + 0x20)),
    receiveFrequencyHz: readUint32BigEndian(bytes, offset + 0x00),
    transmitFrequencyHz: readUint32BigEndian(bytes, offset + 0x04),
    offsetFrequencyHz: readUint32BigEndian(bytes, offset + 0x20),
    duplex: DUPLEX[readBits(byte36, 0, 2)],
    reverse: REVERSE[readBits(byte36, 2, 2)],
    stepKHz: lookup(STEP_KHZ, readBits(byte36, 4, 4)),
    modulation: lookup(MODULATION, readBits(byte37, 0, 3)),
    transmitPower: lookup(TRANSMIT_POWER, readBits(byte37, 3, 2)),
    receiveOnly: readBits(byte37, 5, 1) === 1,
    busyChannelLockout: BUSY_LOCKOUT[readBits(byte37, 6, 2)],
    squelch: lookup(SQUELCH, readBits(byte38, 2, 3)),
    transmitTone: decodeTransmitTone(transmitToneType, bytes[offset + 0x28]),
    receiveTone: decodeReceiveTone(receiveToneType, bytes[offset + 0x29]),
    dcsPolarity: DCS_POLARITY[readBits(byte39, 3, 2)],
    compander: COMPANDER[readBits(byte39, 5, 2)],
    optionalSignaling,
    scrambler: lookup(SCRAMBLER, bytes[offset + 0x2c]),
    pttId: lookup(PTT_ID, readBits(bytes[offset + 0x2d], 0, 4)),
    aprsReceive: lookup(APRS_RECEIVE, readBits(bytes[offset + 0x2e], 0, 2)),
  }
}

function decodeMembershipNames(
  bytes: Uint8Array,
  channelIndex: number,
  bitmapOffset: number,
  namesOffset: number
) {
  const membershipOffset = bitmapOffset + channelIndex * 2
  const storedMembership =
    bytes[membershipOffset] | (bytes[membershipOffset + 1] << 8)
  const names: string[] = []

  for (let group = 0; group < MEMBERSHIP_GROUP_COUNT; group += 1) {
    if (((storedMembership >>> group) & 1) !== 0) {
      continue
    }

    const nameOffset = namesOffset + group * MEMBERSHIP_NAME_SIZE
    const name = decodeNullPaddedUtf8(
      bytes.subarray(nameOffset, nameOffset + MEMBERSHIP_NAME_SIZE)
    )
    if (name) {
      names.push(name)
    }
  }

  return Object.freeze(names)
}

function readValidity(bytes: Uint8Array, index: number) {
  const byte = bytes[VALIDITY_BITMAP_OFFSET + Math.floor(index / 8)]
  return ((byte >>> (index % 8)) & 1) === 1
}

function readScan(bytes: Uint8Array, index: number) {
  const byte = bytes[SCAN_BITMAP_OFFSET + Math.floor(index / 4)]
  return SCAN[readBits(byte, (index % 4) * 2, 2)]
}

function decodeTransmitTone(type: number, index: number): ChannelTone {
  if (type === 0) {
    return Object.freeze({ kind: "off" })
  }
  if (type === 1) {
    return decodeCtcss(index, false)
  }
  if (type === 2) {
    return decodeDcs(index, false)
  }
  return Object.freeze({ kind: "unknown" })
}

function decodeReceiveTone(type: number, index: number): ChannelTone {
  if (type === 0) {
    return Object.freeze({ kind: "off" })
  }
  if (type === 1 || type === 3) {
    return decodeCtcss(index, type === 3)
  }
  if (type === 2 || type === 4) {
    return decodeDcs(index, type === 4)
  }
  return Object.freeze({ kind: "unknown" })
}

function decodeCtcss(index: number, reverse: boolean): ChannelTone {
  const frequencyHz = CTCSS_FREQUENCIES_HZ[index]
  return frequencyHz === undefined
    ? Object.freeze({ kind: "unknown" })
    : Object.freeze({
        kind: "ctcss",
        frequencyHz,
        ...(reverse ? { reverse: true as const } : {}),
      })
}

function decodeDcs(index: number, reverse: boolean): ChannelTone {
  const code = DCS_CODES[index]
  return code === undefined
    ? Object.freeze({ kind: "unknown" })
    : Object.freeze({
        kind: "dcs",
        code,
        ...(reverse ? { reverse: true as const } : {}),
      })
}

function lookup<const Values extends readonly unknown[]>(
  values: Values,
  index: number
): Values[number] | "unknown" {
  return values[index] ?? "unknown"
}

export {
  APRS_RECEIVE,
  BUSY_LOCKOUT,
  COMPANDER,
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  DCS_POLARITY,
  DUPLEX,
  MODULATION,
  OPTIONAL_SIGNALING,
  PTT_ID,
  REVERSE,
  SCAN,
  SCRAMBLER,
  SQUELCH,
  STEP_KHZ,
  TRANSMIT_POWER,
  decodeCallChannels,
  decodeChannels,
  decodeVfoChannels,
}
