import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"

const VFO_A_OFFSET = 0x13b80 - 0x8000
const VFO_B_OFFSET = 0x13bb0 - 0x8000
const TEMPORARY_A_OFFSET = 0x13c40 - 0x8000
const TEMPORARY_B_OFFSET = 0x13c70 - 0x8000
const WEATHER_CHANNELS_OFFSET = 0x13ca0 - 0x8000
const CHANNEL_RECORD_SIZE = 48

const FIXED_WEATHER_CHANNELS = hex(
  "09B050F009B050F057582D303100000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AE070009AE070057582D303200000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AF2BF809AF2BF857582D303300000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AE68A809AE68A857582D303400000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AECA5009AECA5057582D303500000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AF8DA009AF8DA057582D303600000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AFEF4809AFEF4857582D303700000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09A2955009A2955057582D303800000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09A47D9809A47D9857582D303900000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09BB60F809BB60F857582D313000000000000000000000000000000000000000000927C010200000000000FF00FFFEFF"
)

test("materializes the exact firmware 3.07.23 full-write image", async () => {
  const source = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 29 + 7) & 0xff
  )
  const vfoA = Uint8Array.from(
    { length: CHANNEL_RECORD_SIZE },
    (_, index) => 0x20 + index
  )
  const vfoB = Uint8Array.from(
    { length: CHANNEL_RECORD_SIZE },
    (_, index) => 0x90 + index
  )
  source.set(vfoA, VFO_A_OFFSET)
  source.set(vfoB, VFO_B_OFFSET)
  const codeplug = createCodeplug(source)

  const image = await codeplug.materializeWriteImage("uvl15w-3.07.23")

  const expected = source.slice()
  expected.set(vfoA, TEMPORARY_A_OFFSET)
  expected.set(vfoB, TEMPORARY_B_OFFSET)
  expected.set(FIXED_WEATHER_CHANNELS, WEATHER_CHANNELS_OFFSET)
  assert.deepEqual(image.toBytes(), expected)
  assert.deepEqual(codeplug.toBytes(), source)
})

test("returns an immutable write image with its independent SHA-256", async () => {
  const source = new Uint8Array(CODEPLUG_SIZE)
  const expected = source.slice()
  expected.set(FIXED_WEATHER_CHANNELS, WEATHER_CHANNELS_OFFSET)
  const expectedSha256 = createHash("sha256").update(expected).digest("hex")

  const image =
    await createCodeplug(source).materializeWriteImage("uvl15w-3.07.23")
  const exposedBytes = image.toBytes()
  exposedBytes[0] = 0xff

  assert.equal(image.layoutId, "uvl15w-3.07.23")
  assert.equal(image.byteLength, CODEPLUG_SIZE)
  assert.equal(image.sha256, expectedSha256)
  assert.deepEqual(image.toBytes(), expected)
  assert.equal(Object.isFrozen(image), true)
})

test("reports only derived internal changes that alter the write image", async () => {
  const source = new Uint8Array(CODEPLUG_SIZE)
  source[VFO_A_OFFSET] = 0x42
  source.set(FIXED_WEATHER_CHANNELS, WEATHER_CHANNELS_OFFSET)

  const changed =
    await createCodeplug(source).materializeWriteImage("uvl15w-3.07.23")
  const unchanged = await createCodeplug(
    changed.toBytes()
  ).materializeWriteImage("uvl15w-3.07.23")

  assert.deepEqual(changed.derivedChanges, ["mirror-vfo-temporary-channels"])
  assert.deepEqual(unchanged.derivedChanges, [])
  assert.equal(Object.isFrozen(changed.derivedChanges), true)
})

function hex(value: string) {
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16)
  )
}
