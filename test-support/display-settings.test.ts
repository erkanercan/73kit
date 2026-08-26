import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  createCodeplug,
  isUnknownSettingValue,
} from "../modules/codeplug/index.ts"
import { reconcileDisplaySettingChanges } from "../modules/cps-workspace/change-set.ts"

const FLASH_START = 0x8000
const offset = (address: number) => address - FLASH_START

test("decodes every documented Display Setting", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15400)] = 3
  bytes[offset(0x15405)] = 0b1010_0101
  bytes[offset(0x15406)] = 29
  bytes[offset(0x15407)] = 8
  bytes[offset(0x15408)] = 9
  bytes[offset(0x15409)] = 40
  bytes[offset(0x1540a)] = 1
  bytes[offset(0x1540b)] = 1
  bytes[offset(0x15423)] = 0b0110_0110
  bytes[offset(0x15424)] = 0b0001_1001
  bytes[offset(0x15425)] = 1
  bytes[offset(0x1542b)] = 2
  bytes[offset(0x1542c)] = 1
  bytes[offset(0x1542d)] = 2
  bytes[offset(0x1542e)] = 1
  bytes[offset(0x15460)] = 1
  bytes[offset(0x15461)] = 1
  bytes[offset(0x15462)] = 1
  bytes[offset(0x15463)] = 1
  bytes.set(new TextEncoder().encode("TYT UVL-15W"), offset(0x15464))

  assert.deepEqual(createCodeplug(bytes).getDisplaySettings(), {
    backlightLevel: 9,
    autoDimmingMode: "level-8",
    autoDimDelaySeconds: 3600,
    exitAutoDimOnReceive: true,
    exitAutoDimOnTransmit: true,
    showBootImage: true,
    showFirmwareVersion: true,
    showPowerOnMessage: true,
    showBatteryVoltage: true,
    powerOnMessage: "TYT UVL-15W",
    showChannelFrequency: true,
    showChannelName: false,
    showZoneName: true,
    coordinateFormat: "degrees-minutes-seconds",
    speedUnit: "mph",
    distanceUnit: "nautical-miles",
    altitudeUnit: "feet",
    rainfallUnit: "inches",
    windSpeedUnit: "knots",
    temperatureUnit: "fahrenheit",
    systemLanguage: "turkish",
    systemTheme: "dark",
    menuAutoExitSeconds: 600,
    batteryDisplayStyle: "icon-and-voltage",
    rxIndicatorLed: true,
    screenOffIndicatorLed: true,
    receivedSignalStrength: "rssi-and-dbm",
  })
})

test("edits Display Settings and preserves unrelated packed bits", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15405)] = 0b1111_1000
  bytes[offset(0x15423)] = 0b1100_0000
  bytes[offset(0x15424)] = 0b1100_0000
  const baseline = createCodeplug(bytes)
  const edited = baseline.editDisplaySettings({
    showChannelFrequency: true,
    coordinateFormat: "degrees-decimal-minutes",
    speedUnit: "knots",
    distanceUnit: "miles",
    altitudeUnit: "feet",
    rainfallUnit: "inches",
    windSpeedUnit: "mph",
    temperatureUnit: "fahrenheit",
    autoDimmingMode: "auto-off",
    powerOnMessage: "Merhaba TYT",
  })
  const result = edited.toBytes()

  assert.equal(result[offset(0x15405)], 0b1111_1001)
  assert.equal(result[offset(0x15423)], 0b0101_1001)
  assert.equal(result[offset(0x15424)], 0b1101_0101)
  assert.equal(result[offset(0x15408)], 1)
  assert.equal(
    new TextDecoder().decode(result.subarray(offset(0x15464), offset(0x1546f))),
    "Merhaba TYT"
  )
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("rejects invalid Display Settings and preserves unknown values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[offset(0x15407)] = 0xff
  bytes[offset(0x15423)] = 0b0000_0011
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getDisplaySettings()

  assert.equal(isUnknownSettingValue(settings.backlightLevel), true)
  assert.equal(isUnknownSettingValue(settings.coordinateFormat), true)
  assert.throws(
    () => codeplug.editDisplaySettings({ powerOnMessage: "12345678901234567" }),
    /at most 16 characters/
  )
  assert.throws(
    () => codeplug.editDisplaySettings({ backlightLevel: 10 as 9 }),
    /Unsupported Display Setting value/
  )
})

test("reconciles Display Setting changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editDisplaySettings({ systemTheme: "dark" })
  const changes = reconcileDisplaySettingChanges([], baseline, edited, [
    "systemTheme",
  ])

  assert.deepEqual(changes, [
    { kind: "edit-display-setting", field: "systemTheme" },
  ])
  assert.deepEqual(
    reconcileDisplaySettingChanges(
      changes,
      baseline,
      edited.editDisplaySettings({ systemTheme: "light" }),
      ["systemTheme"]
    ),
    []
  )
})
