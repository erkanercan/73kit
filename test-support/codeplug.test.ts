import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"

const CHANNEL_RECORD_SIZE = 48
const VALIDITY_BITMAP_OFFSET = 0xd000
const SCAN_BITMAP_OFFSET = 0xd080
const ZONE_MEMBER_LISTS_OFFSET = 0x10000
const SCAN_LIST_MEMBER_LISTS_OFFSET = 0x11000
const CHANNEL_ZONE_MEMBERSHIP_OFFSET = 0x12000
const CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET = 0x12800
const ZONE_NAMES_OFFSET = 0x13000
const SCAN_LIST_NAMES_OFFSET = 0x13400
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
    CHANNEL_ZONE_MEMBERSHIP_OFFSET + 2
  )
  bytes.fill(
    0xff,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET,
    CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 2
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
  view.setUint16(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xfffe, true)
  view.setUint16(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xfffe, true)
  bytes.fill(0xff, ZONE_NAMES_OFFSET, ZONE_NAMES_OFFSET + 0x18)
  bytes.fill(0xff, SCAN_LIST_NAMES_OFFSET, SCAN_LIST_NAMES_OFFSET + 0x18)

  const [channel] = createCodeplug(bytes).getChannels()

  assert.deepEqual(channel.zoneNames, [])
  assert.deepEqual(channel.scanListNames, [])
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
  view.setUint16(CHANNEL_ZONE_MEMBERSHIP_OFFSET, 0xfffe, true)
  view.setUint16(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 2, 0xfffd, true)
  view.setUint16(CHANNEL_ZONE_MEMBERSHIP_OFFSET + 4, 0xffff, true)
  view.setUint16(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET, 0xfffe, true)
  view.setUint16(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 2, 0xffff, true)
  view.setUint16(CHANNEL_SCAN_LIST_MEMBERSHIP_OFFSET + 4, 0xffff, true)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET, 0, true)
  view.setUint16(ZONE_MEMBER_LISTS_OFFSET + 0x100, 1, true)
  view.setUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, 0, true)

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
  assert.equal(movedView.getUint16(ZONE_MEMBER_LISTS_OFFSET, true), 2)
  assert.equal(movedView.getUint16(ZONE_MEMBER_LISTS_OFFSET + 0x100, true), 0)
  assert.equal(movedView.getUint16(SCAN_LIST_MEMBER_LISTS_OFFSET, true), 2)
  assert.deepEqual(createCodeplug(bytes).getChannels()[0].name, "Alpha")
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
