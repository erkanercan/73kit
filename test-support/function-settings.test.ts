import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  createCodeplug,
  isUnknownSettingValue,
} from "../modules/codeplug/index.ts"
import { reconcileFunctionSettingChanges } from "../modules/cps-workspace/change-set.ts"

const FLASH_START = 0x8000
const offset = (address: number) => address - FLASH_START

test("decodes documented and stock-CPS-verified Function Settings", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15307)] = 3
  bytes[offset(0x15308)] = 2
  bytes[offset(0x15430)] = 2
  bytes[offset(0x15431)] = 1
  bytes[offset(0x15432)] = 8
  bytes[offset(0x15433)] = 14
  bytes[offset(0x15434)] = 1
  bytes[offset(0x15435)] = 29
  bytes[offset(0x15436)] = 4
  bytes[offset(0x15437)] = 1
  bytes[offset(0x15438)] = 2
  bytes[offset(0x15439)] = 18
  bytes[offset(0x1543a)] = 1
  bytes[offset(0x1543b)] = 3
  bytes[offset(0x1543c)] = 1
  bytes[offset(0x1543d)] = 2
  bytes[offset(0x1543e)] = 1
  bytes[offset(0x1543f)] = 1
  bytes[offset(0x15448)] = 1
  bytes[offset(0x15449)] = 100
  bytes[offset(0x1544a)] = 4
  bytes[offset(0x154b0)] = 1
  bytes[offset(0x154b1)] = 32
  bytes[offset(0x154b2)] = 1
  bytes[offset(0x154b3)] = 1
  bytes[offset(0x154b4)] = 0b0000_0101
  bytes[offset(0x154b5)] = 0b1111_1110
  bytes[offset(0x154b6)] = 35
  bytes[offset(0x154b7)] = 1
  bytes[offset(0x154b8)] = 1
  bytes[offset(0x154b9)] = 1
  bytes[offset(0x154ba)] = 1
  bytes[offset(0x154bc)] = 2

  assert.deepEqual(createCodeplug(bytes).getFunctionSettings(), {
    rxTxMode: "dual-receive-single-tx",
    crossBandRepeaterMode: "two-way",
    crossBandRepeaterMonitoring: true,
    squelchLevel: 9,
    transmitTimeoutMinutes: 30,
    transmitChannelSelection: "last-called",
    callHoldSeconds: 300,
    bandAOperatingMode: "weather",
    bandBOperatingMode: "call",
    autoRepeater: true,
    autoAmMode: "108-137",
    citUsbCdc: true,
    citBluetoothSpp: true,
    citBluetoothBle: true,
    noSignalingTailTone: "259.2-hz",
    ctcssTailBehavior: "phase-shift-240",
    dcsTailBehavior: "134.4-hz",
    tailSignalingDurationMs: 500,
    toneBurstFrequencyHz: 2100,
    toneBurstDuration: "continuous",
    toneBurstSidetone: true,
    scanMode: "search",
    memoryScanType: "priority",
    coResumeDelaySeconds: 0.1,
    toHoldTimeSeconds: 10,
    scanDwellTimeMs: 50,
    powerSave: true,
    powerSaveDelaySeconds: 300,
    weatherSquelchControl: "1050-hz-signaling",
    weatherReceiveMode: "multi-channel-scan",
    weatherScanChannels: [1, 3, 10],
    weatherDecodeResetSeconds: 300,
  })
})

test("edits only the mapped Function Setting bytes and preserves reserved WX bits", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15449)] = 10
  bytes[offset(0x154b5)] = 0xfc
  const baseline = createCodeplug(bytes)
  const edited = baseline.editFunctionSettings({
    autoRepeater: true,
    autoAmMode: "108-136",
    coResumeDelaySeconds: 0.1,
    toHoldTimeSeconds: 1.1,
    scanDwellTimeMs: 20,
    citUsbCdc: true,
    citBluetoothSpp: true,
    citBluetoothBle: true,
    weatherScanChannels: [2, 10],
  })
  const result = edited.toBytes()

  assert.deepEqual(changedOffsets(bytes, result), [
    offset(0x15448),
    offset(0x15449),
    offset(0x1544a),
    offset(0x154b4),
    offset(0x154b5),
    offset(0x154b7),
    offset(0x154b8),
    offset(0x154b9),
    offset(0x154ba),
    offset(0x154bc),
  ])
  assert.equal(result[offset(0x15448)], 1)
  assert.equal(result[offset(0x15449)], 11)
  assert.equal(result[offset(0x1544a)], 1)
  assert.equal(result[offset(0x154b4)], 0b0000_0010)
  assert.equal(result[offset(0x154b5)], 0b1111_1110)
  assert.equal(result[offset(0x154b7)], 1)
  assert.equal(result[offset(0x154b8)], 1)
  assert.equal(result[offset(0x154b9)], 1)
  assert.equal(result[offset(0x154ba)], 1)
  assert.equal(result[offset(0x154bc)], 1)
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("rejects invalid timing values and preserves unknown stored values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15430)] = 0xff
  bytes[offset(0x15449)] = 10
  const codeplug = createCodeplug(bytes)

  assert.equal(
    isUnknownSettingValue(codeplug.getFunctionSettings().rxTxMode),
    true
  )
  assert.throws(
    () => codeplug.editFunctionSettings({ coResumeDelaySeconds: 0.15 }),
    /0\.1 increments/
  )
  assert.throws(
    () => codeplug.editFunctionSettings({ toHoldTimeSeconds: 0.9 }),
    /between 1 and 10/
  )
})

test("reconciles Function Setting changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15449)] = 10
  const baseline = createCodeplug(bytes)
  const enabled = baseline.editFunctionSettings({ autoRepeater: true })
  const changes = reconcileFunctionSettingChanges([], baseline, enabled, [
    "autoRepeater",
  ])

  assert.deepEqual(changes, [
    { kind: "edit-function-setting", field: "autoRepeater" },
  ])
  assert.deepEqual(
    reconcileFunctionSettingChanges(
      changes,
      baseline,
      enabled.editFunctionSettings({ autoRepeater: false }),
      ["autoRepeater"]
    ),
    []
  )
})

function changedOffsets(left: Uint8Array, right: Uint8Array) {
  return Array.from(left.keys()).filter((index) => left[index] !== right[index])
}
