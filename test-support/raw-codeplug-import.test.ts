import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE } from "../modules/codeplug/index.ts"
import {
  RawCodeplugImportError,
  canExportCpsFile,
  canPrepareImportedRestore,
  canPrepareRadioWrite,
  importRawCodeplugFile,
  type RawCodeplugFile,
} from "../modules/cps-workspace/codeplug-document.ts"

function rawFile(
  name = "backup.bin",
  bytes = new Uint8Array(CODEPLUG_SIZE),
  declaredSize = bytes.byteLength
): RawCodeplugFile {
  return {
    name,
    size: declaredSize,
    async arrayBuffer() {
      return bytes.slice().buffer
    },
  }
}

test("imports an exact-size .bin as an unbound document with distinct copies", async () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[0] = 0x42
  const importedAt = new Date("2026-08-31T09:30:00.000Z")
  const document = await importRawCodeplugFile(
    rawFile("FIELD-BACKUP.BIN", bytes),
    importedAt
  )

  assert.equal(document.binding, "unbound")
  assert.equal(document.sourceRadio, null)
  assert.equal(document.rawImport.fileName, "FIELD-BACKUP.BIN")
  assert.equal(document.rawImport.byteLength, CODEPLUG_SIZE)
  assert.deepEqual(document.baselineBackup.codeplug.toBytes(), bytes)
  assert.deepEqual(document.workingCodeplug.codeplug.toBytes(), bytes)
  assert.notEqual(
    document.baselineBackup.codeplug,
    document.workingCodeplug.codeplug
  )
  assert.equal(canPrepareRadioWrite(document), false)
  assert.equal(canPrepareImportedRestore(document), false)
  assert.equal(canExportCpsFile(document), false)
})

test("rejects the extension and every wrong declared size before reading", async () => {
  let reads = 0
  const file = {
    name: "backup.img",
    size: CODEPLUG_SIZE,
    async arrayBuffer() {
      reads += 1
      return new ArrayBuffer(CODEPLUG_SIZE)
    },
  }
  await assert.rejects(importRawCodeplugFile(file), (error) => {
    assert.ok(error instanceof RawCodeplugImportError)
    return error.code === "invalid-extension"
  })
  for (const size of [0, CODEPLUG_SIZE - 1, CODEPLUG_SIZE + 1, 10_000_000]) {
    await assert.rejects(
      importRawCodeplugFile({ ...file, name: "backup.bin", size }),
      (error) => {
        assert.ok(error instanceof RawCodeplugImportError)
        return error.code === "invalid-size"
      }
    )
  }
  assert.equal(reads, 0)
})

test("accepts an erased full-size image without inventing content validation", async () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const document = await importRawCodeplugFile(rawFile("erased.bin", bytes))

  assert.deepEqual(document.workingCodeplug.codeplug.toBytes(), bytes)
})

test("normalizes read failures and rejects a post-read size mismatch", async () => {
  await assert.rejects(
    importRawCodeplugFile({
      name: "backup.bin",
      size: CODEPLUG_SIZE,
      async arrayBuffer() {
        throw new Error("disk disappeared")
      },
    }),
    (error) => {
      assert.ok(error instanceof RawCodeplugImportError)
      return error.code === "read-failed"
    }
  )
  await assert.rejects(
    importRawCodeplugFile(
      rawFile("backup.bin", new Uint8Array(1), CODEPLUG_SIZE)
    ),
    (error) => {
      assert.ok(error instanceof RawCodeplugImportError)
      return error.code === "size-changed"
    }
  )
})
