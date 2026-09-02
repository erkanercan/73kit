import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  parsePfFile,
  serializePfFile,
} from "../modules/codeplug/index.ts"

test("round trips the official UVL-15W PF record format", async () => {
  const bytes = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => index % 251
  )
  bytes.set([0x45, 0x44, 0x47, 0x31, 0x01, 0x00], 0x13b00)
  const text = serializePfFile(bytes)
  const parsed = await parsePfFile(text)

  assert.equal(text.split("\n").length, 3_201)
  assert.equal(text.slice(0, 12), "000080000020")
  assert.deepEqual(parsed.bytes, bytes)
  assert.equal(parsed.layoutId, "uvl15w-legacy-v1")
})

test("detects the July EDG1 v2 marker as the 3.07 generation", async () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  bytes.set([0x45, 0x44, 0x47, 0x31, 0x02, 0x00], 0x16b00)

  const parsed = await parsePfFile(serializePfFile(bytes))
  assert.equal(parsed.generation, "3.07")
  assert.equal(parsed.layoutId, "uvl15w-3.07.23")
})

test("rejects PF files with gaps or malformed records", async () => {
  const text = serializePfFile(new Uint8Array(CODEPLUG_SIZE))
  const lines = text.trimEnd().split("\n")
  lines[1] = `00009000${lines[1].slice(8)}`

  await assert.rejects(parsePfFile(lines.join("\n")), /address map/)
})

test("rejects a markerless PF instead of guessing its layout", async () => {
  const text = serializePfFile(new Uint8Array(CODEPLUG_SIZE).fill(0x5a))

  await assert.rejects(parsePfFile(text), /does not identify/)
})
