import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import {
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
  reconcileSpecialChannelEditChanges,
} from "../modules/cps-workspace/change-set.ts"

const CHANNEL_RECORD_SIZE = 48
const VALIDITY_BITMAP_OFFSET = 0xd000
const SCAN_BITMAP_OFFSET = 0xd080
const ZONE_MEMBER_LISTS_OFFSET = 0x10000
const SCAN_LIST_MEMBER_LISTS_OFFSET = 0x12000
const CHANNEL_ZONE_MEMBERSHIP_OFFSET = 0x14000
const CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET = 0x15000
const ZONE_NAMES_OFFSET = 0x16000
const SCAN_LIST_NAMES_OFFSET = 0x16500
const MEMBERSHIP_BITMAP_RECORD_SIZE = 4
const VFO_RECORDS_OFFSET = 0xbb80
const CALL_RECORDS_OFFSET = 0xbbe0

test("decodes a documented Channel through the Codeplug interface", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)
  const channel = 0

  view.setUint32(channel + 0x00, 145_525_000, false)
  view.setUint32(channel + 0x04, 145_125_000, false)
  bytes.set(new TextEncoder().encode("İstanbul 1"), channel + 0x08)
  view.setUint32(channel + 0x20, 400_000, false)
  bytes[channel + 0x24] = 1 | (1 << 2) | (6 << 4)
  bytes[channel + 0x25] = 1 | (2 << 3) | (1 << 5) | (2 << 6)
  bytes[channel + 0x26] = (3 << 2) | (1 << 5)
  bytes[channel + 0x27] = 4 | (2 << 3) | (3 << 5)
  bytes[channel + 0x28] = 20
  bytes[channel + 0x29] = 7
  bytes[channel + 0x2a] = 2
  bytes[channel + 0x2b] = 4
  bytes[channel + 0x2c] = 3
  bytes[channel + 0x2d] = 8
  bytes[channel + 0x2e] = 2
  bytes[channel + 0x2f] = 0xa5
  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0001
  bytes[SCAN_BITMAP_OFFSET] = 0b0000_0010
  bytes.fill(
    0xff,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + MEMBERSHIP_BITMAP_RECORD_SIZE
  )
  bytes.fill(
    0xff,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + MEMBERSHIP_BITMAP_RECORD_SIZE
  )

  const codeplug = createCodeplug(bytes)
  const [result] = codeplug.getChannels()

  assert.deepEqual(result, {
    number: 1,
    valid: true,
    scan: "priority",
    zoneNames: [],
    scanListNames: [],
    name: "İstanbul 1",
    receiveFrequencyHz: 145_525_000,
    transmitFrequencyHz: 145_125_000,
    offsetFrequencyHz: 400_000,
    duplex: "negative",
    reverse: "talk-around",
    stepKHz: 12.5,
    modulation: "fm-narrow",
    transmitPower: "high",
    receiveOnly: true,
    busyChannelLockout: "carrier",
    squelch: "tone-and-optional-signaling",
    transmitTone: { kind: "ctcss", frequencyHz: 131.8 },
    receiveTone: { kind: "dcs", code: "047", reverse: true },
    dcsPolarity: "tx-inverted-rx-normal",
    compander: "transmit-and-receive",
    optionalSignaling: { kind: "two-tone", index: 4 },
    scrambler: 2900,
    pttId: 7,
    aprsReceive: "on-muted",
  })

  assert.deepEqual(codeplug.toBytes(), bytes)
})

test("treats erased membership names as empty", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  bytes[VALIDITY_BITMAP_OFFSET] = 1
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  bytes.fill(0xff, ZONE_NAMES_OFFSET, ZONE_NAMES_OFFSET + 0x18)
  bytes.fill(0xff, SCAN_LIST_NAMES_OFFSET, SCAN_LIST_NAMES_OFFSET + 0x18)

  const [channel] = createCodeplug(bytes).getChannels()

  assert.deepEqual(channel.zoneNames, [])
  assert.deepEqual(channel.scanListNames, [])
})

test("decodes the hardware-verified Zone and Scan List layout", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0011
  writeUtf8(bytes, ZONE_NAMES_OFFSET, "Antalya")
  writeUtf8(bytes, ZONE_NAMES_OFFSET + 0x18, "Burdur")
  writeUtf8(bytes, SCAN_LIST_NAMES_OFFSET, "Local")
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 4, 0xffff_fffd, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 4, 0xffff_ffff, true)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 0, false)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET + 0x100, 1, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 0, false)

  const channels = createCodeplug(bytes).getChannels().slice(0, 2)

  assert.deepEqual(
    channels.map(({ zoneNames, scanListNames }) => ({
      zoneNames,
      scanListNames,
    })),
    [
      { zoneNames: ["Antalya"], scanListNames: ["Local"] },
      { zoneNames: ["Burdur"], scanListNames: [] },
    ]
  )
})

test("moves a Memory Channel with its metadata and remaps ordered memberships", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  writeChannel(bytes, 0, "Alpha", 145_100_000)
  writeChannel(bytes, 1, "Bravo", 145_200_000)
  writeChannel(bytes, 2, "Charlie", 145_300_000)
  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0101
  setScan(bytes, 1, 1)
  setScan(bytes, 2, 2)
  setScan(bytes, 3, 0)

  writeUtf8(bytes, ZONE_NAMES_OFFSET, "Local")
  writeUtf8(bytes, ZONE_NAMES_OFFSET + 0x18, "Travel")
  writeUtf8(bytes, SCAN_LIST_NAMES_OFFSET, "Daily")
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 4, 0xffff_fffd, true)
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 8, 0xffff_ffff, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 4, 0xffff_ffff, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 8, 0xffff_ffff, true)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 0, false)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET + 0x100, 1, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 0, false)

  const moved = createCodeplug(bytes).moveMemoryChannel(1, 3)
  const channels = moved.getChannels().slice(0, 3)
  const movedBytes = moved.toBytes()
  const movedView = new DataView(movedBytes.buffer)

  assert.deepEqual(
    channels.map(({ number, name, valid, scan, zoneNames, scanListNames }) => ({
      number,
      name,
      valid,
      scan,
      zoneNames,
      scanListNames,
    })),
    [
      {
        number: 1,
        name: "Bravo",
        valid: false,
        scan: "priority",
        zoneNames: ["Travel"],
        scanListNames: [],
      },
      {
        number: 2,
        name: "Charlie",
        valid: true,
        scan: "off",
        zoneNames: [],
        scanListNames: [],
      },
      {
        number: 3,
        name: "Alpha",
        valid: true,
        scan: "skip",
        zoneNames: ["Local"],
        scanListNames: ["Daily"],
      },
    ]
  )
  assert.equal(movedView.getUint16(ZONE_MEMBER_LISTS_OFFSET, false), 2)
  assert.equal(movedView.getUint16(ZONE_MEMBER_LISTS_OFFSET + 0x100, false), 0)
  assert.equal(movedView.getUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, false), 2)
  assert.equal(
    movedView.getUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 8, true),
    0xffff_fffe
  )
  assert.equal(
    movedView.getUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 8, true),
    0xffff_fffe
  )
  assert.deepEqual(createCodeplug(bytes).getChannels()[0].name, "Alpha")
})

test("adds a clean default Memory Channel in the first unused slot", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  writeChannel(bytes, 0, "Existing", 433_500_000)
  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0001
  bytes.fill(0xa5, CHANNEL_RECORD_SIZE, CHANNEL_RECORD_SIZE * 2)
  writeUtf8(bytes, ZONE_NAMES_OFFSET, "Local")
  writeUtf8(bytes, SCAN_LIST_NAMES_OFFSET, "Daily")
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 4, 0, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 4, 0, true)
  bytes.fill(0xff, ZONE_MEMBER_LISTS_OFFSET, ZONE_MEMBER_LISTS_OFFSET + 0x100)
  bytes.fill(
    0xff,
    SCAN_LIST_MEMBER_LISTS_OFFSET,
    SCAN_LIST_MEMBER_LISTS_OFFSET + 0x100
  )
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 1, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 1, false)

  const added = createCodeplug(bytes).addMemoryChannel()
  const channel = added.getChannels()[1]
  const addedView = new DataView(added.toBytes().buffer)

  assert.deepEqual(
    {
      number: channel.number,
      valid: channel.valid,
      scan: channel.scan,
      name: channel.name,
      receiveFrequencyHz: channel.receiveFrequencyHz,
      transmitFrequencyHz: channel.transmitFrequencyHz,
      offsetFrequencyHz: channel.offsetFrequencyHz,
      duplex: channel.duplex,
      reverse: channel.reverse,
      stepKHz: channel.stepKHz,
      modulation: channel.modulation,
      transmitPower: channel.transmitPower,
      receiveOnly: channel.receiveOnly,
      busyChannelLockout: channel.busyChannelLockout,
      squelch: channel.squelch,
      transmitTone: channel.transmitTone,
      receiveTone: channel.receiveTone,
      dcsPolarity: channel.dcsPolarity,
      compander: channel.compander,
      optionalSignaling: channel.optionalSignaling,
      scrambler: channel.scrambler,
      pttId: channel.pttId,
      aprsReceive: channel.aprsReceive,
      zoneNames: channel.zoneNames,
      scanListNames: channel.scanListNames,
    },
    {
      number: 2,
      valid: true,
      scan: "off",
      name: "",
      receiveFrequencyHz: 145_500_000,
      transmitFrequencyHz: 145_500_000,
      offsetFrequencyHz: 0,
      duplex: "off",
      reverse: "off",
      stepKHz: 12.5,
      modulation: "fm",
      transmitPower: "low",
      receiveOnly: false,
      busyChannelLockout: "off",
      squelch: "carrier",
      transmitTone: { kind: "off" },
      receiveTone: { kind: "off" },
      dcsPolarity: "normal",
      compander: "off",
      optionalSignaling: { kind: "off", index: 0 },
      scrambler: "off",
      pttId: "off",
      aprsReceive: "off",
      zoneNames: [],
      scanListNames: [],
    }
  )
  assert.equal(addedView.getUint16(ZONE_MEMBER_LISTS_OFFSET, false), 0xffff)
  assert.equal(
    addedView.getUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, false),
    0xffff
  )
})

test("copies a Memory Channel directly below it with its fields and memberships", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  writeChannel(bytes, 0, "Alpha", 145_100_000)
  writeChannel(bytes, 1, "Bravo", 145_200_000)
  bytes[0x2f] = 0xa5
  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0011
  setScan(bytes, 1, 2)
  clearMembershipStorage(bytes)
  writeUtf8(bytes, ZONE_NAMES_OFFSET, "Local")
  writeUtf8(bytes, SCAN_LIST_NAMES_OFFSET, "Daily")
  view.setUint32(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint32(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xffff_fffe, true)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 0, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 0, false)

  const copied = createCodeplug(bytes).duplicateMemoryChannel(1)
  const channels = copied.getChannels()
  const copiedBytes = copied.toBytes()
  const copiedView = new DataView(copiedBytes.buffer)
  const sourceRecord = copiedBytes.slice(0, CHANNEL_RECORD_SIZE)
  const copyRecord = copiedBytes.slice(
    CHANNEL_RECORD_SIZE,
    CHANNEL_RECORD_SIZE * 2
  )
  sourceRecord.fill(0, 0x08, 0x20)
  copyRecord.fill(0, 0x08, 0x20)

  assert.deepEqual(
    channels.slice(0, 3).map(({ number, name, valid, scan }) => ({
      number,
      name,
      valid,
      scan,
    })),
    [
      { number: 1, name: "Alpha", valid: true, scan: "priority" },
      { number: 2, name: "Alpha Copy", valid: true, scan: "priority" },
      { number: 3, name: "Bravo", valid: true, scan: "off" },
    ]
  )
  assert.deepEqual(copyRecord, sourceRecord)
  assert.deepEqual(channels[1].zoneNames, ["Local"])
  assert.deepEqual(channels[1].scanListNames, ["Daily"])
  assert.deepEqual(
    [0, 1].map((slot) =>
      copiedView.getUint16(ZONE_MEMBER_LISTS_OFFSET + slot * 2, false)
    ),
    [0, 1]
  )
  assert.deepEqual(
    [0, 1].map((slot) =>
      copiedView.getUint16(SCAN_LIST_MEMBER_LISTS_OFFSET + slot * 2, false)
    ),
    [0, 1]
  )
  assert.deepEqual(createCodeplug(bytes).getChannels()[0].name, "Alpha")
})

test("keeps a copied Memory Channel name within the UTF-8 byte limit", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  writeChannel(bytes, 0, "ş".repeat(10), 145_100_000)
  bytes[VALIDITY_BITMAP_OFFSET] = 1
  clearMembershipStorage(bytes)

  const copied = createCodeplug(bytes)
    .duplicateMemoryChannel(1)
    .getChannels()[1]

  assert.equal(copied.name, `${"ş".repeat(9)} Copy`)
  assert.ok(new TextEncoder().encode(copied.name).byteLength <= 24)
})

test("rejects copying an unused Memory Channel", () => {
  const codeplug = createCodeplug(new Uint8Array(CODEPLUG_SIZE))

  assert.throws(
    () => codeplug.duplicateMemoryChannel(1),
    /Only used Memory Channels can be copied/
  )
})

test("rejects adding a Memory Channel when all slots are used", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(0xff, VALIDITY_BITMAP_OFFSET, VALIDITY_BITMAP_OFFSET + 125)

  assert.throws(
    () => createCodeplug(bytes).addMemoryChannel(),
    /All Memory Channel slots are in use/
  )
  assert.throws(
    () => createCodeplug(bytes).duplicateMemoryChannel(1),
    /All Memory Channel slots are in use/
  )
})

test("cancels a pending copy when the copied Memory Channel is deleted", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  writeChannel(bytes, 0, "Alpha", 145_100_000)
  bytes[VALIDITY_BITMAP_OFFSET] = 1
  clearMembershipStorage(bytes)
  const baseline = createCodeplug(bytes)
  const copied = baseline.duplicateMemoryChannel(1)
  const copiedResult = reconcileMemoryChannelStructureChange(
    [],
    baseline,
    baseline,
    copied,
    { kind: "add-memory-channel", number: 2 }
  )
  const deleted = copiedResult.codeplug.deleteMemoryChannel(2)
  const deletedResult = reconcileMemoryChannelStructureChange(
    copiedResult.changes,
    baseline,
    copiedResult.codeplug,
    deleted,
    { kind: "delete-memory-channel", number: 2 }
  )

  assert.equal(deletedResult.changes.length, 0)
  assert.equal(deletedResult.codeplug.equals(baseline), true)
})

test("cancels a pending add when the same new Memory Channel is deleted", () => {
  const baseline = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const added = baseline.addMemoryChannel()
  const addedResult = reconcileMemoryChannelStructureChange(
    [],
    baseline,
    baseline,
    added,
    { kind: "add-memory-channel", number: 1 }
  )
  const edited = addedResult.codeplug.editMemoryChannel(1, {
    name: "Temporary",
  })
  const editedChanges = reconcileMemoryChannelEditChanges(
    addedResult.changes,
    baseline,
    edited,
    1,
    ["name"]
  )
  const deleted = edited.deleteMemoryChannel(1)
  const deletedResult = reconcileMemoryChannelStructureChange(
    editedChanges,
    baseline,
    edited,
    deleted,
    { kind: "delete-memory-channel", number: 1 }
  )

  assert.equal(deletedResult.changes.length, 0)
  assert.equal(deletedResult.codeplug.equals(baseline), true)
})

test("deletes a Memory Channel, compacts rows, and repairs memberships", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)

  writeChannel(bytes, 0, "Alpha", 145_100_000)
  writeChannel(bytes, 1, "Bravo", 145_200_000)
  writeChannel(bytes, 2, "Charlie", 145_300_000)
  bytes[VALIDITY_BITMAP_OFFSET] = 0b0000_0111
  setScan(bytes, 1, 1)
  setScan(bytes, 2, 2)
  setScan(bytes, 3, 0)
  bytes.fill(
    0xff,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET,
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + 3 * MEMBERSHIP_BITMAP_RECORD_SIZE
  )
  bytes.fill(
    0xff,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 3 * MEMBERSHIP_BITMAP_RECORD_SIZE
  )
  bytes.fill(0xff, ZONE_MEMBER_LISTS_OFFSET, ZONE_MEMBER_LISTS_OFFSET + 0x100)
  bytes.fill(
    0xff,
    SCAN_LIST_MEMBER_LISTS_OFFSET,
    SCAN_LIST_MEMBER_LISTS_OFFSET + 0x100
  )
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 0, false)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET + 2, 1, false)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET + 4, 2, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 1, false)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET + 2, 2, false)

  const deleted = createCodeplug(bytes).deleteMemoryChannel(2)
  const channels = deleted.getChannels()
  const deletedView = new DataView(deleted.toBytes().buffer)

  assert.deepEqual(
    channels.slice(0, 3).map(({ number, name, valid, scan }) => ({
      number,
      name,
      valid,
      scan,
    })),
    [
      { number: 1, name: "Alpha", valid: true, scan: "skip" },
      { number: 2, name: "Charlie", valid: true, scan: "off" },
      { number: 3, name: "", valid: false, scan: "off" },
    ]
  )
  assert.deepEqual(
    [0, 1, 2].map((slot) =>
      deletedView.getUint16(ZONE_MEMBER_LISTS_OFFSET + slot * 2, false)
    ),
    [0, 1, 0xffff]
  )
  assert.deepEqual(
    [0, 1].map((slot) =>
      deletedView.getUint16(SCAN_LIST_MEMBER_LISTS_OFFSET + slot * 2, false)
    ),
    [1, 0xffff]
  )
  assert.equal(channels[999].valid, false)
  assert.equal(channels[999].name, "")
  assert.equal(channels[999].receiveFrequencyHz, 0)
})

test("decodes VFO A/B and Call 1/2 through separate read interfaces", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  writeChannelAtOffset(bytes, VFO_RECORDS_OFFSET, "Hidden VFO A", 144_500_000)
  writeChannelAtOffset(
    bytes,
    VFO_RECORDS_OFFSET + CHANNEL_RECORD_SIZE,
    "Hidden VFO B",
    433_500_000
  )
  writeChannelAtOffset(bytes, CALL_RECORDS_OFFSET, "Local Call", 145_500_000)
  writeChannelAtOffset(
    bytes,
    CALL_RECORDS_OFFSET + CHANNEL_RECORD_SIZE,
    "Travel Call",
    433_525_000
  )

  const codeplug = createCodeplug(bytes)
  const vfo = codeplug.getVfoChannels()
  const call = codeplug.getCallChannels()

  assert.deepEqual(
    vfo.map(({ slot, receiveFrequencyHz }) => ({ slot, receiveFrequencyHz })),
    [
      { slot: "A", receiveFrequencyHz: 144_500_000 },
      { slot: "B", receiveFrequencyHz: 433_500_000 },
    ]
  )
  assert.deepEqual(
    call.map(({ slot, name, receiveFrequencyHz }) => ({
      slot,
      name,
      receiveFrequencyHz,
    })),
    [
      { slot: 1, name: "Local Call", receiveFrequencyHz: 145_500_000 },
      { slot: 2, name: "Travel Call", receiveFrequencyHz: 433_525_000 },
    ]
  )
  assert.equal(Object.isFrozen(vfo), true)
  assert.equal(Object.isFrozen(call[0]), true)
})

test("edits VFO and Call Channel records without touching adjacent bytes", () => {
  const bytes = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 17 + 9) & 0xff
  )
  writeChannelAtOffset(bytes, VFO_RECORDS_OFFSET, "Hidden VFO A", 144_500_000)
  writeChannelAtOffset(
    bytes,
    CALL_RECORDS_OFFSET + CHANNEL_RECORD_SIZE,
    "Call 2",
    433_500_000
  )
  const baseline = createCodeplug(bytes)
  const originalVfoName = baseline.getVfoChannels()[0].name

  const edited = baseline
    .editVfoChannel("A", {
      receiveFrequencyHz: 145_500_000,
      duplex: "positive",
      offsetFrequencyHz: 600_000,
      transmitTone: { kind: "ctcss", frequencyHz: 88.5 },
    })
    .editCallChannel(2, {
      name: "Local Call",
      modulation: "fm-narrow",
      receiveTone: { kind: "dcs", code: "023", reverse: true },
    })

  const vfoA = edited.getVfoChannels()[0]
  const call2 = edited.getCallChannels()[1]
  assert.equal(vfoA.name, originalVfoName)
  assert.equal(vfoA.receiveFrequencyHz, 145_500_000)
  assert.equal(vfoA.duplex, "positive")
  assert.equal(vfoA.offsetFrequencyHz, 600_000)
  assert.deepEqual(vfoA.transmitTone, {
    kind: "ctcss",
    frequencyHz: 88.5,
  })
  assert.equal(call2.name, "Local Call")
  assert.equal(call2.modulation, "fm-narrow")
  assert.deepEqual(call2.receiveTone, {
    kind: "dcs",
    code: "023",
    reverse: true,
  })
  assert.equal(
    edited.toBytes()[VFO_RECORDS_OFFSET + CHANNEL_RECORD_SIZE - 1],
    bytes[VFO_RECORDS_OFFSET + CHANNEL_RECORD_SIZE - 1]
  )
  assert.equal(
    edited.toBytes()[CALL_RECORDS_OFFSET + 2 * CHANNEL_RECORD_SIZE],
    bytes[CALL_RECORDS_OFFSET + 2 * CHANNEL_RECORD_SIZE]
  )
})

test("removes VFO and Call changes when fields return to baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  writeChannelAtOffset(bytes, VFO_RECORDS_OFFSET, "Hidden", 144_500_000)
  writeChannelAtOffset(bytes, CALL_RECORDS_OFFSET, "Local", 145_500_000)
  const baseline = createCodeplug(bytes)

  const changedVfo = baseline.editVfoChannel("A", { duplex: "split" })
  const vfoChanges = reconcileSpecialChannelEditChanges(
    [],
    baseline,
    changedVfo,
    { kind: "vfo", slot: "A", fields: ["duplex"] }
  )
  assert.deepEqual(vfoChanges, [
    { kind: "edit-vfo-channel", slot: "A", field: "duplex" },
  ])

  const changedCall = changedVfo.editCallChannel(1, { name: "Travel" })
  const callChanges = reconcileSpecialChannelEditChanges(
    vfoChanges,
    baseline,
    changedCall,
    { kind: "call", slot: 1, fields: ["name"] }
  )
  assert.equal(callChanges.length, 2)

  const revertedVfo = changedCall.editVfoChannel("A", { duplex: "off" })
  const withoutVfoChange = reconcileSpecialChannelEditChanges(
    callChanges,
    baseline,
    revertedVfo,
    { kind: "vfo", slot: "A", fields: ["duplex"] }
  )
  assert.deepEqual(withoutVfoChange, [
    { kind: "edit-call-channel", slot: 1, field: "name" },
  ])

  const revertedCall = revertedVfo.editCallChannel(1, { name: "Local" })
  assert.deepEqual(
    reconcileSpecialChannelEditChanges(
      withoutVfoChange,
      baseline,
      revertedCall,
      { kind: "call", slot: 1, fields: ["name"] }
    ),
    []
  )
})

test("maps validity and scan bitmap entries across byte boundaries", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const validChannels = [1, 8, 9, 1000]
  const scans = new Map([
    [1, "off"],
    [4, "reserved"],
    [5, "skip"],
    [1000, "priority"],
  ] as const)

  for (const number of validChannels) {
    const index = number - 1
    bytes[VALIDITY_BITMAP_OFFSET + Math.floor(index / 8)] |= 1 << (index % 8)
  }

  setScan(bytes, 4, 3)
  setScan(bytes, 5, 1)
  setScan(bytes, 1000, 2)

  const channels = createCodeplug(bytes).getChannels()

  assert.equal(channels.length, 1000)
  for (const number of validChannels) {
    assert.equal(channels[number - 1].valid, true)
  }
  assert.equal(channels[1].valid, false)
  for (const [number, scan] of scans) {
    assert.equal(channels[number - 1].scan, scan)
  }
})

test("uses documented labels for zero Scan Flag and reserved TX power", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[VALIDITY_BITMAP_OFFSET] = 1
  bytes[0x25] = 3 << 3

  const [channel] = createCodeplug(bytes).getChannels()

  assert.equal(channel.scan, "off")
  assert.equal(channel.transmitPower, "reserved")
})

test("edits documented Memory Channel fields without regenerating the record", () => {
  const bytes = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 31 + 17) & 0xff
  )
  const originalReservedByte = bytes[0x2f]

  const edited = createCodeplug(bytes).editMemoryChannel(1, {
    valid: true,
    scan: "priority",
    name: "Çağrı 1",
    receiveFrequencyHz: 145_525_000,
    transmitFrequencyHz: 145_125_000,
    offsetFrequencyHz: 400_000,
    duplex: "negative",
    reverse: "talk-around",
    stepKHz: 12.5,
    modulation: "fm-narrow",
    transmitPower: "high",
    receiveOnly: true,
    busyChannelLockout: "carrier",
    squelch: "tone-and-optional-signaling",
    dcsPolarity: "tx-inverted-rx-normal",
    compander: "transmit-and-receive",
    optionalSignaling: { kind: "two-tone", index: 4 },
    scrambler: 2900,
    pttId: 7,
    aprsReceive: "on-muted",
  })
  const [channel] = edited.getChannels()

  assert.deepEqual(
    {
      valid: channel.valid,
      scan: channel.scan,
      name: channel.name,
      receiveFrequencyHz: channel.receiveFrequencyHz,
      transmitFrequencyHz: channel.transmitFrequencyHz,
      offsetFrequencyHz: channel.offsetFrequencyHz,
      duplex: channel.duplex,
      reverse: channel.reverse,
      stepKHz: channel.stepKHz,
      modulation: channel.modulation,
      transmitPower: channel.transmitPower,
      receiveOnly: channel.receiveOnly,
      busyChannelLockout: channel.busyChannelLockout,
      squelch: channel.squelch,
      dcsPolarity: channel.dcsPolarity,
      compander: channel.compander,
      optionalSignaling: channel.optionalSignaling,
      scrambler: channel.scrambler,
      pttId: channel.pttId,
      aprsReceive: channel.aprsReceive,
    },
    {
      valid: true,
      scan: "priority",
      name: "Çağrı 1",
      receiveFrequencyHz: 145_525_000,
      transmitFrequencyHz: 145_125_000,
      offsetFrequencyHz: 400_000,
      duplex: "negative",
      reverse: "talk-around",
      stepKHz: 12.5,
      modulation: "fm-narrow",
      transmitPower: "high",
      receiveOnly: true,
      busyChannelLockout: "carrier",
      squelch: "tone-and-optional-signaling",
      dcsPolarity: "tx-inverted-rx-normal",
      compander: "transmit-and-receive",
      optionalSignaling: { kind: "two-tone", index: 4 },
      scrambler: 2900,
      pttId: 7,
      aprsReceive: "on-muted",
    }
  )
  assert.equal(edited.toBytes()[0x2f], originalReservedByte)
  assert.notDeepEqual(edited.toBytes(), bytes)
  assert.deepEqual(createCodeplug(bytes).toBytes(), bytes)
})

test("edits TX and RX CTCSS/DCS tones through indexed storage values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[0x2f] = 0xa5
  const baseline = createCodeplug(bytes)

  const edited = baseline.editMemoryChannel(1, {
    transmitTone: { kind: "ctcss", frequencyHz: 88.5 },
    receiveTone: { kind: "dcs", code: "023", reverse: true },
  })
  const channel = edited.getChannels()[0]

  assert.deepEqual(channel.transmitTone, {
    kind: "ctcss",
    frequencyHz: 88.5,
  })
  assert.deepEqual(channel.receiveTone, {
    kind: "dcs",
    code: "023",
    reverse: true,
  })
  assert.equal(edited.toBytes()[0x2f], 0xa5)

  const changedSet = reconcileMemoryChannelEditChanges(
    [],
    baseline,
    edited,
    1,
    ["transmitTone", "receiveTone"]
  )
  assert.equal(changedSet.length, 2)

  const reverted = edited.editMemoryChannel(1, {
    transmitTone: { kind: "off" },
    receiveTone: { kind: "off" },
  })
  const revertedSet = reconcileMemoryChannelEditChanges(
    changedSet,
    baseline,
    reverted,
    1,
    ["transmitTone", "receiveTone"]
  )
  assert.deepEqual(revertedSet, [])
})

test("removes a pending Channel change when its field returns to baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[0x24] = 1
  const baseline = createCodeplug(bytes)
  const changed = baseline.editMemoryChannel(1, { duplex: "off" })
  const changedSet = reconcileMemoryChannelEditChanges(
    [],
    baseline,
    changed,
    1,
    ["duplex"]
  )

  assert.equal(changedSet.length, 1)

  const reverted = changed.editMemoryChannel(1, { duplex: "negative" })
  const revertedSet = reconcileMemoryChannelEditChanges(
    changedSet,
    baseline,
    reverted,
    1,
    ["duplex"]
  )

  assert.deepEqual(revertedSet, [])
})

test("rejects Memory Channel edits that cannot be encoded safely", () => {
  const codeplug = createCodeplug(new Uint8Array(CODEPLUG_SIZE))

  assert.throws(
    () => codeplug.editMemoryChannel(1, { name: "ş".repeat(13) }),
    /24 UTF-8 bytes/
  )
  assert.throws(
    () => codeplug.editMemoryChannel(1, { name: "Bad\0Name" }),
    /null character/
  )
  assert.throws(
    () => codeplug.editMemoryChannel(1, { receiveFrequencyHz: -1 }),
    /unsigned 32-bit integer/
  )
  assert.throws(
    () => codeplug.editMemoryChannel(1, { stepKHz: "unknown" }),
    /Unsupported Channel value/
  )
  assert.throws(
    () =>
      codeplug.editMemoryChannel(1, {
        optionalSignaling: { kind: "dtmf", index: 16 },
      }),
    /between 0 and 15/
  )
  assert.throws(
    () =>
      codeplug.editMemoryChannel(1, {
        transmitTone: { kind: "ctcss", frequencyHz: 68.0 },
      }),
    /Unsupported Channel value/
  )
  assert.throws(
    () =>
      codeplug.editMemoryChannel(1, {
        transmitTone: { kind: "dcs", code: "023", reverse: true },
      }),
    /not supported for TX/
  )
  assert.throws(
    () =>
      codeplug.editMemoryChannel(1, {
        receiveTone: { kind: "unknown" },
      }),
    /cannot be encoded/
  )
})

test("keeps unknown Channel values opaque while preserving every source byte", () => {
  const bytes = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 73 + 19) & 0xff
  )
  const channel = 17 * CHANNEL_RECORD_SIZE
  bytes[channel + 0x24] = 0xf0
  bytes[channel + 0x25] = 0xff
  bytes[channel + 0x26] = 0xff
  bytes[channel + 0x27] = 0xff
  bytes[channel + 0x2a] = 0xff
  bytes[channel + 0x2c] = 0xff
  bytes[channel + 0x2d] = 0xff
  bytes[channel + 0x2e] = 0xff

  const codeplug = createCodeplug(bytes)
  const result = codeplug.getChannels()[17]

  assert.equal(result.stepKHz, "unknown")
  assert.equal(result.modulation, "unknown")
  assert.equal(result.transmitPower, "reserved")
  assert.equal(result.squelch, "unknown")
  assert.deepEqual(result.transmitTone, { kind: "unknown" })
  assert.deepEqual(result.receiveTone, { kind: "unknown" })
  assert.equal(result.optionalSignaling.kind, "unknown")
  assert.equal(result.scrambler, "unknown")
  assert.equal(result.pttId, "unknown")
  assert.equal(result.aprsReceive, "unknown")
  assert.deepEqual(codeplug.toBytes(), bytes)
})

test("does not expose mutable Codeplug or Channel state", () => {
  const source = new Uint8Array(CODEPLUG_SIZE)
  source[VALIDITY_BITMAP_OFFSET] = 1
  const codeplug = createCodeplug(source)
  const channels = codeplug.getChannels()
  const exported = codeplug.toBytes()

  source[VALIDITY_BITMAP_OFFSET] = 0
  exported[VALIDITY_BITMAP_OFFSET] = 0

  assert.equal(codeplug.getChannels()[0].valid, true)
  assert.equal(Object.isFrozen(channels), true)
  assert.equal(Object.isFrozen(channels[0]), true)
  assert.equal(codeplug.toBytes()[VALIDITY_BITMAP_OFFSET], 1)
})

function setScan(bytes: Uint8Array, number: number, value: number) {
  const index = number - 1
  const byteIndex = SCAN_BITMAP_OFFSET + Math.floor(index / 4)
  const shift = (index % 4) * 2
  bytes[byteIndex] = (bytes[byteIndex] & ~(0b11 << shift)) | (value << shift)
}

function clearMembershipStorage(bytes: Uint8Array) {
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
}

function writeChannel(
  bytes: Uint8Array,
  index: number,
  name: string,
  receiveFrequencyHz: number
) {
  const offset = index * CHANNEL_RECORD_SIZE
  writeChannelAtOffset(bytes, offset, name, receiveFrequencyHz)
}

function writeChannelAtOffset(
  bytes: Uint8Array,
  offset: number,
  name: string,
  receiveFrequencyHz: number
) {
  new DataView(bytes.buffer).setUint32(offset, receiveFrequencyHz, false)
  writeUtf8(bytes, offset + 0x08, name)
}

function writeUtf8(bytes: Uint8Array, offset: number, value: string) {
  bytes.set(new TextEncoder().encode(value), offset)
}
