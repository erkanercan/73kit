import { editMemoryChannelBytes } from "./channel-edit.ts"
import { decodeChannels } from "./channel-codec.ts"
import {
  decodeScanLists,
  decodeZones,
  editChannelMembershipsBytes,
} from "./channel-membership.ts"
import { moveMemoryChannelBytes } from "./channel-order.ts"
import {
  CHANNEL_COUNT,
  CHANNEL_RECORD_SIZE,
  CHANNEL_RECORDS_OFFSET,
  CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
  CHANNEL_ZONE_MEMBERSHIP_OFFSET,
  MEMBER_LIST_SIZE,
  MEMBER_LIST_SLOT_COUNT,
  MEMBERSHIP_BITMAP_RECORD_SIZE,
  MEMBERSHIP_GROUP_COUNT,
  SCAN_BITMAP_OFFSET,
  SCAN_LIST_MEMBER_LISTS_OFFSET,
  VALIDITY_BITMAP_OFFSET,
  ZONE_MEMBER_LISTS_OFFSET,
} from "./memory-map.ts"
import { CODEPLUG_MEMORY_MAP_3_07_23 } from "./layout.ts"
import type { CodeplugMemoryMap } from "./layout.ts"

const DEFAULT_FREQUENCY_HZ = 145_500_000
const CHANNEL_NAME_SIZE = 24
const COPY_SUFFIX = " Copy"

function addDefaultMemoryChannelBytes(source: Uint8Array) {
  const index = findFirstUnusedChannelIndex(source)
  if (index === -1) {
    throw new RangeError("All Memory Channel slots are in use")
  }

  const result = source.slice()
  clearMemoryChannelSlot(result, index)
  removeMemberListReferences(result, index)

  return editMemoryChannelBytes(result, index + 1, {
    valid: true,
    scan: "off",
    name: "",
    receiveFrequencyHz: DEFAULT_FREQUENCY_HZ,
    transmitFrequencyHz: DEFAULT_FREQUENCY_HZ,
    offsetFrequencyHz: 0,
    duplex: "off",
    reverse: "off",
    stepKHz: 12.5,
    modulation: "fm",
    transmitPower: "low",
    receiveOnly: false,
    busyChannelLockout: "off",
    squelch: "carrier",
    dcsPolarity: "normal",
    compander: "off",
    optionalSignaling: { kind: "off", index: 0 },
    scrambler: "off",
    pttId: "off",
    aprsReceive: "off",
  })
}

function deleteMemoryChannelBytes(source: Uint8Array, number: number) {
  assertChannelNumber(number)

  const result = moveMemoryChannelBytes(source, number, CHANNEL_COUNT)
  const finalIndex = CHANNEL_COUNT - 1
  clearMemoryChannelSlot(result, finalIndex)
  removeMemberListReferences(result, finalIndex)
  return result
}

function duplicateMemoryChannelBytes(
  source: Uint8Array,
  number: number,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  const sourceIndex = assertChannelNumber(number)
  if (readBit(source, VALIDITY_BITMAP_OFFSET, sourceIndex) === 0) {
    throw new RangeError("Only used Memory Channels can be copied")
  }

  const unusedIndex = findUnusedChannelIndexForInsert(source, sourceIndex)
  if (unusedIndex === -1) {
    throw new RangeError("All Memory Channel slots are in use")
  }

  const unusedNumber = unusedIndex + 1
  const sourceNumber = unusedIndex > sourceIndex ? number : number - 1
  const copyNumber = sourceNumber + 1
  const reordered = moveMemoryChannelBytes(source, unusedNumber, copyNumber)
  const sourceChannel = decodeChannels(reordered, memoryMap)[sourceNumber - 1]
  const zoneNumbers = decodeZones(reordered, memoryMap)
    .filter((zone) => zone.channelNumbers.includes(sourceNumber))
    .map((zone) => zone.number)
  const scanListNumbers = decodeScanLists(reordered, memoryMap)
    .filter((scanList) => scanList.channelNumbers.includes(sourceNumber))
    .map((scanList) => scanList.number)

  let result = editChannelMembershipsBytes(
    reordered,
    copyNumber,
    { zoneNumbers: [], scanListNumbers: [] },
    memoryMap
  )
  copyMemoryChannelRecord(result, sourceNumber - 1, copyNumber - 1)
  result = editMemoryChannelBytes(result, copyNumber, {
    name: copyChannelName(sourceChannel.name),
  })

  return editChannelMembershipsBytes(
    result,
    copyNumber,
    { zoneNumbers, scanListNumbers },
    memoryMap
  )
}

function findUnusedChannelIndexForInsert(
  bytes: Uint8Array,
  sourceIndex: number
) {
  for (let index = sourceIndex + 1; index < CHANNEL_COUNT; index += 1) {
    if (readBit(bytes, VALIDITY_BITMAP_OFFSET, index) === 0) {
      return index
    }
  }

  for (let index = 0; index < sourceIndex; index += 1) {
    if (readBit(bytes, VALIDITY_BITMAP_OFFSET, index) === 0) {
      return index
    }
  }

  return -1
}

function copyMemoryChannelRecord(
  bytes: Uint8Array,
  sourceIndex: number,
  targetIndex: number
) {
  const sourceOffset =
    CHANNEL_RECORDS_OFFSET + sourceIndex * CHANNEL_RECORD_SIZE
  const targetOffset =
    CHANNEL_RECORDS_OFFSET + targetIndex * CHANNEL_RECORD_SIZE
  bytes.copyWithin(
    targetOffset,
    sourceOffset,
    sourceOffset + CHANNEL_RECORD_SIZE
  )
  writeBit(
    bytes,
    VALIDITY_BITMAP_OFFSET,
    targetIndex,
    readBit(bytes, VALIDITY_BITMAP_OFFSET, sourceIndex)
  )
  writeTwoBits(
    bytes,
    SCAN_BITMAP_OFFSET,
    targetIndex,
    readTwoBits(bytes, SCAN_BITMAP_OFFSET, sourceIndex)
  )
}

function copyChannelName(name: string) {
  const encoder = new TextEncoder()
  let prefix = name

  while (
    prefix.length > 0 &&
    encoder.encode(`${prefix}${COPY_SUFFIX}`).byteLength > CHANNEL_NAME_SIZE
  ) {
    prefix = Array.from(prefix).slice(0, -1).join("")
  }

  return prefix ? `${prefix}${COPY_SUFFIX}` : COPY_SUFFIX.trimStart()
}

function findFirstUnusedChannelIndex(bytes: Uint8Array) {
  for (let index = 0; index < CHANNEL_COUNT; index += 1) {
    if (readBit(bytes, VALIDITY_BITMAP_OFFSET, index) === 0) {
      return index
    }
  }
  return -1
}

function clearMemoryChannelSlot(bytes: Uint8Array, index: number) {
  const recordOffset = CHANNEL_RECORDS_OFFSET + index * CHANNEL_RECORD_SIZE
  bytes.fill(0, recordOffset, recordOffset + CHANNEL_RECORD_SIZE)
  writeBit(bytes, VALIDITY_BITMAP_OFFSET, index, 0)
  writeTwoBits(bytes, SCAN_BITMAP_OFFSET, index, 0)
  bytes.fill(
    0xff,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + index * MEMBERSHIP_BITMAP_RECORD_SIZE,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + (index + 1) * MEMBERSHIP_BITMAP_RECORD_SIZE
  )
  bytes.fill(
    0xff,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + index * MEMBERSHIP_BITMAP_RECORD_SIZE,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET +
      (index + 1) * MEMBERSHIP_BITMAP_RECORD_SIZE
  )
}

function removeMemberListReferences(bytes: Uint8Array, channelIndex: number) {
  removeReferencesFromLists(bytes, ZONE_MEMBER_LISTS_OFFSET, channelIndex)
  removeReferencesFromLists(bytes, SCAN_LIST_MEMBER_LISTS_OFFSET, channelIndex)
}

function removeReferencesFromLists(
  bytes: Uint8Array,
  listsOffset: number,
  channelIndex: number
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  for (let group = 0; group < MEMBERSHIP_GROUP_COUNT; group += 1) {
    const listOffset = listsOffset + group * MEMBER_LIST_SIZE
    const retained: number[] = []

    for (let slot = 0; slot < MEMBER_LIST_SLOT_COUNT; slot += 1) {
      const value = view.getUint16(listOffset + slot * 2, false)
      if (value !== channelIndex) {
        retained.push(value)
      }
    }

    if (retained.length === MEMBER_LIST_SLOT_COUNT) {
      continue
    }

    retained.push(
      ...Array.from(
        { length: MEMBER_LIST_SLOT_COUNT - retained.length },
        () => 0xffff
      )
    )
    retained.forEach((value, slot) => {
      view.setUint16(listOffset + slot * 2, value, false)
    })
  }
}

function readBit(bytes: Uint8Array, offset: number, index: number) {
  return (bytes[offset + Math.floor(index / 8)] >>> (index % 8)) & 1
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
  const shift = (index % 4) * 2
  bytes[byteOffset] = (bytes[byteOffset] & ~(0b11 << shift)) | (value << shift)
}

function assertChannelNumber(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > CHANNEL_COUNT) {
    throw new RangeError(
      `Channel number must be between 1 and ${CHANNEL_COUNT}`
    )
  }

  return number - 1
}

function readTwoBits(bytes: Uint8Array, offset: number, index: number) {
  const shift = (index % 4) * 2
  return (bytes[offset + Math.floor(index / 4)] >>> shift) & 0b11
}

export {
  addDefaultMemoryChannelBytes,
  deleteMemoryChannelBytes,
  duplicateMemoryChannelBytes,
}
