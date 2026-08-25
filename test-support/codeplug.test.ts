import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"

const CHANNEL_RECORD_SIZE = 48
const VALIDITY_BITMAP_OFFSET = 0xd000
const SCAN_BITMAP_OFFSET = 0xd080

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

  const codeplug = createCodeplug(bytes)
  const [result] = codeplug.getChannels()

  assert.deepEqual(result, {
    number: 1,
    valid: true,
    scan: "priority",
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

test("maps validity and scan bitmap entries across byte boundaries", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const validChannels = [1, 8, 9, 1000]
  const scans = new Map([
    [1, "normal"],
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
  assert.equal(result.transmitPower, "unknown")
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
