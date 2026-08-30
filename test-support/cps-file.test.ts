import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import {
  CpsFileError,
  createCpsFile,
  evaluateCpsFileCompatibility,
  parseCpsFile,
} from "../modules/cps-workspace/cps-file.ts"
import type { SourceRadio } from "../modules/uvl15w-radio/index.ts"

const sourceRadio: SourceRadio = Object.freeze({
  model: "UVL-15W",
  subModel: 1,
  firmwareVersion: "3.07.23",
  imageResourceVersion: "1.0",
  cpuId: "cpu-123",
  bootloaderModel: "UVL15",
  hardwareVersion: "1.0",
  serialNumber: "radio-123",
  readProtected: false,
  writeProtected: false,
})

test("round-trips baseline and edited working bytes in a CPS File", async () => {
  const baselineBytes = new Uint8Array(CODEPLUG_SIZE)
  const workingBytes = baselineBytes.slice()
  workingBytes[1234] = 0x5a

  const file = await createCpsFile({
    sourceRadio,
    baseline: createCodeplug(baselineBytes),
    working: createCodeplug(workingBytes),
    createdAt: new Date("2026-08-30T12:00:00.000Z"),
  })
  const parsed = await parseCpsFile(file)

  assert.equal(parsed.manifest.createdAt, "2026-08-30T12:00:00.000Z")
  assert.equal(parsed.manifest.layout.id, "uvl15w-3.07.23")
  assert.deepEqual(parsed.manifest.sourceRadio, sourceRadio)
  assert.deepEqual(parsed.baseline.toBytes(), baselineBytes)
  assert.deepEqual(parsed.working.toBytes(), workingBytes)
  assert.equal(parsed.edited, true)
})

test("rejects a CPS File whose working member no longer matches its hash", async () => {
  const file = await createCpsFile({
    sourceRadio,
    baseline: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
    working: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
  })
  file[file.byteLength - 25] ^= 0xff

  await assert.rejects(() => parseCpsFile(file), CpsFileError)
})

test("does not infer compatibility for an unknown layout", () => {
  assert.deepEqual(evaluateCpsFileCompatibility("uvl15w-3.08.00"), {
    status: "unsupported-layout",
    layoutId: "uvl15w-3.08.00",
  })
})
