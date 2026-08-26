import assert from "node:assert/strict"
import test from "node:test"

import {
  APRS_SETTINGS_OFFSET,
  CODEPLUG_SIZE,
  createCodeplug,
} from "../modules/codeplug/index.ts"
import { reconcileAprsSettingChanges } from "../modules/cps-workspace/change-set.ts"

test("decodes the radio-backed APRS fixture", () => {
  const bytes = aprsFixture()
  const settings = createCodeplug(bytes).getAprsSettings()

  assert.equal(settings.localCallsign, "TA4EN")
  assert.equal(settings.localSsid, 7)
  assert.equal(settings.symbolTable, "primary")
  assert.equal(settings.symbolIndex, 58)
  assert.equal(settings.destinationCallsign, "APRS")
  assert.equal(settings.destinationSsid, 0)
  assert.equal(settings.decodeCrc, true)
  assert.deepEqual(settings.reports.position, {
    decode: true,
    popupIndex: 5,
    alert: true,
  })
  assert.deepEqual(settings.transmitChannels[0], {
    number: 0,
    used: true,
    frequencyHz: 144_800_000,
    bandwidth: "wide",
    power: "low",
    toneType: "none",
    ctcssIndex: 0,
    dcsIndex: 0,
  })
  assert.equal(settings.transmitChannels[1]?.used, false)
  assert.equal(settings.beaconType, "fixed")
  assert.equal(settings.automaticBeaconIntervalIndex, 32)
  assert.equal(settings.preCarrierIndex, 7)
  assert.equal(settings.postTransmitDelayIndex, 7)
  assert.equal(settings.rfBeaconTransmission, true)
  assert.equal(settings.fixedPosition.latitude, 36.9383)
  assert.ok(
    settings.fixedPosition.longitude !== null &&
      Math.abs(settings.fixedPosition.longitude - 30.644929) < 0.000001
  )
  assert.equal(settings.fixedPosition.altitudeMeters, 100)
  assert.deepEqual(settings.digipeaterPath, [
    { callsign: "WIDE1", ssid: 1 },
    { callsign: "WIDE2", ssid: 1 },
  ])
  assert.equal(settings.comment, "TA4EN 145.500 73")
  assert.deepEqual(settings.tncUsb, { output: "rx-tx", format: "kiss" })
  assert.deepEqual(settings.tncBluetoothSpp, {
    output: "off",
    format: "kiss",
  })
  assert.deepEqual(settings.tncBluetoothBle, {
    output: "rx-tx",
    format: "kiss",
  })
})

test("edits callsigns and SSIDs without retaining stale callsign bytes", () => {
  const baseline = createCodeplug(aprsFixture())
  const edited = baseline.editAprsSettings({
    localCallsign: "N0CALL",
    localSsid: 6,
    destinationCallsign: "APZ",
    destinationSsid: 1,
  })
  const bytes = edited.toBytes()
  const offset = APRS_SETTINGS_OFFSET

  assert.deepEqual(
    Array.from(bytes.subarray(offset, offset + 6)),
    [0x4e, 0x30, 0x43, 0x41, 0x4c, 0x4c]
  )
  assert.equal(bytes[offset + 0x06], 6)
  assert.deepEqual(
    Array.from(bytes.subarray(offset + 0x21, offset + 0x27)),
    [0x41, 0x50, 0x5a, 0, 0, 0]
  )
  assert.equal(bytes[offset + 0x27], 1)
  assert.deepEqual(baseline.toBytes(), aprsFixture())
})

test("encodes radio-backed frequency, fixed position, path, and TNC values", () => {
  const baseline = createCodeplug(aprsFixture())
  const channels = baseline
    .getAprsSettings()
    .transmitChannels.map((channel, index) =>
      index === 1
        ? {
            ...channel,
            used: true,
            frequencyHz: 145_500_000,
            bandwidth: "narrow" as const,
            power: "high" as const,
            toneType: "ctcss" as const,
            ctcssIndex: 20,
          }
        : channel
    )
  const edited = baseline.editAprsSettings({
    transmitChannels: channels,
    fixedPosition: {
      latitude: -22.345678,
      longitude: 113.456789,
      altitudeMeters: 123,
      altitudeUnit: "meters",
    },
    digipeaterPath: [{ callsign: "WIDE1", ssid: 1 }],
    comment: "Portable",
    tncUsb: { output: "rx", format: "ui-text" },
  })
  const result = edited.getAprsSettings()

  assert.equal(result.transmitChannels[1]?.frequencyHz, 145_500_000)
  assert.equal(result.fixedPosition.latitude, -22.345678)
  assert.ok(
    result.fixedPosition.longitude !== null &&
      Math.abs(result.fixedPosition.longitude - 113.456789) < 0.000001
  )
  assert.equal(result.fixedPosition.altitudeMeters, 123)
  assert.deepEqual(result.digipeaterPath, [{ callsign: "WIDE1", ssid: 1 }])
  assert.equal(result.comment, "Portable")
  assert.deepEqual(result.tncUsb, { output: "rx", format: "ui-text" })
})

test("uses the corrected 45-second manual interval at index 23", () => {
  const baseline = createCodeplug(aprsFixture())
  const edited = baseline.editAprsSettings({ manualBeaconIntervalIndex: 23 })

  assert.equal(edited.toBytes()[APRS_SETTINGS_OFFSET + 0xe8], 23)
  assert.equal(edited.getAprsSettings().manualBeaconIntervalIndex, 23)
})

test("rejects invalid APRS values and preserves unrelated bytes", () => {
  const bytes = aprsFixture()
  bytes[APRS_SETTINGS_OFFSET - 1] = 0xa5
  const codeplug = createCodeplug(bytes)

  assert.throws(
    () => codeplug.editAprsSettings({ localCallsign: "TOO-LONG" }),
    /1–6 ASCII/
  )
  assert.throws(
    () => codeplug.editAprsSettings({ destinationSsid: 16 }),
    /between 0 and 15/
  )
  assert.equal(
    codeplug.editAprsSettings({ comment: "Changed" }).toBytes()[
      APRS_SETTINGS_OFFSET - 1
    ],
    0xa5
  )
})

test("reconciles APRS changes per top-level field", () => {
  const baseline = createCodeplug(aprsFixture())
  const edited = baseline.editAprsSettings({ localSsid: 6, comment: "Test" })
  const changes = reconcileAprsSettingChanges([], baseline, edited, [
    "localSsid",
    "comment",
  ])

  assert.deepEqual(changes, [
    { kind: "edit-aprs-setting", field: "localSsid" },
    { kind: "edit-aprs-setting", field: "comment" },
  ])
  assert.deepEqual(
    reconcileAprsSettingChanges(
      changes,
      baseline,
      edited.editAprsSettings({ localSsid: 7 }),
      ["localSsid"]
    ),
    [{ kind: "edit-aprs-setting", field: "comment" }]
  )
})

function aprsFixture() {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const offset = APRS_SETTINGS_OFFSET
  const view = new DataView(bytes.buffer)
  bytes.fill(0xff, offset, offset + 0x400)
  bytes.set([0x54, 0x41, 0x34, 0x45, 0x4e, 0x07], offset)
  bytes[offset + 0x06] = 7
  bytes[offset + 0x07] = 0
  bytes[offset + 0x08] = 58
  for (let index = 0; index < 7; index += 1) {
    bytes[offset + 0x0b + index] = 1
    bytes[offset + 0x12 + index] = 5
    bytes[offset + 0x19 + index] = 1
  }
  bytes[offset + 0x20] = 1
  bytes.set([0x41, 0x50, 0x52, 0x53, 0, 0x08], offset + 0x21)
  bytes[offset + 0x27] = 0
  bytes.set([0x08, 0xa1, 0x79, 0, 0xff, 0, 0, 0, 0, 0], offset + 0x28)
  bytes[offset + 0xc8] = 0
  bytes[offset + 0xc9] = 0
  bytes[offset + 0xca] = 0
  bytes[offset + 0xcb] = 32
  view.setInt32(offset + 0xcc, 365_629_800, true)
  view.setInt32(offset + 0xd0, 100_000, true)
  view.setInt32(offset + 0xd4, 303_869_574, true)
  view.setInt32(offset + 0xd8, 100_000, true)
  view.setInt32(offset + 0xdc, 100_000, true)
  view.setInt32(offset + 0xe0, 1000, true)
  bytes[offset + 0xe4] = 1
  bytes[offset + 0xe5] = 7
  bytes[offset + 0xe6] = 7
  bytes[offset + 0xe7] = 1
  bytes[offset + 0xe8] = 0
  bytes[offset + 0xe9] = 1
  bytes[offset + 0xea] = 1
  bytes[offset + 0xff] = 2
  bytes.set([0x57, 0x49, 0x44, 0x45, 0x31, 0, 1], offset + 0x100)
  bytes.set([0x57, 0x49, 0x44, 0x45, 0x32, 0, 1], offset + 0x107)
  bytes.set(new TextEncoder().encode("TA4EN 145.500 73"), offset + 0x200)
  bytes.fill(0, offset + 0x212, offset + 0x240)
  bytes.set([3, 0, 0, 0, 3, 0], offset + 0x240)
  return bytes
}
