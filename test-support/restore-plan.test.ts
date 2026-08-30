import assert from "node:assert/strict"
import test from "node:test"

import {
  evaluateRestorePlan,
  materializeRestoreTarget,
} from "../modules/cps-workspace/restore-plan.ts"
import { CODEPLUG_SIZE } from "../modules/codeplug/index.ts"

test("reports that no Radio Write is needed when the imported target already matches", () => {
  const current = new Uint8Array([0x01, 0x02, 0x03])

  assert.deepEqual(evaluateRestorePlan(current, current.slice()), {
    status: "already-current",
  })
})

test("reports the exact changed-byte count for a prepared restore", () => {
  assert.deepEqual(
    evaluateRestorePlan(
      new Uint8Array([0x01, 0x02, 0x03]),
      new Uint8Array([0x01, 0xff, 0xee])
    ),
    { status: "restore-required", changedByteCount: 2 }
  )
})

test("rejects restore comparison across different byte lengths", () => {
  assert.throws(
    () =>
      evaluateRestorePlan(new Uint8Array([0x01]), new Uint8Array([0x01, 0x02])),
    /same byte length/
  )
})

test("preserves the growing Radio-managed tail instead of reporting its drifting records", () => {
  const currentRadio = new Uint8Array(CODEPLUG_SIZE).fill(0xff)
  const olderBackup = currentRadio.slice()
  const offset = 0x18bc0
  currentRadio.set(
    [
      0x00, 0x50, 0x01, 0x00, 0xff, 0x06, 0xff, 0x00, 0x00, 0x50, 0x01, 0x00,
      0xff, 0x07, 0xff, 0x00, 0x00, 0x50, 0x01, 0x00, 0xff, 0x01, 0xff, 0x00,
      0x00, 0x50, 0x01, 0x00, 0xff, 0x02, 0xff, 0x00,
    ],
    offset
  )

  const target = materializeRestoreTarget(currentRadio, olderBackup)

  assert.deepEqual(target.slice(offset), currentRadio.slice(offset))
  assert.deepEqual(evaluateRestorePlan(currentRadio, target), {
    status: "already-current",
  })
})

test("keeps imported differences outside Radio-managed records", () => {
  const currentRadio = new Uint8Array(CODEPLUG_SIZE)
  const desired = currentRadio.slice()
  desired[100] = 0x42
  desired[0x18bc0] = 0x55

  const target = materializeRestoreTarget(currentRadio, desired)

  assert.equal(target[100], 0x42)
  assert.equal(target[0x18bc0], currentRadio[0x18bc0])
  assert.deepEqual(evaluateRestorePlan(currentRadio, target), {
    status: "restore-required",
    changedByteCount: 1,
  })
})
