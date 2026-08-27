import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  DTMF_SETTINGS_OFFSET,
  FIVE_TONE_SETTINGS_OFFSET,
  SIGNAL_SYSTEM_OPTIONS,
  TWO_TONE_SETTINGS_OFFSET,
  createCodeplug,
} from "../modules/codeplug/index.ts"

test("decodes and edits every DTMF settings group at documented offsets", () => {
  const baseline = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const initial = baseline.getDtmfSettings()
  const memories = initial.encodeMemories.map((value, index) =>
    index === 10 ? "123A*#" : value
  )
  const pttIds = initial.pttIds.map((record, index) =>
    index === 0
      ? { ...record, type: "tx-start-stop" as const, start: "123", stop: "456" }
      : record
  )

  const edited = baseline.editDtmfSettings({
    ownId: "12345678",
    separator: "#",
    groupCallCode: "*",
    dialerType: "automatic",
    transmitSidetone: true,
    digitDurationMs: 100,
    firstDigitDurationMs: 200,
    preCarrierMs: 50,
    postTransmitDelayMs: 60,
    dCodeDelaySeconds: 1,
    pttIdPauseSeconds: 3,
    decodeResponse: "beep",
    autoResetSeconds: 10,
    aniDisplay: "any-id",
    killCode: "1111",
    stunCode: "2222",
    wakeCode: "3333",
    encodeMemories: memories,
    pttIds,
  })
  const settings = edited.getDtmfSettings()
  const bytes = edited.toBytes()

  assert.equal(settings.ownId, "12345678")
  assert.equal(settings.separator, "#")
  assert.equal(settings.groupCallCode, "*")
  assert.equal(settings.dialerType, "automatic")
  assert.equal(settings.encodeMemories[10], "123A*#")
  assert.deepEqual(settings.pttIds[0], {
    number: 0,
    type: "tx-start-stop",
    start: "123",
    stop: "456",
  })
  assert.equal(bytes[DTMF_SETTINGS_OFFSET + 0x0a], 5)
  assert.equal(bytes[DTMF_SETTINGS_OFFSET + 0x0b], 4)
  assert.equal(bytes[DTMF_SETTINGS_OFFSET + 0x0c], 1)
  assert.equal(bytes[DTMF_SETTINGS_OFFSET + 0x1e], 1)
  assert.equal(bytes[DTMF_SETTINGS_OFFSET + 0x1c2], 3)
  assert.deepEqual(baseline.toBytes(), new Uint8Array(CODEPLUG_SIZE))
})

test("encodes 2-Tone frequencies as little-endian tenths of a hertz", () => {
  const baseline = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const settings = baseline.getTwoToneSettings()
  const encodeRecords = settings.encodeRecords.map((record, index) =>
    index === 0
      ? { ...record, tone1Hz: 1450, tone2Hz: 1234.5, name: "2TENC-0" }
      : record
  )
  const decodeRecords = settings.decodeRecords.map((record, index) =>
    index === 0
      ? {
          ...record,
          tone1Hz: 1450,
          tone2Hz: 1234.5,
          response: "beep" as const,
          name: "2TDEC-0",
        }
      : record
  )

  const edited = baseline.editTwoToneSettings({
    tone1DurationMs: 1000,
    tone2DurationMs: 1000,
    longToneDurationMs: 1000,
    toneGapMs: 500,
    transmitSidetone: true,
    autoResetSeconds: 10,
    encodeRecords,
    decodeRecords,
  })
  const bytes = edited.toBytes()
  const view = new DataView(bytes.buffer)

  assert.equal(view.getUint16(TWO_TONE_SETTINGS_OFFSET + 0x0a, true), 14500)
  assert.equal(view.getUint16(TWO_TONE_SETTINGS_OFFSET + 0x0c, true), 12345)
  assert.equal(view.getUint16(TWO_TONE_SETTINGS_OFFSET + 0x100, true), 14500)
  assert.equal(edited.getTwoToneSettings().decodeRecords[0]?.response, "beep")
  assert.equal(edited.getTwoToneSettings().encodeRecords[10]?.label, "A")
})

test("uses the documented 5-Tone standard indexes in every record family", () => {
  const baseline = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const settings = baseline.getFiveToneSettings()
  const encodeRecords = settings.encodeRecords.map((record, index) =>
    index === 0
      ? {
          ...record,
          standard: "EIA" as const,
          code: "12345678",
          name: "5TENC-00",
        }
      : record
  )
  const pttIds = settings.pttIds.map((record, index) =>
    index === 0
      ? {
          ...record,
          type: "tx-start" as const,
          standard: "CCIR2" as const,
          start: "12345678",
        }
      : record
  )
  const informationCodes = settings.informationCodes.map((record, index) =>
    index === 0
      ? { ...record, function: "activate" as const, code: "ABCDEF" }
      : record
  )

  const edited = baseline.editFiveToneSettings({
    ownId: "12345678",
    transmitSidetone: true,
    preCarrierMs: 30,
    postTransmitDelayMs: 20,
    firstDigitDurationMs: 1000,
    pauseCode: "F",
    pauseDurationMs: 1000,
    firstToneAfterPauseMs: 500,
    pttIdPauseSeconds: 5,
    decodeStandard: "EIA",
    decodeDigitMask: 0xff,
    decodeResponse: "beep",
    autoResetSeconds: 10,
    aniDisplay: "any-id",
    encodeRecords,
    pttIds,
    informationCodes,
  })
  const bytes = edited.toBytes()

  assert.equal(bytes[FIVE_TONE_SETTINGS_OFFSET + 0x1e], 14)
  assert.equal(bytes[FIVE_TONE_SETTINGS_OFFSET + 0x100], 14)
  assert.equal(bytes[FIVE_TONE_SETTINGS_OFFSET + 0x341], 7)
  assert.equal(bytes[FIVE_TONE_SETTINGS_OFFSET + 0x540], 5)
  assert.equal(edited.getFiveToneSettings().encodeRecords[14]?.label, "*")
  assert.deepEqual(SIGNAL_SYSTEM_OPTIONS.fiveToneStandards, [
    "ZVEI1",
    "ZVEI2",
    "ZVEI3",
    "PZVEI",
    "DZVEI",
    "PDZVEI",
    "CCIR1",
    "CCIR2",
    "PCCIR",
    "EEA",
    "EURO SIGNAL",
    "NATEL",
    "MODAT",
    "CCITT",
    "EIA",
  ])
})

test("preserves reserved and unrelated bytes while rejecting invalid values", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes[TWO_TONE_SETTINGS_OFFSET + 0x10d] = 0xa5
  bytes[FIVE_TONE_SETTINGS_OFFSET - 1] = 0x5a
  const codeplug = createCodeplug(bytes)

  const twoToneRecords = codeplug
    .getTwoToneSettings()
    .decodeRecords.map((record, index) =>
      index === 0 ? { ...record, name: "TEST" } : record
    )
  const edited = codeplug.editTwoToneSettings({ decodeRecords: twoToneRecords })

  assert.equal(edited.toBytes()[TWO_TONE_SETTINGS_OFFSET + 0x10d], 0xa5)
  assert.equal(
    codeplug.editFiveToneSettings({ decodeStandard: "ZVEI2" }).toBytes()[
      FIVE_TONE_SETTINGS_OFFSET - 1
    ],
    0x5a
  )
  assert.throws(
    () => codeplug.editDtmfSettings({ ownId: "INVALID-E" }),
    /valid symbols/
  )
  assert.throws(() => {
    const records = codeplug
      .getTwoToneSettings()
      .encodeRecords.map((record, index) =>
        index === 0 ? { ...record, tone1Hz: 100 } : record
      )
    codeplug.editTwoToneSettings({ encodeRecords: records })
  }, /between 288.0 and 3106.0/)
})
