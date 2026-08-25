import {
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
} from "./channel-codec.ts"
import type { Channel, ChannelTone } from "./channel.ts"
import {
  CALL_RECORDS_OFFSET,
  CHANNEL_COUNT,
  CHANNEL_RECORD_SIZE,
  CHANNEL_RECORDS_OFFSET,
  SCAN_BITMAP_OFFSET,
  VALIDITY_BITMAP_OFFSET,
  VFO_RECORDS_OFFSET,
} from "./memory-map.ts"

type ChannelRecordPatch = Partial<
  Pick<
    Channel,
    | "name"
    | "receiveFrequencyHz"
    | "transmitFrequencyHz"
    | "offsetFrequencyHz"
    | "duplex"
    | "reverse"
    | "stepKHz"
    | "modulation"
    | "transmitPower"
    | "receiveOnly"
    | "busyChannelLockout"
    | "squelch"
    | "transmitTone"
    | "receiveTone"
    | "dcsPolarity"
    | "compander"
    | "optionalSignaling"
    | "scrambler"
    | "pttId"
    | "aprsReceive"
  >
>
type MemoryChannelPatch = ChannelRecordPatch &
  Partial<Pick<Channel, "valid" | "scan">>
type VfoChannelPatch = Omit<ChannelRecordPatch, "name">
type CallChannelPatch = ChannelRecordPatch

function editMemoryChannelBytes(
  source: Uint8Array,
  number: number,
  patch: MemoryChannelPatch
) {
  assertChannelNumber(number)

  const result = source.slice()
  const index = number - 1
  const offset = CHANNEL_RECORDS_OFFSET + index * CHANNEL_RECORD_SIZE

  if (patch.valid !== undefined) {
    writeBit(result, VALIDITY_BITMAP_OFFSET, index, patch.valid ? 1 : 0)
  }
  if (patch.scan !== undefined) {
    writeTwoBits(result, SCAN_BITMAP_OFFSET, index, encode(SCAN, patch.scan))
  }
  writeChannelRecord(result, offset, patch)

  return result
}

function editVfoChannelBytes(
  source: Uint8Array,
  slot: "A" | "B",
  patch: VfoChannelPatch
) {
  if (slot !== "A" && slot !== "B") {
    throw new RangeError("VFO Channel slot must be A or B")
  }
  return editSpecialChannelBytes(
    source,
    VFO_RECORDS_OFFSET,
    slot === "A" ? 0 : 1,
    patch
  )
}

function editCallChannelBytes(
  source: Uint8Array,
  slot: 1 | 2,
  patch: CallChannelPatch
) {
  if (slot !== 1 && slot !== 2) {
    throw new RangeError("Call Channel slot must be 1 or 2")
  }
  return editSpecialChannelBytes(source, CALL_RECORDS_OFFSET, slot - 1, patch)
}

function editSpecialChannelBytes(
  source: Uint8Array,
  recordsOffset: number,
  index: number,
  patch: ChannelRecordPatch
) {
  const result = source.slice()
  writeChannelRecord(result, recordsOffset + index * CHANNEL_RECORD_SIZE, patch)
  return result
}

function writeChannelRecord(
  result: Uint8Array,
  offset: number,
  patch: ChannelRecordPatch
) {
  if (patch.name !== undefined) {
    writeName(result, offset + 0x08, patch.name)
  }
  if (patch.receiveFrequencyHz !== undefined) {
    writeFrequency(result, offset + 0x00, patch.receiveFrequencyHz)
  }
  if (patch.transmitFrequencyHz !== undefined) {
    writeFrequency(result, offset + 0x04, patch.transmitFrequencyHz)
  }
  if (patch.offsetFrequencyHz !== undefined) {
    writeFrequency(result, offset + 0x20, patch.offsetFrequencyHz)
  }
  if (patch.duplex !== undefined) {
    writeBits(result, offset + 0x24, 0, 2, encode(DUPLEX, patch.duplex))
  }
  if (patch.reverse !== undefined) {
    writeBits(result, offset + 0x24, 2, 2, encode(REVERSE, patch.reverse))
  }
  if (patch.stepKHz !== undefined) {
    writeBits(result, offset + 0x24, 4, 4, encode(STEP_KHZ, patch.stepKHz))
  }
  if (patch.modulation !== undefined) {
    writeBits(result, offset + 0x25, 0, 3, encode(MODULATION, patch.modulation))
  }
  if (patch.transmitPower !== undefined) {
    writeBits(
      result,
      offset + 0x25,
      3,
      2,
      encode(TRANSMIT_POWER, patch.transmitPower)
    )
  }
  if (patch.receiveOnly !== undefined) {
    writeBits(result, offset + 0x25, 5, 1, patch.receiveOnly ? 1 : 0)
  }
  if (patch.busyChannelLockout !== undefined) {
    writeBits(
      result,
      offset + 0x25,
      6,
      2,
      encode(BUSY_LOCKOUT, patch.busyChannelLockout)
    )
  }
  if (patch.squelch !== undefined) {
    writeBits(result, offset + 0x26, 2, 3, encode(SQUELCH, patch.squelch))
  }
  if (patch.transmitTone !== undefined) {
    writeTone(result, offset, patch.transmitTone, "transmit")
  }
  if (patch.receiveTone !== undefined) {
    writeTone(result, offset, patch.receiveTone, "receive")
  }
  if (patch.dcsPolarity !== undefined) {
    writeBits(
      result,
      offset + 0x27,
      3,
      2,
      encode(DCS_POLARITY, patch.dcsPolarity)
    )
  }
  if (patch.compander !== undefined) {
    writeBits(result, offset + 0x27, 5, 2, encode(COMPANDER, patch.compander))
  }
  if (patch.optionalSignaling !== undefined) {
    if (
      !Number.isInteger(patch.optionalSignaling.index) ||
      patch.optionalSignaling.index < 0 ||
      patch.optionalSignaling.index > 15
    ) {
      throw new RangeError("Optional Signaling index must be between 0 and 15")
    }
    writeBits(
      result,
      offset + 0x2a,
      0,
      3,
      encode(OPTIONAL_SIGNALING, patch.optionalSignaling.kind)
    )
    result[offset + 0x2b] = patch.optionalSignaling.index
  }
  if (patch.scrambler !== undefined) {
    result[offset + 0x2c] = encode(SCRAMBLER, patch.scrambler)
  }
  if (patch.pttId !== undefined) {
    writeBits(result, offset + 0x2d, 0, 4, encode(PTT_ID, patch.pttId))
  }
  if (patch.aprsReceive !== undefined) {
    writeBits(
      result,
      offset + 0x2e,
      0,
      2,
      encode(APRS_RECEIVE, patch.aprsReceive)
    )
  }
}

function writeTone(
  bytes: Uint8Array,
  offset: number,
  tone: ChannelTone,
  direction: "transmit" | "receive"
) {
  if (tone.kind === "unknown") {
    throw new RangeError("Unknown Channel tones cannot be encoded")
  }

  const typeOffset = direction === "transmit" ? offset + 0x26 : offset + 0x27
  const typeShift = direction === "transmit" ? 5 : 0
  const valueOffset = direction === "transmit" ? offset + 0x28 : offset + 0x29

  if (tone.kind === "off") {
    writeBits(bytes, typeOffset, typeShift, 3, 0)
    bytes[valueOffset] = 0
    return
  }
  if (direction === "transmit" && tone.reverse) {
    throw new RangeError("Reverse tones are not supported for TX")
  }

  const reverseOffset = tone.reverse ? 2 : 0
  if (tone.kind === "ctcss") {
    writeBits(bytes, typeOffset, typeShift, 3, 1 + reverseOffset)
    bytes[valueOffset] = encode(CTCSS_FREQUENCIES_HZ, tone.frequencyHz)
    return
  }

  writeBits(bytes, typeOffset, typeShift, 3, 2 + reverseOffset)
  bytes[valueOffset] = encode(DCS_CODES, tone.code)
}

function writeName(bytes: Uint8Array, offset: number, name: string) {
  if (name.includes("\0")) {
    throw new RangeError("Channel name cannot contain a null character")
  }
  const encoded = new TextEncoder().encode(name)
  if (encoded.byteLength > 24) {
    throw new RangeError("Channel name must fit in 24 UTF-8 bytes")
  }

  bytes.fill(0, offset, offset + 24)
  bytes.set(encoded, offset)
}

function writeFrequency(
  bytes: Uint8Array,
  offset: number,
  frequencyHz: number
) {
  if (
    !Number.isInteger(frequencyHz) ||
    frequencyHz < 0 ||
    frequencyHz > 0xffff_ffff
  ) {
    throw new RangeError("Frequency must be an unsigned 32-bit integer in Hz")
  }

  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
    offset,
    frequencyHz,
    false
  )
}

function writeBit(
  bytes: Uint8Array,
  offset: number,
  index: number,
  value: number
) {
  const byteOffset = offset + Math.floor(index / 8)
  const shift = index % 8
  bytes[byteOffset] = (bytes[byteOffset] & ~(1 << shift)) | (value << shift)
}

function writeTwoBits(
  bytes: Uint8Array,
  offset: number,
  index: number,
  value: number
) {
  const byteOffset = offset + Math.floor(index / 4)
  writeBits(bytes, byteOffset, (index % 4) * 2, 2, value)
}

function writeBits(
  bytes: Uint8Array,
  offset: number,
  shift: number,
  width: number,
  value: number
) {
  const mask = ((1 << width) - 1) << shift
  bytes[offset] = (bytes[offset] & ~mask) | ((value << shift) & mask)
}

function encode<const Values extends readonly unknown[]>(
  values: Values,
  value: unknown
) {
  const index = values.indexOf(value)
  if (index === -1) {
    throw new RangeError(`Unsupported Channel value: ${String(value)}`)
  }
  return index
}

function assertChannelNumber(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > CHANNEL_COUNT) {
    throw new RangeError(
      `Channel number must be between 1 and ${CHANNEL_COUNT}`
    )
  }
}

export { editCallChannelBytes, editMemoryChannelBytes, editVfoChannelBytes }
export type { CallChannelPatch, MemoryChannelPatch, VfoChannelPatch }
