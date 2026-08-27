import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  SPECTRUM_SETTING_OPTIONS,
  SPECTRUM_SETTINGS_OFFSET,
  createCodeplug,
  createSpectrumModeChangePatch,
  isUnknownSettingValue,
  type SpectrumMode,
  type SpectrumScanSpeed,
} from "../modules/codeplug/index.ts"
import { reconcileSpectrumSettingChanges } from "../modules/cps-workspace/change-set.ts"

const MODE = SPECTRUM_SETTINGS_OFFSET
const RESERVED = MODE + 1
const LOWER_FREQUENCY = MODE + 2
const UPPER_FREQUENCY = MODE + 6
const STEP = MODE + 10
const MODULATION = MODE + 11
const SCAN_SPEED = MODE + 12
const ZONE_MASK = MODE + 18
const SCAN_LIST_MASK = MODE + 22

test("decodes the current-CPS Spectrum storage layout", () => {
  const bytes = fixture()
  const view = new DataView(bytes.buffer)
  bytes[MODE] = 1
  bytes[RESERVED] = 0xff
  view.setUint32(LOWER_FREQUENCY, 146_000_000)
  view.setUint32(UPPER_FREQUENCY, 148_000_000)
  bytes[STEP] = 9
  bytes[MODULATION] = 3
  bytes[SCAN_SPEED] = 4
  view.setUint32(ZONE_MASK, 0x8000_0003)
  view.setUint32(SCAN_LIST_MASK, 0x4000_0005)

  assert.deepEqual(createCodeplug(bytes).getSpectrumSettings(), {
    mode: "edge",
    lowerFrequencyHz: 146_000_000,
    upperFrequencyHz: 148_000_000,
    stepKHz: 25,
    modulation: "am-narrow",
    scanSpeed: "turbo",
    zoneNumbers: [1, 2],
    scanListNumbers: [1, 3],
  })
})

test("round trips every Spectrum mode and scan speed index", () => {
  for (const [raw, mode] of SPECTRUM_SETTING_OPTIONS.modes.entries()) {
    const bytes = fixture()
    bytes[MODE] = raw
    const codeplug = createCodeplug(bytes)
    assert.equal(codeplug.getSpectrumSettings().mode, mode)
    assert.equal(codeplug.editSpectrumSettings({ mode }).toBytes()[MODE], raw)
  }

  for (const [
    raw,
    scanSpeed,
  ] of SPECTRUM_SETTING_OPTIONS.scanSpeeds.entries()) {
    const bytes = fixture()
    bytes[SCAN_SPEED] = raw
    const codeplug = createCodeplug(bytes)
    assert.equal(codeplug.getSpectrumSettings().scanSpeed, scanSpeed)
    assert.equal(
      codeplug.editSpectrumSettings({ scanSpeed }).toBytes()[SCAN_SPEED],
      raw
    )
  }
})

test("round trips every Spectrum step and modulation index", () => {
  for (const [raw, stepKHz] of SPECTRUM_SETTING_OPTIONS.stepsKHz.entries()) {
    const bytes = fixture()
    bytes[STEP] = raw
    bytes[MODULATION] = stepKHz === 8.33 ? 2 : 0
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getSpectrumSettings().stepKHz, stepKHz)
    assert.equal(
      codeplug.editSpectrumSettings({ stepKHz }).toBytes()[STEP],
      raw
    )
  }

  for (const [
    raw,
    modulation,
  ] of SPECTRUM_SETTING_OPTIONS.modulations.entries()) {
    const bytes = fixture()
    bytes[MODULATION] = raw
    const codeplug = createCodeplug(bytes)

    assert.equal(codeplug.getSpectrumSettings().modulation, modulation)
    assert.equal(
      codeplug.editSpectrumSettings({ modulation }).toBytes()[MODULATION],
      raw
    )
  }
})

test("edits Edge settings in big-endian layout and preserves the reserved byte", () => {
  const bytes = fixture()
  bytes[RESERVED] = 0xa5
  const sourceView = new DataView(bytes.buffer)
  sourceView.setUint32(LOWER_FREQUENCY, 144_000_000)
  sourceView.setUint32(UPPER_FREQUENCY, 145_000_000)
  const edited = createCodeplug(bytes).editSpectrumSettings({
    mode: "edge",
    lowerFrequencyHz: 146_000_000,
    upperFrequencyHz: 148_000_000,
    stepKHz: 12.5,
    modulation: "fm-narrow",
    scanSpeed: "very-high",
  })
  const written = edited.toBytes()
  const view = new DataView(written.buffer)
  const changedOffsets = Array.from(written).flatMap((byte, index) =>
    byte === bytes[index] ? [] : [index]
  )

  assert.equal(written[MODE], 1)
  assert.equal(written[RESERVED], 0xa5)
  assert.equal(view.getUint32(LOWER_FREQUENCY), 146_000_000)
  assert.equal(view.getUint32(UPPER_FREQUENCY), 148_000_000)
  assert.equal(written[STEP], 6)
  assert.equal(written[MODULATION], 1)
  assert.equal(written[SCAN_SPEED], 3)
  assert.deepEqual(changedOffsets, [
    MODE,
    LOWER_FREQUENCY + 1,
    LOWER_FREQUENCY + 2,
    LOWER_FREQUENCY + 3,
    UPPER_FREQUENCY + 1,
    UPPER_FREQUENCY + 2,
    UPPER_FREQUENCY + 3,
    STEP,
    MODULATION,
    SCAN_SPEED,
  ])
})

test("edits required Zone and Scan List masks while preserving upper bits", () => {
  const bytes = fixture()
  const view = new DataView(bytes.buffer)
  view.setUint32(ZONE_MASK, 0xa5a5_0001)
  view.setUint32(SCAN_LIST_MASK, 0x5a5a_0001)

  const edited = createCodeplug(bytes).editSpectrumSettings({
    zoneNumbers: [1, 2, 16],
    scanListNumbers: [2, 3],
  })
  const writtenView = new DataView(edited.toBytes().buffer)

  assert.equal(writtenView.getUint32(ZONE_MASK), 0xa5a5_8003)
  assert.equal(writtenView.getUint32(SCAN_LIST_MASK), 0x5a5a_0006)
  assert.deepEqual(edited.getSpectrumSettings().zoneNumbers, [1, 2, 16])
  assert.deepEqual(edited.getSpectrumSettings().scanListNumbers, [2, 3])
})

test("preserves unknown indexes and rejects invalid authored Spectrum values", () => {
  const bytes = fixture()
  bytes[MODE] = 0xff
  bytes[STEP] = 0xff
  bytes[MODULATION] = 0xff
  bytes[SCAN_SPEED] = 0xff
  const codeplug = createCodeplug(bytes)
  const settings = codeplug.getSpectrumSettings()

  assert.equal(isUnknownSettingValue(settings.mode), true)
  assert.equal(isUnknownSettingValue(settings.stepKHz), true)
  assert.equal(isUnknownSettingValue(settings.modulation), true)
  assert.equal(isUnknownSettingValue(settings.scanSpeed), true)
  assert.deepEqual(codeplug.toBytes(), bytes)
  assert.throws(
    () => codeplug.editSpectrumSettings({ mode: "waterfall" as SpectrumMode }),
    /Unsupported Spectrum mode/
  )
  assert.throws(
    () =>
      codeplug.editSpectrumSettings({
        scanSpeed: "instant" as SpectrumScanSpeed,
      }),
    /Unsupported Spectrum scan speed/
  )
  assert.throws(
    () => codeplug.editSpectrumSettings({ scanListNumbers: [1, 1] }),
    /cannot contain duplicates/
  )
})

test("rejects invalid Edge ranges and 8.33 kHz FM", () => {
  const codeplug = createCodeplug(fixture())

  assert.throws(
    () =>
      codeplug.editSpectrumSettings({
        lowerFrequencyHz: 107_999_999,
        upperFrequencyHz: 148_000_000,
      }),
    /between 108 and 660 MHz/
  )
  assert.throws(
    () =>
      codeplug.editSpectrumSettings({
        lowerFrequencyHz: 149_000_000,
        upperFrequencyHz: 148_000_000,
      }),
    /greater than or equal/
  )
  assert.throws(
    () => codeplug.editSpectrumSettings({ stepKHz: 8.33 }),
    /only available for AM modes/
  )
})

test("reconciles Spectrum changes per field against the baseline", () => {
  const baseline = createCodeplug(fixture())
  const edited = baseline.editSpectrumSettings({
    mode: "zone",
    scanSpeed: "turbo",
    zoneNumbers: [1, 2],
  })
  const fields = ["mode", "scanSpeed", "zoneNumbers"] as const
  const changes = reconcileSpectrumSettingChanges([], baseline, edited, fields)

  assert.deepEqual(changes, [
    { kind: "edit-spectrum-setting", field: "mode" },
    { kind: "edit-spectrum-setting", field: "scanSpeed" },
    { kind: "edit-spectrum-setting", field: "zoneNumbers" },
  ])
  assert.deepEqual(
    reconcileSpectrumSettingChanges(changes, baseline, baseline, fields),
    []
  )
})

test("changes only Spectrum mode when collection masks are empty", () => {
  const bytes = fixture()
  const view = new DataView(bytes.buffer)
  view.setUint32(ZONE_MASK, 0)
  view.setUint32(SCAN_LIST_MASK, 0)
  const baseline = createCodeplug(bytes)
  const edited = baseline.editSpectrumSettings({ mode: "zone" })
  const written = edited.toBytes()
  const changedOffsets = Array.from(written).flatMap((byte, index) =>
    byte === bytes[index] ? [] : [index]
  )

  assert.deepEqual(edited.getSpectrumSettings().zoneNumbers, [])
  assert.deepEqual(edited.getSpectrumSettings().scanListNumbers, [])
  assert.deepEqual(changedOffsets, [MODE])
  assert.deepEqual(
    reconcileSpectrumSettingChanges([], baseline, edited, ["mode"]),
    [{ kind: "edit-spectrum-setting", field: "mode" }]
  )
})

test("returning to Center clears Zone selections from the Change Set", () => {
  const baseline = createCodeplug(fixture())
  let working = baseline.editSpectrumSettings({ mode: "zone" })
  let changes = reconcileSpectrumSettingChanges([], baseline, working, ["mode"])

  working = working.editSpectrumSettings({ zoneNumbers: [1, 2] })
  changes = reconcileSpectrumSettingChanges(changes, baseline, working, [
    "zoneNumbers",
  ])

  const modePatch = createSpectrumModeChangePatch(
    working.getSpectrumSettings(),
    baseline.getSpectrumSettings(),
    "center"
  )
  working = working.editSpectrumSettings(modePatch)
  changes = reconcileSpectrumSettingChanges(
    changes,
    baseline,
    working,
    Object.keys(modePatch) as (keyof typeof modePatch)[]
  )

  assert.equal(working.equals(baseline), true)
  assert.deepEqual(changes, [])
})

test("leaving a collection mode restores an empty baseline mask", () => {
  const bytes = fixture()
  new DataView(bytes.buffer).setUint32(ZONE_MASK, 0)
  const baseline = createCodeplug(bytes)
  let working = baseline
    .editSpectrumSettings({ mode: "zone" })
    .editSpectrumSettings({ zoneNumbers: [2, 3] })
  const modePatch = createSpectrumModeChangePatch(
    working.getSpectrumSettings(),
    baseline.getSpectrumSettings(),
    "center"
  )

  working = working.editSpectrumSettings(modePatch)

  assert.equal(working.equals(baseline), true)
  assert.deepEqual(working.getSpectrumSettings().zoneNumbers, [])
})

test("leaving Scan List mode restores its baseline selection", () => {
  const baseline = createCodeplug(fixture())
  const working = baseline
    .editSpectrumSettings({ mode: "scan-list" })
    .editSpectrumSettings({ scanListNumbers: [2, 4] })
  const modePatch = createSpectrumModeChangePatch(
    working.getSpectrumSettings(),
    baseline.getSpectrumSettings(),
    "center"
  )
  const restored = working.editSpectrumSettings(modePatch)

  assert.equal(restored.equals(baseline), true)
  assert.deepEqual(restored.getSpectrumSettings().scanListNumbers, [1])
})

test("leaving Edge mode restores exact baseline values, including unknown indexes", () => {
  const bytes = fixture()
  bytes[STEP] = 0xfe
  bytes[MODULATION] = 0xfd
  const baseline = createCodeplug(bytes)
  const working = baseline
    .editSpectrumSettings({ mode: "edge" })
    .editSpectrumSettings({
      lowerFrequencyHz: 144_000_000,
      upperFrequencyHz: 146_000_000,
      stepKHz: 12.5,
      modulation: "fm-narrow",
    })
  const modePatch = createSpectrumModeChangePatch(
    working.getSpectrumSettings(),
    baseline.getSpectrumSettings(),
    "center"
  )
  const restored = working.editSpectrumSettings(modePatch)

  assert.equal(restored.equals(baseline), true)
  assert.equal(restored.toBytes()[STEP], 0xfe)
  assert.equal(restored.toBytes()[MODULATION], 0xfd)
})

function fixture() {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const view = new DataView(bytes.buffer)
  bytes[RESERVED] = 0xff
  view.setUint32(LOWER_FREQUENCY, 146_000_000)
  view.setUint32(UPPER_FREQUENCY, 148_000_000)
  bytes[STEP] = 9
  bytes[MODULATION] = 0
  view.setUint32(ZONE_MASK, 1)
  view.setUint32(SCAN_LIST_MASK, 1)
  return bytes
}
