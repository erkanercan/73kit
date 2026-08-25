import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import {
  reconcileBandZoneSelectionChange,
  reconcileZoneEditChanges,
} from "../modules/cps-workspace/change-set.ts"

const ZONE_MEMBER_LISTS_OFFSET = 0x10000
const SCAN_LIST_MEMBER_LISTS_OFFSET = 0x12000
const CHANNEL_ZONE_MEMBERSHIP_OFFSET = 0x14000
const CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET = 0x15000
const ZONE_NAMES_OFFSET = 0x16000
const BAND_A_ZONE_SELECTION_OFFSET = 0x16342
const BAND_B_ZONE_SELECTION_OFFSET = 0x16346
const SCAN_LIST_NAMES_OFFSET = 0x16500
const MEMBER_LIST_SIZE = 0x100
const MEMBER_LIST_SLOT_COUNT = 128

test("exposes ordered Zones and Scan Lists through the Codeplug interface", () => {
  const bytes = blankMembershipCodeplug()

  writeName(bytes, ZONE_NAMES_OFFSET, "Local")
  writeName(bytes, SCAN_LIST_NAMES_OFFSET, "Daily")
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 0, 0)
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 2, 2)
  writeOrderedMember(bytes, SCAN_LIST_MEMBER_LISTS_OFFSET, 0, 0, 1)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0, 0, true)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 2, 0, true)
  writeMembership(bytes, CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 1, 0, true)

  const codeplug = createCodeplug(bytes)
  const zones = codeplug.getZones()
  const scanLists = codeplug.getScanLists()

  assert.deepEqual(zones[0], {
    number: 1,
    name: "Local",
    channelNumbers: [1, 3],
  })
  assert.deepEqual(scanLists[0], {
    number: 1,
    name: "Daily",
    channelNumbers: [2],
  })
  assert.deepEqual(codeplug.getChannels()[0].zoneNames, ["Local"])
  assert.deepEqual(codeplug.getChannels()[1].scanListNames, ["Daily"])
  assert.equal(Object.isFrozen(zones), true)
  assert.equal(Object.isFrozen(zones[0]), true)
  assert.equal(Object.isFrozen(zones[0].channelNumbers), true)
  assert.deepEqual(codeplug.validateMembershipConsistency(), [])
})

test("edits a collection and synchronizes its ordered list and bitmap", () => {
  const bytes = blankMembershipCodeplug()
  bytes[CHANNEL_ZONE_MEMBERSHIP_OFFSET + 2] = 0x12
  bytes[CHANNEL_ZONE_MEMBERSHIP_OFFSET + 7] = 0x34
  writeName(bytes, ZONE_NAMES_OFFSET, "Local")
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 0, 1)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 1, 0, true)
  const baseline = createCodeplug(bytes)

  const edited = baseline
    .editZone(2, {
      name: "Travel",
      channelNumbers: [3, 1],
    })
    .editScanList(1, {
      name: "Daily",
      channelNumbers: [2],
    })
  const editedBytes = edited.toBytes()

  assert.deepEqual(edited.getZones()[1], {
    number: 2,
    name: "Travel",
    channelNumbers: [3, 1],
  })
  assert.deepEqual(edited.getChannels()[0].zoneNames, ["Travel"])
  assert.deepEqual(edited.getChannels()[1].zoneNames, ["Local"])
  assert.deepEqual(edited.getChannels()[2].zoneNames, ["Travel"])
  assert.deepEqual(edited.getScanLists()[0], {
    number: 1,
    name: "Daily",
    channelNumbers: [2],
  })
  assert.deepEqual(edited.getChannels()[1].scanListNames, ["Daily"])
  assert.equal(
    readOrderedMember(editedBytes, ZONE_MEMBER_LISTS_OFFSET, 1, 0),
    2
  )
  assert.equal(
    readOrderedMember(editedBytes, ZONE_MEMBER_LISTS_OFFSET, 1, 1),
    0
  )
  assert.equal(
    readOrderedMember(editedBytes, ZONE_MEMBER_LISTS_OFFSET, 1, 2),
    0xffff
  )
  assert.equal(editedBytes[CHANNEL_ZONE_MEMBERSHIP_OFFSET + 2], 0x12)
  assert.equal(editedBytes[CHANNEL_ZONE_MEMBERSHIP_OFFSET + 7], 0x34)
  assert.deepEqual(edited.validateMembershipConsistency(), [])
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("tracks Zone fields against the baseline and removes reverted changes", () => {
  const bytes = blankMembershipCodeplug()
  writeName(bytes, ZONE_NAMES_OFFSET, "Local")
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 0, 0)
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 1, 1)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0, 0, true)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 1, 0, true)
  const baseline = createCodeplug(bytes)

  const edited = baseline.editZone(1, {
    name: "Repeaters",
    channelNumbers: [2, 1],
  })
  const changed = reconcileZoneEditChanges([], baseline, edited, 1, [
    "name",
    "channelNumbers",
  ])

  assert.deepEqual(
    changed.map((change) => change.kind),
    ["edit-zone", "edit-zone"]
  )

  const nameReverted = edited.editZone(1, { name: "Local" })
  const membershipOnly = reconcileZoneEditChanges(
    changed,
    baseline,
    nameReverted,
    1,
    ["name"]
  )
  assert.deepEqual(membershipOnly, [
    { kind: "edit-zone", number: 1, field: "channelNumbers" },
  ])

  const fullyReverted = nameReverted.editZone(1, { channelNumbers: [1, 2] })
  assert.deepEqual(
    reconcileZoneEditChanges(membershipOnly, baseline, fullyReverted, 1, [
      "channelNumbers",
    ]),
    []
  )
})

test("decodes and edits independent multi-Zone selections for both bands", () => {
  const bytes = blankMembershipCodeplug()
  const view = new DataView(bytes.buffer)
  view.setUint32(BAND_A_ZONE_SELECTION_OFFSET, 0xabcd0001, true)
  view.setUint32(BAND_B_ZONE_SELECTION_OFFSET, 0x12340000, true)
  const baseline = createCodeplug(bytes)

  assert.deepEqual(baseline.getBandZoneSelections(), { A: [1], B: [] })

  const edited = baseline
    .editBandZoneSelection("A", [1, 2])
    .editBandZoneSelection("B", [2, 3])
  const editedBytes = edited.toBytes()
  const editedView = new DataView(editedBytes.buffer)

  assert.deepEqual(edited.getBandZoneSelections(), { A: [1, 2], B: [2, 3] })
  assert.equal(
    editedView.getUint32(BAND_A_ZONE_SELECTION_OFFSET, true),
    0xabcd0003
  )
  assert.equal(
    editedView.getUint32(BAND_B_ZONE_SELECTION_OFFSET, true),
    0x12340006
  )
  assert.deepEqual(baseline.toBytes(), bytes)

  const changed = reconcileBandZoneSelectionChange([], baseline, edited, "A")
  assert.deepEqual(changed, [{ kind: "edit-band-zone-selection", band: "A" }])

  const reverted = edited.editBandZoneSelection("A", [1])
  assert.deepEqual(
    reconcileBandZoneSelectionChange(changed, baseline, reverted, "A"),
    []
  )
  assert.throws(
    () => baseline.editBandZoneSelection("A", [1, 1]),
    /same Zone twice/
  )
  assert.throws(
    () => baseline.editBandZoneSelection("B", [17]),
    /between 1 and 16/
  )
})

test("edits one Channel's Zone and Scan List memberships without losing order", () => {
  const bytes = blankMembershipCodeplug()
  writeName(bytes, ZONE_NAMES_OFFSET, "Local")
  writeName(bytes, ZONE_NAMES_OFFSET + 0x18, "Travel")
  writeName(bytes, SCAN_LIST_NAMES_OFFSET, "Daily")
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 0, 0)
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 2, 2)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0, 0, true)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 2, 0, true)

  const added = createCodeplug(bytes).editChannelMemberships(2, {
    zoneNumbers: [1, 2],
    scanListNumbers: [1],
  })

  assert.deepEqual(added.getZones()[0].channelNumbers, [1, 3, 2])
  assert.deepEqual(added.getZones()[1].channelNumbers, [2])
  assert.deepEqual(added.getScanLists()[0].channelNumbers, [2])
  assert.deepEqual(added.getChannels()[1].zoneNames, ["Local", "Travel"])
  assert.deepEqual(added.getChannels()[1].scanListNames, ["Daily"])
  assert.deepEqual(added.validateMembershipConsistency(), [])

  const removed = added.editChannelMemberships(2, {
    zoneNumbers: [2],
    scanListNumbers: [],
  })

  assert.deepEqual(removed.getZones()[0].channelNumbers, [1, 3])
  assert.deepEqual(removed.getZones()[1].channelNumbers, [2])
  assert.deepEqual(removed.getScanLists()[0].channelNumbers, [])
  assert.deepEqual(removed.getChannels()[1].zoneNames, ["Travel"])
  assert.deepEqual(removed.getChannels()[1].scanListNames, [])
  assert.deepEqual(removed.validateMembershipConsistency(), [])
})

test("rejects membership edits that exceed storage or cannot be encoded", () => {
  const codeplug = createCodeplug(blankMembershipCodeplug())
  const fullZone = codeplug.editZone(1, {
    channelNumbers: Array.from(
      { length: MEMBER_LIST_SLOT_COUNT },
      (_, index) => index + 1
    ),
  })
  const reusedCapacity = fullZone
    .editChannelMemberships(64, { zoneNumbers: [] })
    .editChannelMemberships(129, { zoneNumbers: [1] })

  assert.equal(reusedCapacity.getZones()[0].channelNumbers.length, 128)
  assert.equal(reusedCapacity.getZones()[0].channelNumbers.includes(64), false)
  assert.equal(reusedCapacity.getZones()[0].channelNumbers.at(-1), 129)

  assert.throws(
    () =>
      fullZone.editChannelMemberships(MEMBER_LIST_SLOT_COUNT + 1, {
        zoneNumbers: [1],
      }),
    /cannot contain more than 128 Channels/
  )
  assert.throws(
    () =>
      codeplug.editZone(1, {
        channelNumbers: Array.from(
          { length: MEMBER_LIST_SLOT_COUNT + 1 },
          (_, index) => index + 1
        ),
      }),
    /more than 128 Channels/
  )
  assert.throws(
    () => codeplug.editZone(1, { channelNumbers: [1, 1] }),
    /same Channel twice/
  )
  assert.throws(
    () => codeplug.editZone(1, { channelNumbers: [0] }),
    /between 1 and 1000/
  )
  assert.throws(
    () => codeplug.editScanList(17, { name: "Invalid" }),
    /Collection number must be between 1 and 16/
  )
  assert.throws(
    () => codeplug.editZone(1, { name: "ş".repeat(13) }),
    /24 UTF-8 bytes/
  )
  assert.throws(
    () => codeplug.editScanList(1, { name: "Bad\0Name" }),
    /null character/
  )
  assert.throws(
    () => codeplug.editChannelMemberships(1, { zoneNumbers: [1, 1] }),
    /same membership twice/
  )
})

test("reports ordered-list and bitmap consistency problems with stable codes", () => {
  const bytes = blankMembershipCodeplug()
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 0, 0)
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 1, 0)
  writeOrderedMember(bytes, ZONE_MEMBER_LISTS_OFFSET, 0, 2, 1_000)
  writeMembership(bytes, CHANNEL_ZONE_MEMBERSHIP_OFFSET, 1, 0, true)

  const issues = createCodeplug(bytes).validateMembershipConsistency()

  assert.deepEqual(issues, [
    {
      code: "duplicate-ordered-member",
      collection: "zone",
      collectionNumber: 1,
      memberSlot: 2,
      channelNumber: 1,
    },
    {
      code: "invalid-ordered-member",
      collection: "zone",
      collectionNumber: 1,
      memberSlot: 3,
      storedChannelIndex: 1_000,
    },
    {
      code: "ordered-member-missing-from-bitmap",
      collection: "zone",
      collectionNumber: 1,
      channelNumber: 1,
    },
    {
      code: "bitmap-member-missing-from-ordered-list",
      collection: "zone",
      collectionNumber: 1,
      channelNumber: 2,
    },
  ])
  assert.equal(Object.isFrozen(issues), true)
  assert.equal(Object.isFrozen(issues[0]), true)
})

function blankMembershipCodeplug() {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(0xff, ZONE_MEMBER_LISTS_OFFSET, ZONE_MEMBER_LISTS_OFFSET + 0x1000)
  bytes.fill(
    0xff,
    SCAN_LIST_MEMBER_LISTS_OFFSET,
    SCAN_LIST_MEMBER_LISTS_OFFSET + 0x1000
  )
  bytes.fill(
    0xff,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + 4_000
  )
  bytes.fill(
    0xff,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 4_000
  )
  return bytes
}

function writeName(bytes: Uint8Array, offset: number, name: string) {
  bytes.set(new TextEncoder().encode(name), offset)
}

function writeOrderedMember(
  bytes: Uint8Array,
  listsOffset: number,
  collectionIndex: number,
  slot: number,
  channelIndex: number
) {
  new DataView(bytes.buffer).setUint16(
    listsOffset + collectionIndex * MEMBER_LIST_SIZE + slot * 2,
    channelIndex,
    false
  )
}

function readOrderedMember(
  bytes: Uint8Array,
  listsOffset: number,
  collectionIndex: number,
  slot: number
) {
  return new DataView(bytes.buffer).getUint16(
    listsOffset + collectionIndex * MEMBER_LIST_SIZE + slot * 2,
    false
  )
}

function writeMembership(
  bytes: Uint8Array,
  bitmapOffset: number,
  channelIndex: number,
  collectionIndex: number,
  member: boolean
) {
  const offset =
    bitmapOffset + channelIndex * 4 + Math.floor(collectionIndex / 8)
  const mask = 1 << (collectionIndex % 8)
  bytes[offset] = member ? bytes[offset] & ~mask : bytes[offset] | mask
}
