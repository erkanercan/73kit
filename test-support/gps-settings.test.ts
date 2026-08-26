import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  GPS_SETTING_OPTIONS,
  GPS_SETTINGS_OFFSET,
  createCodeplug,
  isUnknownSettingValue,
  type GpsConstellation,
} from "../modules/codeplug/index.ts"
import { reconcileGpsSettingChanges } from "../modules/cps-workspace/change-set.ts"

const constellationModes: readonly (readonly GpsConstellation[])[] = [
  ["gps"],
  ["bds"],
  ["gps", "bds"],
  ["glonass"],
  ["gps", "glonass"],
  ["bds", "glonass"],
  ["gps", "bds", "glonass"],
]

test("decodes the GPS settings from a real-radio-shaped snapshot", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.set([0x00, 0x06, 0x11], GPS_SETTINGS_OFFSET)

  assert.deepEqual(createCodeplug(bytes).getGpsSettings(), {
    enabled: false,
    constellations: ["gps", "bds", "glonass"],
    timezoneOffsetMinutes: 180,
  })
})

test("round trips every documented constellation combination", () => {
  for (const [raw, constellations] of constellationModes.entries()) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes[GPS_SETTINGS_OFFSET + 1] = raw
    const codeplug = createCodeplug(bytes)

    assert.deepEqual(codeplug.getGpsSettings().constellations, constellations)
    assert.equal(
      codeplug.editGpsSettings({ constellations }).toBytes()[
        GPS_SETTINGS_OFFSET + 1
      ],
      raw
    )
  }
})

test("round trips every documented GPS time-zone offset", () => {
  for (const [
    raw,
    offsetMinutes,
  ] of GPS_SETTING_OPTIONS.timezoneOffsetsMinutes.entries()) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes[GPS_SETTINGS_OFFSET + 2] = raw
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getGpsSettings().timezoneOffsetMinutes, offsetMinutes)
    assert.equal(
      codeplug
        .editGpsSettings({ timezoneOffsetMinutes: offsetMinutes })
        .toBytes()[GPS_SETTINGS_OFFSET + 2],
      raw
    )
  }
})

test("edits only the three GPS bytes and preserves the source Codeplug", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE).fill(0xaa)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editGpsSettings({
    enabled: true,
    constellations: ["gps", "glonass"],
    timezoneOffsetMinutes: 180,
  })
  const result = edited.toBytes()
  const changedOffsets = Array.from(result).flatMap((byte, index) =>
    byte === bytes[index] ? [] : [index]
  )

  assert.deepEqual(changedOffsets, [
    GPS_SETTINGS_OFFSET,
    GPS_SETTINGS_OFFSET + 1,
    GPS_SETTINGS_OFFSET + 2,
  ])
  assert.deepEqual(
    Array.from(result.slice(GPS_SETTINGS_OFFSET, GPS_SETTINGS_OFFSET + 3)),
    [0x01, 0x04, 0x11]
  )
  assert.deepEqual(baseline.toBytes(), bytes)
})

test("preserves unknown GPS values and rejects invalid authored values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.set([0xff, 0xff, 0xff], GPS_SETTINGS_OFFSET)
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getGpsSettings()

  assert.equal(isUnknownSettingValue(settings.enabled), true)
  assert.equal(isUnknownSettingValue(settings.constellations), true)
  assert.equal(isUnknownSettingValue(settings.timezoneOffsetMinutes), true)
  assert.deepEqual(codeplug.toBytes(), bytes)
  assert.throws(
    () => codeplug.editGpsSettings({ constellations: [] }),
    /At least one GPS constellation/
  )
  assert.throws(
    () =>
      codeplug.editGpsSettings({
        constellations: ["galileo" as GpsConstellation],
      }),
    /Unsupported GPS constellation/
  )
  assert.throws(
    () => codeplug.editGpsSettings({ timezoneOffsetMinutes: 1 as 180 }),
    /Unsupported GPS time-zone offset/
  )
})

test("reconciles GPS changes per field against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editGpsSettings({
    enabled: true,
    constellations: ["gps", "bds", "glonass"],
    timezoneOffsetMinutes: 180,
  })
  const fields = ["enabled", "constellations", "timezoneOffsetMinutes"] as const
  const changes = reconcileGpsSettingChanges([], baseline, edited, fields)

  assert.deepEqual(changes, [
    { kind: "edit-gps-setting", field: "enabled" },
    { kind: "edit-gps-setting", field: "constellations" },
    { kind: "edit-gps-setting", field: "timezoneOffsetMinutes" },
  ])
  assert.deepEqual(
    reconcileGpsSettingChanges(changes, baseline, baseline, fields),
    []
  )
})
