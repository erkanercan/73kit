import assert from "node:assert/strict"
import test from "node:test"

import {
  canCancelRadioWrite,
  classifyRadioWriteFailure,
  compareSourceRadios,
  evaluateRadioWriteSource,
  type RadioWritePhase,
} from "../modules/cps-workspace/index.ts"
import type { SourceRadio } from "../modules/uvl15w-radio/index.ts"

test("scopes the current Radio Write layout to firmware 3.07.23", () => {
  const result = evaluateRadioWriteSource(sourceRadio())

  assert.deepEqual(result, {
    status: "eligible",
    identity: {
      model: "UVL-15W",
      subModel: 1,
      cpuId: "00112233445566778899aabb",
      serialNumber: "UVL15W-TEST-0001",
    },
    layout: {
      id: "uvl15w-3.07.23",
      firmwareVersion: "3.07.23",
      startAddress: 0x8000,
      endAddress: 0x21000,
      byteLength: 0x19000,
      writeBlockSize: 512,
    },
  })

  assert.deepEqual(
    evaluateRadioWriteSource(sourceRadio({ firmwareVersion: "3.08.00" })),
    {
      status: "unsupported-firmware",
      detectedVersion: "3.08.00",
    }
  )
})

test("requires complete stable Source Radio identity and an unprotected writer", () => {
  assert.deepEqual(evaluateRadioWriteSource(sourceRadio({ cpuId: "" })), {
    status: "identity-incomplete",
    missingFields: ["cpuId"],
  })
  assert.deepEqual(
    evaluateRadioWriteSource(sourceRadio({ serialNumber: "" })),
    { status: "identity-incomplete", missingFields: ["serialNumber"] }
  )
  assert.deepEqual(
    evaluateRadioWriteSource(sourceRadio({ writeProtected: true })),
    { status: "write-password-required" }
  )
})

test("compares permanent Source Radio identity independently of firmware", () => {
  assert.deepEqual(
    compareSourceRadios(
      sourceRadio(),
      sourceRadio({
        firmwareVersion: "3.08.00",
        hardwareVersion: "HW-CHANGED",
        imageResourceVersion: "2.0.0",
      })
    ),
    { status: "same" }
  )

  assert.deepEqual(
    compareSourceRadios(
      sourceRadio(),
      sourceRadio({ serialNumber: "UVL15W-TEST-0002" })
    ),
    { status: "different", differingFields: ["serialNumber"] }
  )

  assert.deepEqual(
    compareSourceRadios(
      sourceRadio({ cpuId: "" }),
      sourceRadio({ serialNumber: "" })
    ),
    {
      status: "identity-incomplete",
      expectedMissingFields: ["cpuId"],
      candidateMissingFields: ["serialNumber"],
    }
  )
})

test("treats every failure after a data block may have reached the Radio as Write Outcome Unknown", () => {
  const safePhases: RadioWritePhase[] = [
    "review-required",
    "checking-radio",
    "writing-before-first-block",
    "completed",
  ]
  const uncertainPhases: RadioWritePhase[] = ["writing"]

  for (const phase of safePhases) {
    assert.equal(classifyRadioWriteFailure(phase), "ordinary-failure")
  }
  for (const phase of uncertainPhases) {
    assert.equal(classifyRadioWriteFailure(phase), "write-outcome-unknown")
  }
})

test("offers cancellation only before the write session starts", () => {
  assert.equal(canCancelRadioWrite("review-required"), true)
  assert.equal(canCancelRadioWrite("checking-radio"), true)
  assert.equal(canCancelRadioWrite("writing-before-first-block"), false)
  assert.equal(canCancelRadioWrite("writing"), false)
  assert.equal(canCancelRadioWrite("completed"), false)
})

function sourceRadio(overrides: Partial<SourceRadio> = {}): SourceRadio {
  return {
    model: "UVL-15W",
    subModel: 1,
    firmwareVersion: "V3.07.23",
    imageResourceVersion: "1.0.0",
    cpuId: "00112233445566778899aabb",
    bootloaderModel: "UVL15W-BOOT",
    hardwareVersion: "UVL15W-HW",
    serialNumber: "UVL15W-TEST-0001",
    readProtected: false,
    writeProtected: false,
    ...overrides,
  }
}
