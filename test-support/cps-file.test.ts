import assert from "node:assert/strict"
import test from "node:test"
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

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

test("round-trips a beta legacy firmware CPS File without migrating bytes", async () => {
  const legacyRadio = { ...sourceRadio, firmwareVersion: "3.05.26" }
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const legacy = createCodeplug(bytes, "uvl15w-legacy-v1")
  const file = await createCpsFile({
    sourceRadio: legacyRadio,
    baseline: legacy,
    working: legacy,
  })
  const parsed = await parseCpsFile(file)

  assert.equal(parsed.manifest.supportProfileId, "tyt-uvl15w-3.05.26")
  assert.equal(parsed.manifest.layout.id, "uvl15w-legacy-v1")
  assert.equal(parsed.working.layoutId, "uvl15w-legacy-v1")
  assert.deepEqual(parsed.working.toBytes(), bytes)
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

test("rejects inconsistent firmware metadata in a CPS File", async () => {
  const file = await createCpsFile({
    sourceRadio,
    baseline: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
    working: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
  })
  const members = unzipSync(file)
  const manifest = JSON.parse(strFromU8(members["manifest.json"]))
  manifest.layout.firmwareVersion = "2.07.03"
  members["manifest.json"] = strToU8(JSON.stringify(manifest))

  await assert.rejects(
    parseCpsFile(zipSync(members)),
    /support profile is inconsistent/
  )
})

test("rejects export when Source Radio and support profile do not match", async () => {
  await assert.rejects(
    () =>
      createCpsFile({
        sourceRadio: { ...sourceRadio, firmwareVersion: "3.08.00" },
        baseline: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
        working: createCodeplug(new Uint8Array(CODEPLUG_SIZE)),
      }),
    CpsFileError
  )
})

test("does not infer compatibility for an unknown layout", () => {
  assert.deepEqual(evaluateCpsFileCompatibility("uvl15w-3.08.00"), {
    status: "unsupported-layout",
    layoutId: "uvl15w-3.08.00",
  })
})
