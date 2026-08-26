import assert from "node:assert/strict"
import test from "node:test"

import {
  BLUETOOTH_SETTING_OPTIONS,
  BLUETOOTH_HOLD_TIME_OFFSET,
  BLUETOOTH_SETTINGS_OFFSET,
  CODEPLUG_SIZE,
  createCodeplug,
  isUnknownSettingValue,
  type BluetoothGainLevel,
  type BluetoothHoldTime,
  type BluetoothRole,
} from "../modules/codeplug/index.ts"
import { reconcileBluetoothSettingChanges } from "../modules/cps-workspace/change-set.ts"

test("decodes every documented Bluetooth setting", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.set([0x01, 0x00, 0x01, 0x07, 0x03, 0x01], BLUETOOTH_SETTINGS_OFFSET)
  bytes[BLUETOOTH_HOLD_TIME_OFFSET] = 0x23

  assert.deepEqual(createCodeplug(bytes).getBluetoothSettings(), {
    enabled: true,
    localMicrophone: false,
    localSpeaker: true,
    microphoneGainLevel: 8,
    speakerGainLevel: 4,
    role: "peripheral",
    holdTime: "infinite",
  })
})

test("round trips every documented Bluetooth option", () => {
  for (const [raw, role] of BLUETOOTH_SETTING_OPTIONS.roles.entries()) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes[BLUETOOTH_SETTINGS_OFFSET + 5] = raw
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getBluetoothSettings().role, role)
    assert.equal(
      codeplug.editBluetoothSettings({ role }).toBytes()[
        BLUETOOTH_SETTINGS_OFFSET + 5
      ],
      raw
    )
  }

  for (const [
    raw,
    gainLevel,
  ] of BLUETOOTH_SETTING_OPTIONS.gainLevels.entries()) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes[BLUETOOTH_SETTINGS_OFFSET + 3] = raw
    bytes[BLUETOOTH_SETTINGS_OFFSET + 4] = raw
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getBluetoothSettings().microphoneGainLevel, gainLevel)
    assert.equal(codeplug.getBluetoothSettings().speakerGainLevel, gainLevel)
    const edited = codeplug.editBluetoothSettings({
      microphoneGainLevel: gainLevel,
      speakerGainLevel: gainLevel,
    })
    assert.equal(edited.toBytes()[BLUETOOTH_SETTINGS_OFFSET + 3], raw)
    assert.equal(edited.toBytes()[BLUETOOTH_SETTINGS_OFFSET + 4], raw)
  }

  for (const [raw, holdTime] of BLUETOOTH_SETTING_OPTIONS.holdTimes.entries()) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes[BLUETOOTH_HOLD_TIME_OFFSET] = raw
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getBluetoothSettings().holdTime, holdTime)
    assert.equal(
      codeplug.editBluetoothSettings({ holdTime }).toBytes()[
        BLUETOOTH_HOLD_TIME_OFFSET
      ],
      raw
    )
  }
})

test("edits only the seven Bluetooth setting bytes and preserves the source Codeplug", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xaa)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editBluetoothSettings({
    enabled: true,
    localMicrophone: false,
    localSpeaker: true,
    microphoneGainLevel: 8,
    speakerGainLevel: 4,
    role: "peripheral",
    holdTime: "infinite",
  })
  const result = edited.toBytes()
  const changedOffsets = Array.from(result).flatMap((byte, index) =>
    byte === bytes[index] ? [] : [index]
  )

  assert.deepEqual(changedOffsets, [
    ...Array.from(
      { length: 6 },
      (_, index) => BLUETOOTH_SETTINGS_OFFSET + index
    ),
    BLUETOOTH_HOLD_TIME_OFFSET,
  ])
  assert.deepEqual(
    Array.from(
      result.slice(BLUETOOTH_SETTINGS_OFFSET, BLUETOOTH_SETTINGS_OFFSET + 6)
    ),
    [0x01, 0x00, 0x01, 0x07, 0x03, 0x01]
  )
  assert.deepEqual(baseline.toBytes(), bytes)
  assert.equal(result[BLUETOOTH_HOLD_TIME_OFFSET], 0x23)
})

test("preserves unknown Bluetooth values and rejects invalid authored values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.set([0xff, 0xff, 0xff, 0xff, 0xff, 0xff], BLUETOOTH_SETTINGS_OFFSET)
  bytes[BLUETOOTH_HOLD_TIME_OFFSET] = 0xff
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getBluetoothSettings()

  assert.equal(isUnknownSettingValue(settings.enabled), true)
  assert.equal(isUnknownSettingValue(settings.localMicrophone), true)
  assert.equal(isUnknownSettingValue(settings.localSpeaker), true)
  assert.equal(isUnknownSettingValue(settings.microphoneGainLevel), true)
  assert.equal(isUnknownSettingValue(settings.speakerGainLevel), true)
  assert.equal(isUnknownSettingValue(settings.role), true)
  assert.equal(isUnknownSettingValue(settings.holdTime), true)
  assert.deepEqual(codeplug.toBytes(), bytes)
  assert.throws(
    () => codeplug.editBluetoothSettings({ role: "central" as BluetoothRole }),
    /Unsupported Bluetooth role/
  )
  assert.throws(
    () =>
      codeplug.editBluetoothSettings({
        speakerGainLevel: 9 as BluetoothGainLevel,
      }),
    /Unsupported Bluetooth speaker gain/
  )
  assert.throws(
    () =>
      codeplug.editBluetoothSettings({ holdTime: 301 as BluetoothHoldTime }),
    /Unsupported Bluetooth hold time/
  )
})

test("reconciles Bluetooth changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editBluetoothSettings({
    enabled: true,
    localMicrophone: true,
    localSpeaker: true,
    microphoneGainLevel: 8,
    speakerGainLevel: 8,
    role: "peripheral",
    holdTime: "infinite",
  })
  const fields = [
    "enabled",
    "localMicrophone",
    "localSpeaker",
    "microphoneGainLevel",
    "speakerGainLevel",
    "role",
    "holdTime",
  ] as const
  const changes = reconcileBluetoothSettingChanges([], baseline, edited, fields)

  assert.deepEqual(changes, [
    { kind: "edit-bluetooth-setting", field: "enabled" },
    { kind: "edit-bluetooth-setting", field: "localMicrophone" },
    { kind: "edit-bluetooth-setting", field: "localSpeaker" },
    { kind: "edit-bluetooth-setting", field: "microphoneGainLevel" },
    { kind: "edit-bluetooth-setting", field: "speakerGainLevel" },
    { kind: "edit-bluetooth-setting", field: "role" },
    { kind: "edit-bluetooth-setting", field: "holdTime" },
  ])
  assert.deepEqual(
    reconcileBluetoothSettingChanges(changes, baseline, baseline, fields),
    []
  )
})
