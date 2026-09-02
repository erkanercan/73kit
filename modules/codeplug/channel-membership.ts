import { decodeNullPaddedUtf8 } from "./binary.ts"
import {
  CHANNEL_COUNT,
  CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
  CHANNEL_ZONE_MEMBERSHIP_OFFSET,
  MEMBER_LIST_SIZE,
  MEMBER_LIST_SLOT_COUNT,
  MEMBERSHIP_BITMAP_RECORD_SIZE,
  MEMBERSHIP_GROUP_COUNT,
  MEMBERSHIP_NAME_SIZE,
  SCAN_LIST_MEMBER_LISTS_OFFSET,
  ZONE_MEMBER_LISTS_OFFSET,
} from "./memory-map.ts"
import { CODEPLUG_MEMORY_MAP_3_07_23 } from "./layout.ts"
import type { CodeplugMemoryMap } from "./layout.ts"

type MembershipCollectionKind = "zone" | "scan-list"

interface Zone {
  readonly number: number
  readonly name: string
  readonly channelNumbers: readonly number[]
}

interface ScanList {
  readonly number: number
  readonly name: string
  readonly channelNumbers: readonly number[]
}

interface ChannelCollectionPatch {
  readonly name?: string
  readonly channelNumbers?: readonly number[]
}

interface ChannelMembershipPatch {
  readonly zoneNumbers?: readonly number[]
  readonly scanListNumbers?: readonly number[]
}

type MembershipConsistencyIssue =
  | {
      readonly code: "invalid-ordered-member"
      readonly collection: MembershipCollectionKind
      readonly collectionNumber: number
      readonly memberSlot: number
      readonly storedChannelIndex: number
    }
  | {
      readonly code: "duplicate-ordered-member"
      readonly collection: MembershipCollectionKind
      readonly collectionNumber: number
      readonly memberSlot: number
      readonly channelNumber: number
    }
  | {
      readonly code: "ordered-member-missing-from-bitmap"
      readonly collection: MembershipCollectionKind
      readonly collectionNumber: number
      readonly channelNumber: number
    }
  | {
      readonly code: "bitmap-member-missing-from-ordered-list"
      readonly collection: MembershipCollectionKind
      readonly collectionNumber: number
      readonly channelNumber: number
    }

interface CollectionStorage {
  readonly kind: MembershipCollectionKind
  readonly memberListsOffset: number
  readonly membershipOffset: number
  readonly namesOffset: number
}

function collectionStorages(memoryMap: CodeplugMemoryMap) {
  return {
    zone: {
      kind: "zone",
      memberListsOffset: ZONE_MEMBER_LISTS_OFFSET,
      membershipOffset: CHANNEL_ZONE_MEMBERSHIP_OFFSET,
      namesOffset: memoryMap.zoneNamesOffset,
    } satisfies CollectionStorage,
    scanList: {
      kind: "scan-list",
      memberListsOffset: SCAN_LIST_MEMBER_LISTS_OFFSET,
      membershipOffset: CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
      namesOffset: memoryMap.scanListNamesOffset,
    } satisfies CollectionStorage,
  }
}

function decodeZones(
  bytes: Uint8Array,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
): readonly Zone[] {
  return decodeCollections(bytes, collectionStorages(memoryMap).zone)
}

function decodeScanLists(
  bytes: Uint8Array,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
): readonly ScanList[] {
  return decodeCollections(bytes, collectionStorages(memoryMap).scanList)
}

function decodeCollections(bytes: Uint8Array, storage: CollectionStorage) {
  return Object.freeze(
    Array.from({ length: MEMBERSHIP_GROUP_COUNT }, (_, index) =>
      Object.freeze({
        number: index + 1,
        name: decodeCollectionName(bytes, storage, index),
        channelNumbers: Object.freeze(
          readOrderedMemberSlots(bytes, storage, index)
            .filter((value) => value < CHANNEL_COUNT)
            .map((value) => value + 1)
        ),
      })
    )
  )
}

function decodeChannelMembershipNames(
  bytes: Uint8Array,
  channelIndex: number,
  storage: CollectionStorage
) {
  const names: string[] = []

  for (
    let groupIndex = 0;
    groupIndex < MEMBERSHIP_GROUP_COUNT;
    groupIndex += 1
  ) {
    if (!readMembershipBit(bytes, storage, channelIndex, groupIndex)) {
      continue
    }

    const name = decodeCollectionName(bytes, storage, groupIndex)
    if (name) {
      names.push(name)
    }
  }

  return Object.freeze(names)
}

function decodeChannelZoneNames(
  bytes: Uint8Array,
  channelIndex: number,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  return decodeChannelMembershipNames(
    bytes,
    channelIndex,
    collectionStorages(memoryMap).zone
  )
}

function decodeChannelScanListNames(
  bytes: Uint8Array,
  channelIndex: number,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  return decodeChannelMembershipNames(
    bytes,
    channelIndex,
    collectionStorages(memoryMap).scanList
  )
}

function editZoneBytes(
  source: Uint8Array,
  number: number,
  patch: ChannelCollectionPatch,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  return editCollectionBytes(
    source,
    collectionStorages(memoryMap).zone,
    number,
    patch
  )
}

function editScanListBytes(
  source: Uint8Array,
  number: number,
  patch: ChannelCollectionPatch,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  return editCollectionBytes(
    source,
    collectionStorages(memoryMap).scanList,
    number,
    patch
  )
}

function editCollectionBytes(
  source: Uint8Array,
  storage: CollectionStorage,
  number: number,
  patch: ChannelCollectionPatch
) {
  const groupIndex = assertCollectionNumber(number)
  const result = source.slice()

  if (patch.name !== undefined) {
    writeCollectionName(result, storage, groupIndex, patch.name)
  }

  if (patch.channelNumbers !== undefined) {
    const channelIndexes = validateChannelNumbers(patch.channelNumbers)
    writeOrderedMembers(result, storage, groupIndex, channelIndexes)
    const included = new Set(channelIndexes)

    for (
      let channelIndex = 0;
      channelIndex < CHANNEL_COUNT;
      channelIndex += 1
    ) {
      writeMembershipBit(
        result,
        storage,
        channelIndex,
        groupIndex,
        included.has(channelIndex)
      )
    }
  }

  return result
}

function editChannelMembershipsBytes(
  source: Uint8Array,
  channelNumber: number,
  patch: ChannelMembershipPatch,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  const channelIndex = assertChannelNumber(channelNumber)
  const result = source.slice()

  if (patch.zoneNumbers !== undefined) {
    updateChannelMemberships(
      result,
      collectionStorages(memoryMap).zone,
      channelIndex,
      validateCollectionNumbers(patch.zoneNumbers)
    )
  }
  if (patch.scanListNumbers !== undefined) {
    updateChannelMemberships(
      result,
      collectionStorages(memoryMap).scanList,
      channelIndex,
      validateCollectionNumbers(patch.scanListNumbers)
    )
  }

  return result
}

function updateChannelMemberships(
  bytes: Uint8Array,
  storage: CollectionStorage,
  channelIndex: number,
  desiredGroups: ReadonlySet<number>
) {
  for (
    let groupIndex = 0;
    groupIndex < MEMBERSHIP_GROUP_COUNT;
    groupIndex += 1
  ) {
    const desired = desiredGroups.has(groupIndex)
    const slots = readOrderedMemberSlots(bytes, storage, groupIndex)
    const matchingSlots = slots.flatMap((value, slot) =>
      value === channelIndex ? [slot] : []
    )

    if (desired) {
      if (matchingSlots.length === 0) {
        appendOrderedMember(slots, channelIndex, storage, groupIndex)
      } else {
        for (const duplicateSlot of matchingSlots.slice(1)) {
          slots[duplicateSlot] = 0xffff
        }
      }
    } else {
      for (const matchingSlot of matchingSlots) {
        slots[matchingSlot] = 0xffff
      }
    }

    writeOrderedMemberSlots(bytes, storage, groupIndex, slots)
    writeMembershipBit(bytes, storage, channelIndex, groupIndex, desired)
  }
}

function appendOrderedMember(
  slots: number[],
  channelIndex: number,
  storage: CollectionStorage,
  groupIndex: number
) {
  const occupied = slots.filter((value) => value !== 0xffff)
  if (occupied.length >= MEMBER_LIST_SLOT_COUNT) {
    throw new RangeError(
      `${collectionLabel(storage)} ${groupIndex + 1} cannot contain more than ${MEMBER_LIST_SLOT_COUNT} Channels`
    )
  }

  let lastOccupiedSlot = -1
  for (let slot = slots.length - 1; slot >= 0; slot -= 1) {
    if (slots[slot] !== 0xffff) {
      lastOccupiedSlot = slot
      break
    }
  }

  if (lastOccupiedSlot < MEMBER_LIST_SLOT_COUNT - 1) {
    slots[lastOccupiedSlot + 1] = channelIndex
    return
  }

  occupied.push(channelIndex)
  slots.splice(
    0,
    slots.length,
    ...occupied,
    ...Array.from(
      { length: MEMBER_LIST_SLOT_COUNT - occupied.length },
      () => 0xffff
    )
  )
}

function validateMembershipConsistency(
  bytes: Uint8Array,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
): readonly MembershipConsistencyIssue[] {
  const storages = collectionStorages(memoryMap)
  return Object.freeze([
    ...validateCollectionConsistency(bytes, storages.zone),
    ...validateCollectionConsistency(bytes, storages.scanList),
  ])
}

function validateCollectionConsistency(
  bytes: Uint8Array,
  storage: CollectionStorage
) {
  const issues: MembershipConsistencyIssue[] = []

  for (
    let groupIndex = 0;
    groupIndex < MEMBERSHIP_GROUP_COUNT;
    groupIndex += 1
  ) {
    const orderedMembers = new Set<number>()
    const slots = readOrderedMemberSlots(bytes, storage, groupIndex)

    slots.forEach((storedChannelIndex, slot) => {
      if (storedChannelIndex === 0xffff) {
        return
      }
      if (storedChannelIndex >= CHANNEL_COUNT) {
        issues.push(
          Object.freeze({
            code: "invalid-ordered-member" as const,
            collection: storage.kind,
            collectionNumber: groupIndex + 1,
            memberSlot: slot + 1,
            storedChannelIndex,
          })
        )
        return
      }
      if (orderedMembers.has(storedChannelIndex)) {
        issues.push(
          Object.freeze({
            code: "duplicate-ordered-member" as const,
            collection: storage.kind,
            collectionNumber: groupIndex + 1,
            memberSlot: slot + 1,
            channelNumber: storedChannelIndex + 1,
          })
        )
        return
      }
      orderedMembers.add(storedChannelIndex)
    })

    for (
      let channelIndex = 0;
      channelIndex < CHANNEL_COUNT;
      channelIndex += 1
    ) {
      const ordered = orderedMembers.has(channelIndex)
      const bitmap = readMembershipBit(bytes, storage, channelIndex, groupIndex)

      if (ordered && !bitmap) {
        issues.push(
          Object.freeze({
            code: "ordered-member-missing-from-bitmap" as const,
            collection: storage.kind,
            collectionNumber: groupIndex + 1,
            channelNumber: channelIndex + 1,
          })
        )
      } else if (bitmap && !ordered) {
        issues.push(
          Object.freeze({
            code: "bitmap-member-missing-from-ordered-list" as const,
            collection: storage.kind,
            collectionNumber: groupIndex + 1,
            channelNumber: channelIndex + 1,
          })
        )
      }
    }
  }

  return issues
}

function decodeCollectionName(
  bytes: Uint8Array,
  storage: CollectionStorage,
  groupIndex: number
) {
  const offset = storage.namesOffset + groupIndex * MEMBERSHIP_NAME_SIZE
  return decodeNullPaddedUtf8(
    bytes.subarray(offset, offset + MEMBERSHIP_NAME_SIZE)
  )
}

function writeCollectionName(
  bytes: Uint8Array,
  storage: CollectionStorage,
  groupIndex: number,
  name: string
) {
  if (name.includes("\0")) {
    throw new RangeError(
      `${collectionLabel(storage)} name cannot contain a null character`
    )
  }
  const encoded = new TextEncoder().encode(name)
  if (encoded.byteLength > MEMBERSHIP_NAME_SIZE) {
    throw new RangeError(
      `${collectionLabel(storage)} name must fit in ${MEMBERSHIP_NAME_SIZE} UTF-8 bytes`
    )
  }

  const offset = storage.namesOffset + groupIndex * MEMBERSHIP_NAME_SIZE
  bytes.fill(0, offset, offset + MEMBERSHIP_NAME_SIZE)
  bytes.set(encoded, offset)
}

function readOrderedMemberSlots(
  bytes: Uint8Array,
  storage: CollectionStorage,
  groupIndex: number
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const offset = storage.memberListsOffset + groupIndex * MEMBER_LIST_SIZE
  return Array.from({ length: MEMBER_LIST_SLOT_COUNT }, (_, slot) =>
    view.getUint16(offset + slot * 2, false)
  )
}

function writeOrderedMembers(
  bytes: Uint8Array,
  storage: CollectionStorage,
  groupIndex: number,
  channelIndexes: readonly number[]
) {
  writeOrderedMemberSlots(bytes, storage, groupIndex, [
    ...channelIndexes,
    ...Array.from(
      { length: MEMBER_LIST_SLOT_COUNT - channelIndexes.length },
      () => 0xffff
    ),
  ])
}

function writeOrderedMemberSlots(
  bytes: Uint8Array,
  storage: CollectionStorage,
  groupIndex: number,
  slots: readonly number[]
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const offset = storage.memberListsOffset + groupIndex * MEMBER_LIST_SIZE

  slots.forEach((value, slot) => {
    view.setUint16(offset + slot * 2, value, false)
  })
}

function readMembershipBit(
  bytes: Uint8Array,
  storage: CollectionStorage,
  channelIndex: number,
  groupIndex: number
) {
  const offset =
    storage.membershipOffset +
    channelIndex * MEMBERSHIP_BITMAP_RECORD_SIZE +
    Math.floor(groupIndex / 8)
  return ((bytes[offset] >>> (groupIndex % 8)) & 1) === 0
}

function writeMembershipBit(
  bytes: Uint8Array,
  storage: CollectionStorage,
  channelIndex: number,
  groupIndex: number,
  member: boolean
) {
  const offset =
    storage.membershipOffset +
    channelIndex * MEMBERSHIP_BITMAP_RECORD_SIZE +
    Math.floor(groupIndex / 8)
  const mask = 1 << (groupIndex % 8)
  bytes[offset] = member ? bytes[offset] & ~mask : bytes[offset] | mask
}

function validateChannelNumbers(channelNumbers: readonly number[]) {
  if (channelNumbers.length > MEMBER_LIST_SLOT_COUNT) {
    throw new RangeError(
      `A collection cannot contain more than ${MEMBER_LIST_SLOT_COUNT} Channels`
    )
  }

  const indexes = channelNumbers.map(assertChannelNumber)
  if (new Set(indexes).size !== indexes.length) {
    throw new RangeError("A collection cannot contain the same Channel twice")
  }
  return indexes
}

function validateCollectionNumbers(numbers: readonly number[]) {
  const indexes = numbers.map(assertCollectionNumber)
  if (new Set(indexes).size !== indexes.length) {
    throw new RangeError("A Channel cannot contain the same membership twice")
  }
  return new Set(indexes)
}

function assertChannelNumber(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > CHANNEL_COUNT) {
    throw new RangeError(
      `Channel number must be between 1 and ${CHANNEL_COUNT}`
    )
  }
  return number - 1
}

function assertCollectionNumber(number: number) {
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > MEMBERSHIP_GROUP_COUNT
  ) {
    throw new RangeError(
      `Collection number must be between 1 and ${MEMBERSHIP_GROUP_COUNT}`
    )
  }
  return number - 1
}

function collectionLabel(storage: CollectionStorage) {
  return storage.kind === "zone" ? "Zone" : "Scan List"
}

export {
  decodeChannelScanListNames,
  decodeChannelZoneNames,
  decodeScanLists,
  decodeZones,
  editChannelMembershipsBytes,
  editScanListBytes,
  editZoneBytes,
  validateMembershipConsistency,
}
export type {
  ChannelCollectionPatch,
  ChannelMembershipPatch,
  MembershipConsistencyIssue,
  ScanList,
  Zone,
}
