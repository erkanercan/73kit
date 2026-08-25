import {
  CHANNEL_COUNT,
  CHANNEL_RECORD_SIZE,
  CHANNEL_RECORDS_OFFSET,
  CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
  CHANNEL_ZONE_MEMBERSHIP_OFFSET,
  MEMBER_LIST_SIZE,
  MEMBER_LIST_SLOT_COUNT,
  MEMBERSHIP_GROUP_COUNT,
  SCAN_BITMAP_OFFSET,
  SCAN_LIST_MEMBER_LISTS_OFFSET,
  VALIDITY_BITMAP_OFFSET,
  ZONE_MEMBER_LISTS_OFFSET,
} from "./memory-map.ts"

function moveMemoryChannelBytes(
  source: Uint8Array,
  fromNumber: number,
  toNumber: number
) {
  assertChannelNumber(fromNumber)
  assertChannelNumber(toNumber)

  if (fromNumber === toNumber) {
    return source.slice()
  }

  const sourceOrder = Array.from({ length: CHANNEL_COUNT }, (_, index) => index)
  const [movedIndex] = sourceOrder.splice(fromNumber - 1, 1)
  sourceOrder.splice(toNumber - 1, 0, movedIndex)

  const oldToNew = new Array<number>(CHANNEL_COUNT)
  sourceOrder.forEach((oldIndex, newIndex) => {
    oldToNew[oldIndex] = newIndex
  })

  const result = source.slice()

  sourceOrder.forEach((oldIndex, newIndex) => {
    copyBlock(
      source,
      result,
      CHANNEL_RECORDS_OFFSET + oldIndex * CHANNEL_RECORD_SIZE,
      CHANNEL_RECORDS_OFFSET + newIndex * CHANNEL_RECORD_SIZE,
      CHANNEL_RECORD_SIZE
    )
    writeBit(
      result,
      VALIDITY_BITMAP_OFFSET,
      newIndex,
      readBit(source, VALIDITY_BITMAP_OFFSET, oldIndex)
    )
    writeTwoBits(
      result,
      SCAN_BITMAP_OFFSET,
      newIndex,
      readTwoBits(source, SCAN_BITMAP_OFFSET, oldIndex)
    )
    copyBlock(
      source,
      result,
      CHANNEL_ZONE_MEMBERSHIP_OFFSET + oldIndex * 2,
      CHANNEL_ZONE_MEMBERSHIP_OFFSET + newIndex * 2,
      2
    )
    copyBlock(
      source,
      result,
      CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + oldIndex * 2,
      CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + newIndex * 2,
      2
    )
  })

  remapMemberLists(source, result, ZONE_MEMBER_LISTS_OFFSET, oldToNew)
  remapMemberLists(source, result, SCAN_LIST_MEMBER_LISTS_OFFSET, oldToNew)

  return result
}

function remapMemberLists(
  source: Uint8Array,
  result: Uint8Array,
  listsOffset: number,
  oldToNew: readonly number[]
) {
  const sourceView = new DataView(
    source.buffer,
    source.byteOffset,
    source.byteLength
  )
  const resultView = new DataView(
    result.buffer,
    result.byteOffset,
    result.byteLength
  )

  for (let group = 0; group < MEMBERSHIP_GROUP_COUNT; group += 1) {
    for (let slot = 0; slot < MEMBER_LIST_SLOT_COUNT; slot += 1) {
      const offset = listsOffset + group * MEMBER_LIST_SIZE + slot * 2
      const oldIndex = sourceView.getUint16(offset, true)

      if (oldIndex < CHANNEL_COUNT) {
        resultView.setUint16(offset, oldToNew[oldIndex], true)
      }
    }
  }
}

function copyBlock(
  source: Uint8Array,
  result: Uint8Array,
  sourceOffset: number,
  resultOffset: number,
  length: number
) {
  result.set(source.subarray(sourceOffset, sourceOffset + length), resultOffset)
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
  const mask = 1 << (index % 8)
  bytes[byteOffset] = (bytes[byteOffset] & ~mask) | (value << (index % 8))
}

function readTwoBits(bytes: Uint8Array, offset: number, index: number) {
  const shift = (index % 4) * 2
  return (bytes[offset + Math.floor(index / 4)] >>> shift) & 0b11
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
}

export { moveMemoryChannelBytes }
