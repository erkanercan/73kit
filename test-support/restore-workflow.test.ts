import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import type {
  BackupHistoryEntry,
  CompletedRadioRead,
} from "../modules/cps-workspace/index.ts"
import { digestBytes } from "../modules/cps-workspace/cps-file.ts"
import {
  prepareRestoreDocument,
  restoreTargetFromBackup,
  type RestoreSource,
} from "../modules/cps-workspace/restore-workflow.ts"
import type { SourceRadio } from "../modules/uvl15w-radio/index.ts"

test("rejects a saved backup whose bytes no longer match its stored hash", async () => {
  const entry = await backupEntry(new Uint8Array(CODEPLUG_SIZE))
  entry.bytes[10] = 0x42

  await assert.rejects(
    restoreTargetFromBackup(entry),
    /saved backup failed its integrity check/
  )
})

test("rejects restore preparation for a different Source Radio", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const freshRead = completedRadioRead(
    bytes,
    sourceRadio({ serialNumber: "UVL15W-TEST-0002" })
  )

  assert.throws(
    () =>
      prepareRestoreDocument(restoreSource(), createCodeplug(bytes), freshRead),
    /not the Source Radio/
  )
})

test("returns already current with no Change Set for an identical backup", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const prepared = prepareRestoreDocument(
    restoreSource(),
    createCodeplug(bytes),
    completedRadioRead(bytes)
  )

  assert.deepEqual(prepared.result, { status: "already-current" })
  assert.deepEqual(prepared.changes, [])
  assert.deepEqual(
    prepared.completedRead.workingCodeplug.codeplug.toBytes(),
    bytes
  )
})

test("creates a restore Change Set for desired bytes outside the managed tail", () => {
  const current = new Uint8Array(CODEPLUG_SIZE)
  const desired = current.slice()
  desired[100] = 0x42
  desired[101] = 0x43

  const prepared = prepareRestoreDocument(
    restoreSource(),
    createCodeplug(desired),
    completedRadioRead(current)
  )

  assert.deepEqual(prepared.result, {
    status: "restore-ready",
    changedByteCount: 2,
  })
  assert.deepEqual(prepared.changes, [
    {
      kind: "restore-imported-codeplug",
      fileCreatedAt: "2026-08-30T12:00:00.000Z",
      workingSha256: "a".repeat(64),
      changedByteCount: 2,
    },
  ])
})

test("reviews a known restored setting as its semantic change", () => {
  const initial = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const current = initial
    .editDisplaySettings({ backlightLevel: 8 })
    .toBytes()
  const desired = initial
    .editDisplaySettings({ backlightLevel: 9 })
    .toBytes()

  const prepared = prepareRestoreDocument(
    restoreSource(),
    createCodeplug(desired),
    completedRadioRead(current)
  )

  assert.deepEqual(prepared.changes, [
    { kind: "edit-display-setting", field: "backlightLevel" },
  ])
})

test("keeps unexplained restore bytes beside semantic changes", () => {
  const initial = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const current = initial
    .editDisplaySettings({ backlightLevel: 8 })
    .toBytes()
  const desired = initial
    .editDisplaySettings({ backlightLevel: 9 })
    .toBytes()
  desired[100] = 0x42

  const prepared = prepareRestoreDocument(
    restoreSource(),
    createCodeplug(desired),
    completedRadioRead(current)
  )

  assert.deepEqual(prepared.changes, [
    { kind: "edit-display-setting", field: "backlightLevel" },
    {
      kind: "restore-imported-codeplug",
      fileCreatedAt: "2026-08-30T12:00:00.000Z",
      workingSha256: "a".repeat(64),
      changedByteCount: 1,
    },
  ])
})

test("keeps the fresh Radio-managed tail in the prepared restore document", () => {
  const current = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const desired = current.slice()
  const managedTailOffset = 0x18bc0
  current.set(
    [0x00, 0x50, 0x01, 0x00, 0xff, 0x02, 0xff, 0x00],
    managedTailOffset
  )
  desired[100] = 0x42

  const prepared = prepareRestoreDocument(
    restoreSource(),
    createCodeplug(desired),
    completedRadioRead(current)
  )
  const preparedBytes =
    prepared.completedRead.workingCodeplug.codeplug.toBytes()

  assert.equal(preparedBytes[100], 0x42)
  assert.deepEqual(
    preparedBytes.slice(managedTailOffset),
    current.slice(managedTailOffset)
  )
  assert.deepEqual(prepared.result, {
    status: "restore-ready",
    changedByteCount: 1,
  })
})

async function backupEntry(bytes: Uint8Array): Promise<BackupHistoryEntry> {
  return {
    schemaVersion: 1,
    id: "backup:test",
    origin: "radio-read",
    sourceRadio: sourceRadio(),
    createdAt: "2026-08-30T12:00:00.000Z",
    sha256: await digestBytes(bytes),
    byteLength: bytes.byteLength,
    changeCount: 0,
    bytes,
  }
}

function restoreSource(): RestoreSource {
  return {
    createdAt: "2026-08-30T12:00:00.000Z",
    sourceRadio: sourceRadio(),
    workingSha256: "a".repeat(64),
  }
}

function completedRadioRead(
  bytes: Uint8Array,
  radio = sourceRadio()
): CompletedRadioRead {
  const codeplug = createCodeplug(bytes)
  const baselineBackup = {
    id: "backup:fresh",
    sha256: "b".repeat(64),
    sourceRadio: radio,
    codeplug,
    createdAt: new Date("2026-08-31T08:00:00.000Z"),
  }
  return {
    sourceRadio: radio,
    baselineBackup,
    workingCodeplug: {
      sourceRadio: radio,
      baselineBackup,
      codeplug,
    },
    backupHistory: [baselineBackup],
  }
}

function sourceRadio(overrides: Partial<SourceRadio> = {}): SourceRadio {
  return {
    model: "UVL-15W",
    subModel: 1,
    firmwareVersion: "3.07.23",
    imageResourceVersion: "1.01.00",
    cpuId: "00112233445566778899aabb",
    bootloaderModel: "UVL15W-BOOT",
    hardwareVersion: "UVL15W-HW",
    serialNumber: "UVL15W-TEST-0001",
    readProtected: false,
    writeProtected: false,
    ...overrides,
  }
}
