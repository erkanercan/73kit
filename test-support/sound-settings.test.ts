import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  createCodeplug,
  isUnknownSettingValue,
} from "../modules/codeplug/index.ts"
import { reconcileSoundSettingChanges } from "../modules/cps-workspace/change-set.ts"

const FLASH_START = 0x8000
const offset = (address: number) => address - FLASH_START

test("decodes every documented Sound Setting", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x1540c)] = 1
  bytes[offset(0x1540d)] = 1
  bytes[offset(0x1540e)] = 3
  bytes[offset(0x1540f)] = 9
  bytes[offset(0x1541a)] = 1
  bytes[offset(0x1541b)] = 1
  bytes[offset(0x1541d)] = 0b1010_0011
  bytes[offset(0x1541e)] = 34
  bytes[offset(0x1541f)] = 1
  bytes[offset(0x1542a)] = 1

  assert.deepEqual(createCodeplug(bytes).getSoundSettings(), {
    keyBeep: true,
    lowBatteryBeep: true,
    powerOnBeep: true,
    txTimeoutBeep: true,
    callStartBeep: true,
    callEndBeep: true,
    microphoneGain: 31,
    aiVox: true,
    aiVoxSensitivity: "very-high",
    aiVoxDelaySeconds: 5,
    aiNoiseReduction: true,
  })
})

test("edits Sound Settings and preserves unrelated call-beep bits", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x1541d)] = 0b1010_0000
  const baseline = createCodeplug(bytes)
  const edited = baseline.editSoundSettings({
    keyBeep: true,
    callStartBeep: true,
    callEndBeep: false,
    microphoneGain: "high",
    aiVoxSensitivity: "medium",
    aiVoxDelaySeconds: 2.5,
  })
  const result = edited.toBytes()

  assert.equal(result[offset(0x1541a)], 1)
  assert.equal(result[offset(0x1541d)], 0b1010_0001)
  assert.equal(result[offset(0x1541e)], 2)
  assert.equal(result[offset(0x1540e)], 1)
  assert.equal(result[offset(0x1540f)], 4)
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("rejects invalid Sound Settings and preserves unknown values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x1541a)] = 0xff
  bytes[offset(0x1541e)] = 0xff
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getSoundSettings()

  assert.equal(isUnknownSettingValue(settings.keyBeep), true)
  assert.equal(isUnknownSettingValue(settings.microphoneGain), true)
  assert.throws(
    () => codeplug.editSoundSettings({ microphoneGain: 32 as 31 }),
    /Unsupported Sound Setting value/
  )
  assert.throws(
    () => codeplug.editSoundSettings({ aiVoxDelaySeconds: 0 as 0.5 }),
    /Unsupported Sound Setting value/
  )
})

test("reconciles Sound Setting changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editSoundSettings({ aiNoiseReduction: true })
  const changes = reconcileSoundSettingChanges([], baseline, edited, [
    "aiNoiseReduction",
  ])

  assert.deepEqual(changes, [
    { kind: "edit-sound-setting", field: "aiNoiseReduction" },
  ])
  assert.deepEqual(
    reconcileSoundSettingChanges(
      changes,
      baseline,
      edited.editSoundSettings({ aiNoiseReduction: false }),
      ["aiNoiseReduction"]
    ),
    []
  )
})
