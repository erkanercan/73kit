import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  createCodeplug,
  isUnknownSettingValue,
} from "../modules/codeplug/index.ts"
import { reconcileKeyboardSettingChanges } from "../modules/cps-workspace/change-set.ts"

const FLASH_START = 0x8000
const offset = (address: number) => address - FLASH_START

test("decodes every documented Keyboard Setting", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15410)] = 2
  bytes[offset(0x15411)] = 2
  bytes[offset(0x15412)] = 26
  bytes[offset(0x15413)] = 27
  bytes[offset(0x15414)] = 20
  bytes[offset(0x15415)] = 21
  bytes[offset(0x15420)] = 1
  bytes[offset(0x15421)] = 6
  bytes[offset(0x15422)] = 30
  for (let index = 0; index < 12; index += 1) {
    bytes[offset(0x15450 + index)] = index + 3
  }

  assert.deepEqual(createCodeplug(bytes).getKeyboardSettings(), {
    sideKey1ShortPress: "send-beacon",
    sideKey1LongPress: "send-tone-burst",
    sideKey2ShortPress: "debug-information",
    sideKey2LongPress: "debug-information",
    topKeyShortPress: "bluetooth",
    topKeyLongPress: "bluetooth",
    digit0LongPress: "send-beacon",
    digit1LongPress: "squelch-off",
    digit2LongPress: "scan",
    digit3LongPress: "scrambler",
    digit4LongPress: "talk-around",
    digit5LongPress: "noise-reduction",
    digit6LongPress: "one-key-frequency-copy",
    digit7LongPress: "power-level",
    digit8LongPress: "reverse",
    digit9LongPress: "fm-radio",
    menuKeyLongPress: "channel-mode",
    backKeyLongPress: "emergency-alarm",
    autoLock: true,
    lockType: "ptt-encoder-and-keys",
    lockDelaySeconds: 600,
  })
})

test("edits Keyboard Settings with distinct short and long indexes", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editKeyboardSettings({
    sideKey1ShortPress: "send-beacon",
    sideKey1LongPress: "send-beacon",
    digit9LongPress: "send-tone-burst",
    autoLock: true,
    lockType: "ptt-and-encoder",
    lockDelaySeconds: 120,
  })
  const result = edited.toBytes()

  assert.equal(result[offset(0x15410)], 2)
  assert.equal(result[offset(0x15411)], 3)
  assert.equal(result[offset(0x15459)], 2)
  assert.equal(result[offset(0x15420)], 1)
  assert.equal(result[offset(0x15421)], 5)
  assert.equal(result[offset(0x15422)], 22)
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("rejects invalid Keyboard Settings and preserves unknown values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15410)] = 0xff
  bytes[offset(0x15421)] = 0xff
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getKeyboardSettings()

  assert.equal(isUnknownSettingValue(settings.sideKey1ShortPress), true)
  assert.equal(isUnknownSettingValue(settings.lockType), true)
  assert.throws(
    () =>
      codeplug.editKeyboardSettings({
        sideKey1ShortPress: "send-tone-burst" as "send-beacon",
      }),
    /Unsupported Keyboard Setting value/
  )
  assert.throws(
    () => codeplug.editKeyboardSettings({ lockDelaySeconds: 1 as 3 }),
    /Unsupported Keyboard Setting value/
  )
})

test("reconciles Keyboard Setting changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editKeyboardSettings({ autoLock: true })
  const changes = reconcileKeyboardSettingChanges([], baseline, edited, [
    "autoLock",
  ])

  assert.deepEqual(changes, [
    { kind: "edit-keyboard-setting", field: "autoLock" },
  ])
  assert.deepEqual(
    reconcileKeyboardSettingChanges(
      changes,
      baseline,
      edited.editKeyboardSettings({ autoLock: false }),
      ["autoLock"]
    ),
    []
  )
})
