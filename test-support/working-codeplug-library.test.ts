import assert from "node:assert/strict"
import test from "node:test"

import {
  WorkingCodeplugLibraryError,
  createSavedWorkingCodeplug,
  renamedSavedWorkingCodeplug,
} from "../modules/cps-workspace/working-codeplug-library.ts"
import type { CpsFileManifest } from "../modules/cps-workspace/cps-file.ts"

test("creates an immutable named Working Codeplug snapshot", () => {
  const bytes = Uint8Array.of(1, 2, 3)
  const entry = createSavedWorkingCodeplug({
    id: "document-1",
    name: "  Antalya repeaters  ",
    now: new Date("2026-08-31T12:00:00.000Z"),
    manifest: manifest(),
    cpsFileBytes: bytes,
  })
  bytes[0] = 9

  assert.equal(entry.name, "Antalya repeaters")
  assert.equal(entry.normalizedName, "antalya repeaters")
  assert.equal(entry.revision, 1)
  assert.deepEqual(entry.cpsFileBytes, Uint8Array.of(1, 2, 3))
})

test("renaming advances the revision without changing the saved bytes", () => {
  const original = createSavedWorkingCodeplug({
    id: "document-1",
    name: "Local",
    now: new Date("2026-08-31T12:00:00.000Z"),
    manifest: manifest(),
    cpsFileBytes: Uint8Array.of(1, 2, 3),
  })
  const renamed = renamedSavedWorkingCodeplug(
    original,
    "Travel",
    new Date("2026-08-31T13:00:00.000Z")
  )

  assert.equal(renamed.name, "Travel")
  assert.equal(renamed.revision, 2)
  assert.deepEqual(renamed.cpsFileBytes, original.cpsFileBytes)
  assert.notEqual(renamed.cpsFileBytes, original.cpsFileBytes)
})

test("rejects empty and oversized Working Codeplug names", () => {
  for (const name of ["   ", "x".repeat(81)]) {
    assert.throws(
      () =>
        createSavedWorkingCodeplug({
          name,
          manifest: manifest(),
          cpsFileBytes: Uint8Array.of(1),
        }),
      (error) =>
        error instanceof WorkingCodeplugLibraryError &&
        error.code === "invalid-name"
    )
  }
})

function manifest(): CpsFileManifest {
  return {
    format: "tyt-uvl15-cps",
    schemaVersion: 1,
    createdAt: "2026-08-31T12:00:00.000Z",
    layout: {
      id: "uvl15w-3.07.23",
      firmwareVersion: "3.07.23",
      byteLength: 102_400,
    },
    sourceRadio: {
      model: "UVL-15W",
      subModel: 1,
      readProtected: false,
      writeProtected: false,
      firmwareVersion: "3.07.23",
      imageResourceVersion: "1.01.00",
      cpuId: "cpu",
      bootloaderModel: "boot",
      hardwareVersion: "hardware",
      serialNumber: "serial",
    },
    baseline: {
      path: "baseline.bin",
      sha256: "a".repeat(64),
      byteLength: 102_400,
    },
    working: {
      path: "working.bin",
      sha256: "b".repeat(64),
      byteLength: 102_400,
    },
  }
}
