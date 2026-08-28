import assert from "node:assert/strict"
import test from "node:test"

import type { BackupHistoryEntry } from "../modules/cps-workspace/index.ts"
import { InMemoryBackupHistoryStore } from "./in-memory-backup-history-store/index.ts"

test("lists newest backups first and supports delete and clear", async () => {
  const store = new InMemoryBackupHistoryStore()
  const older = entry("older", "2026-08-28T08:00:00.000Z", 1)
  const newer = entry("newer", "2026-08-28T09:00:00.000Z", 2)

  await store.save(older)
  await store.save(newer)
  older.bytes[0] = 99

  assert.deepEqual(
    (await store.list()).map(({ id, bytes }) => [id, bytes[0]]),
    [
      ["newer", 2],
      ["older", 1],
    ]
  )

  await store.delete("newer")
  assert.deepEqual(
    (await store.list()).map(({ id }) => id),
    ["older"]
  )

  await store.clear()
  assert.deepEqual(await store.list(), [])
})

function entry(
  id: string,
  createdAt: string,
  byte: number
): BackupHistoryEntry {
  return {
    schemaVersion: 1,
    id,
    origin: "radio-read",
    sourceRadio: {
      model: "UVL-15W",
      subModel: 0,
      cpuId: "0123456789ABCDEF",
      serialNumber: "1234567890123456",
      firmwareVersion: "3.07.23",
      imageResourceVersion: "1.0",
      bootloaderModel: "UVL-15W",
      hardwareVersion: "1.0",
      readProtected: false,
      writeProtected: false,
    },
    createdAt,
    sha256: "0".repeat(64),
    byteLength: 1,
    changeCount: 0,
    bytes: Uint8Array.of(byte),
  }
}
