import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const DTMF_SETTINGS_ADDRESS = 0x16000
const DTMF_SETTINGS_OFFSET = DTMF_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const DTMF_SETTINGS_SIZE = 0x400
const TWO_TONE_SETTINGS_ADDRESS = 0x16800
const TWO_TONE_SETTINGS_OFFSET =
  TWO_TONE_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const TWO_TONE_SETTINGS_SIZE = 0x200
const FIVE_TONE_SETTINGS_ADDRESS = 0x17000
const FIVE_TONE_SETTINGS_OFFSET =
  FIVE_TONE_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const FIVE_TONE_SETTINGS_SIZE = 0x800

const DTMF_SYMBOLS = ["A", "B", "C", "D", "*", "#"] as const
const DIALER_TYPES = ["manual", "automatic"] as const
const RESPONSE_TYPES = ["none", "beep", "beep-and-respond"] as const
const ANI_DISPLAY_TYPES = ["off", "matched-id", "any-id"] as const
const PTT_ID_TYPES = ["off", "tx-start", "tx-stop", "tx-start-stop"] as const
const FIVE_TONE_STANDARDS = [
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
] as const
const FIVE_TONE_PAUSE_CODES = ["none", "B", "C", "D", "F"] as const
const FIVE_TONE_INFORMATION_FUNCTIONS = [
  "selective-call",
  "group-call",
  "all-call",
  "stun",
  "kill",
  "activate",
] as const

const DTMF_DIGIT_DURATIONS_MS = [50, 75, 100, 200, 300, 500] as const
const FIRST_DIGIT_DURATIONS_MS = range(0, 2500, 50)
const PRE_POST_DURATIONS_MS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250,
  275, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
  1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500,
] as const
const D_CODE_DELAYS_SECONDS = [null, ...range(1, 15, 1)] as const
const PTT_ID_PAUSE_SECONDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
] as const
const AUTO_RESET_SECONDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50,
  60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250, 275, 300,
] as const
const TWO_TONE_DURATIONS_MS = range(500, 10000, 100)
const TWO_TONE_GAP_DURATIONS_MS = range(0, 2000, 100)
const FIVE_TONE_PAUSE_DURATIONS_MS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250,
  275, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
  1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500,
] as const

const DTMF_MEMORY_LABELS = [
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "dA",
  "dB",
  "dC",
  "dD",
  "d*",
  "d#",
] as const
const TWO_TONE_ENCODER_LABELS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const
const FIVE_TONE_ENCODER_LABELS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "*",
  "#",
] as const

type SettingValue<Value> = Value | UnknownSettingValue
type DtmfSymbol = (typeof DTMF_SYMBOLS)[number]
type DialerType = (typeof DIALER_TYPES)[number]
type ResponseType = (typeof RESPONSE_TYPES)[number]
type AniDisplayType = (typeof ANI_DISPLAY_TYPES)[number]
type PttIdType = (typeof PTT_ID_TYPES)[number]
type FiveToneStandard = (typeof FIVE_TONE_STANDARDS)[number]
type FiveTonePauseCode = (typeof FIVE_TONE_PAUSE_CODES)[number]
type FiveToneInformationFunction =
  (typeof FIVE_TONE_INFORMATION_FUNCTIONS)[number]

interface DtmfPttId {
  readonly number: number
  readonly type: SettingValue<PttIdType>
  readonly start: string
  readonly stop: string
}

interface DtmfSettings {
  readonly ownId: string
  readonly separator: SettingValue<DtmfSymbol>
  readonly groupCallCode: SettingValue<DtmfSymbol>
  readonly dialerType: SettingValue<DialerType>
  readonly transmitSidetone: SettingValue<boolean>
  readonly digitDurationMs: SettingValue<number>
  readonly firstDigitDurationMs: SettingValue<number>
  readonly preCarrierMs: SettingValue<number>
  readonly postTransmitDelayMs: SettingValue<number>
  readonly dCodeDelaySeconds: SettingValue<number | null>
  readonly pttIdPauseSeconds: SettingValue<number>
  readonly decodeResponse: SettingValue<ResponseType>
  readonly autoResetSeconds: SettingValue<number>
  readonly aniDisplay: SettingValue<AniDisplayType>
  readonly killCode: string
  readonly stunCode: string
  readonly wakeCode: string
  readonly encodeMemories: readonly string[]
  readonly pttIds: readonly DtmfPttId[]
}

type DtmfSettingsPatch = Partial<DtmfSettings>

interface TwoToneEncodeRecord {
  readonly number: number
  readonly label: string
  readonly tone1Hz: number | null
  readonly tone2Hz: number | null
  readonly name: string
}

interface TwoToneDecodeRecord {
  readonly number: number
  readonly tone1Hz: number | null
  readonly tone2Hz: number | null
  readonly response: SettingValue<ResponseType>
  readonly name: string
}

interface TwoToneSettings {
  readonly tone1DurationMs: SettingValue<number>
  readonly tone2DurationMs: SettingValue<number>
  readonly longToneDurationMs: SettingValue<number>
  readonly toneGapMs: SettingValue<number>
  readonly transmitSidetone: SettingValue<boolean>
  readonly autoResetSeconds: SettingValue<number>
  readonly encodeRecords: readonly TwoToneEncodeRecord[]
  readonly decodeRecords: readonly TwoToneDecodeRecord[]
}

type TwoToneSettingsPatch = Partial<TwoToneSettings>

interface FiveToneEncodeRecord {
  readonly number: number
  readonly label: string
  readonly standard: SettingValue<FiveToneStandard>
  readonly code: string
  readonly name: string
}

interface FiveTonePttId {
  readonly number: number
  readonly type: SettingValue<PttIdType>
  readonly standard: SettingValue<FiveToneStandard>
  readonly start: string
  readonly stop: string
}

interface FiveToneInformationCode {
  readonly number: number
  readonly function: SettingValue<FiveToneInformationFunction>
  readonly code: string
}

interface FiveToneSettings {
  readonly ownId: string
  readonly transmitSidetone: SettingValue<boolean>
  readonly preCarrierMs: SettingValue<number>
  readonly postTransmitDelayMs: SettingValue<number>
  readonly firstDigitDurationMs: SettingValue<number>
  readonly pauseCode: SettingValue<FiveTonePauseCode>
  readonly pauseDurationMs: SettingValue<number>
  readonly firstToneAfterPauseMs: SettingValue<number>
  readonly pttIdPauseSeconds: SettingValue<number>
  readonly decodeStandard: SettingValue<FiveToneStandard>
  readonly decodeDigitMask: number
  readonly decodeResponse: SettingValue<ResponseType>
  readonly autoResetSeconds: SettingValue<number>
  readonly aniDisplay: SettingValue<AniDisplayType>
  readonly encodeRecords: readonly FiveToneEncodeRecord[]
  readonly pttIds: readonly FiveTonePttId[]
  readonly informationCodes: readonly FiveToneInformationCode[]
}

type FiveToneSettingsPatch = Partial<FiveToneSettings>

const SIGNAL_SYSTEM_OPTIONS = Object.freeze({
  dtmfSymbols: DTMF_SYMBOLS,
  dialerTypes: DIALER_TYPES,
  responseTypes: RESPONSE_TYPES,
  aniDisplayTypes: ANI_DISPLAY_TYPES,
  pttIdTypes: PTT_ID_TYPES,
  fiveToneStandards: FIVE_TONE_STANDARDS,
  fiveTonePauseCodes: FIVE_TONE_PAUSE_CODES,
  fiveToneInformationFunctions: FIVE_TONE_INFORMATION_FUNCTIONS,
  dtmfDigitDurationsMs: DTMF_DIGIT_DURATIONS_MS,
  firstDigitDurationsMs: FIRST_DIGIT_DURATIONS_MS,
  prePostDurationsMs: PRE_POST_DURATIONS_MS,
  dCodeDelaySeconds: D_CODE_DELAYS_SECONDS,
  pttIdPauseSeconds: PTT_ID_PAUSE_SECONDS,
  autoResetSeconds: AUTO_RESET_SECONDS,
  twoToneDurationsMs: TWO_TONE_DURATIONS_MS,
  twoToneGapDurationsMs: TWO_TONE_GAP_DURATIONS_MS,
  fiveTonePauseDurationsMs: FIVE_TONE_PAUSE_DURATIONS_MS,
  dtmfMemoryLabels: DTMF_MEMORY_LABELS,
  twoToneEncoderLabels: TWO_TONE_ENCODER_LABELS,
  fiveToneEncoderLabels: FIVE_TONE_ENCODER_LABELS,
})

function decodeDtmfSettings(bytes: Uint8Array): DtmfSettings {
  assertBlock(bytes, DTMF_SETTINGS_OFFSET, DTMF_SETTINGS_SIZE, "DTMF")
  const offset = DTMF_SETTINGS_OFFSET

  return Object.freeze({
    ownId: decodeAscii(bytes, offset, 8),
    separator: decodeIndex(bytes[offset + 0x0a], DTMF_SYMBOLS),
    groupCallCode: decodeIndex(bytes[offset + 0x0b], DTMF_SYMBOLS),
    dialerType: decodeIndex(bytes[offset + 0x0c], DIALER_TYPES),
    transmitSidetone: decodeBoolean(bytes[offset + 0x14]),
    digitDurationMs: decodeIndex(bytes[offset + 0x15], DTMF_DIGIT_DURATIONS_MS),
    firstDigitDurationMs: decodeIndex(
      bytes[offset + 0x16],
      FIRST_DIGIT_DURATIONS_MS
    ),
    preCarrierMs: decodeIndex(bytes[offset + 0x17], PRE_POST_DURATIONS_MS),
    postTransmitDelayMs: decodeIndex(
      bytes[offset + 0x18],
      PRE_POST_DURATIONS_MS
    ),
    dCodeDelaySeconds: decodeIndex(bytes[offset + 0x19], D_CODE_DELAYS_SECONDS),
    pttIdPauseSeconds: decodeIndex(bytes[offset + 0x1a], PTT_ID_PAUSE_SECONDS),
    decodeResponse: decodeIndex(bytes[offset + 0x1e], RESPONSE_TYPES),
    autoResetSeconds: decodeIndex(bytes[offset + 0x1f], AUTO_RESET_SECONDS),
    aniDisplay: decodeIndex(bytes[offset + 0x20], ANI_DISPLAY_TYPES),
    killCode: decodeAscii(bytes, offset + 0x384, 24),
    stunCode: decodeAscii(bytes, offset + 0x39c, 24),
    wakeCode: decodeAscii(bytes, offset + 0x3b4, 24),
    encodeMemories: Object.freeze(
      Array.from({ length: 16 }, (_, index) =>
        decodeAscii(bytes, offset + 0x28 + index * 0x18, 24)
      )
    ),
    pttIds: Object.freeze(
      Array.from({ length: 8 }, (_, index) => {
        const recordOffset = offset + 0x1c2 + index * 0x31
        return Object.freeze({
          number: index,
          type: decodeIndex(bytes[recordOffset], PTT_ID_TYPES),
          start: decodeAscii(bytes, recordOffset + 1, 24),
          stop: decodeAscii(bytes, recordOffset + 25, 24),
        })
      })
    ),
  })
}

function editDtmfSettingsBytes(source: Uint8Array, patch: DtmfSettingsPatch) {
  assertBlock(source, DTMF_SETTINGS_OFFSET, DTMF_SETTINGS_SIZE, "DTMF")
  const bytes = source.slice()
  const offset = DTMF_SETTINGS_OFFSET
  const current = decodeDtmfSettings(source)

  if (patch.ownId !== undefined)
    writeCode(bytes, offset, 8, patch.ownId, "DTMF local ID", DTMF_PATTERN)
  if (patch.separator !== undefined)
    writeIndex(bytes, offset + 0x0a, DTMF_SYMBOLS, patch.separator, "separator")
  if (patch.groupCallCode !== undefined)
    writeIndex(
      bytes,
      offset + 0x0b,
      DTMF_SYMBOLS,
      patch.groupCallCode,
      "group-call code"
    )
  if (patch.dialerType !== undefined)
    writeIndex(bytes, offset + 0x0c, DIALER_TYPES, patch.dialerType, "dialer")
  if (patch.transmitSidetone !== undefined)
    writeBoolean(bytes, offset + 0x14, patch.transmitSidetone, "DTMF sidetone")
  if (patch.digitDurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x15,
      DTMF_DIGIT_DURATIONS_MS,
      patch.digitDurationMs,
      "DTMF digit duration"
    )
  if (patch.firstDigitDurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x16,
      FIRST_DIGIT_DURATIONS_MS,
      patch.firstDigitDurationMs,
      "DTMF first-digit duration"
    )
  if (patch.preCarrierMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x17,
      PRE_POST_DURATIONS_MS,
      patch.preCarrierMs,
      "DTMF pre-carrier time"
    )
  if (patch.postTransmitDelayMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x18,
      PRE_POST_DURATIONS_MS,
      patch.postTransmitDelayMs,
      "DTMF end delay"
    )
  if (patch.dCodeDelaySeconds !== undefined)
    writeIndex(
      bytes,
      offset + 0x19,
      D_CODE_DELAYS_SECONDS,
      patch.dCodeDelaySeconds,
      "DTMF D-code delay"
    )
  if (patch.pttIdPauseSeconds !== undefined)
    writeIndex(
      bytes,
      offset + 0x1a,
      PTT_ID_PAUSE_SECONDS,
      patch.pttIdPauseSeconds,
      "DTMF PTT ID pause"
    )
  if (patch.decodeResponse !== undefined)
    writeIndex(
      bytes,
      offset + 0x1e,
      RESPONSE_TYPES,
      patch.decodeResponse,
      "DTMF response"
    )
  if (patch.autoResetSeconds !== undefined)
    writeIndex(
      bytes,
      offset + 0x1f,
      AUTO_RESET_SECONDS,
      patch.autoResetSeconds,
      "DTMF auto reset"
    )
  if (patch.aniDisplay !== undefined)
    writeIndex(
      bytes,
      offset + 0x20,
      ANI_DISPLAY_TYPES,
      patch.aniDisplay,
      "DTMF ANI display"
    )
  if (patch.killCode !== undefined)
    writeCode(
      bytes,
      offset + 0x384,
      24,
      patch.killCode,
      "DTMF kill code",
      DTMF_PATTERN
    )
  if (patch.stunCode !== undefined)
    writeCode(
      bytes,
      offset + 0x39c,
      24,
      patch.stunCode,
      "DTMF stun code",
      DTMF_PATTERN
    )
  if (patch.wakeCode !== undefined)
    writeCode(
      bytes,
      offset + 0x3b4,
      24,
      patch.wakeCode,
      "DTMF wake code",
      DTMF_PATTERN
    )
  if (patch.encodeMemories !== undefined) {
    assertArrayLength(patch.encodeMemories, 16, "DTMF memory")
    patch.encodeMemories.forEach((code, index) => {
      if (code !== current.encodeMemories[index]) {
        writeCode(
          bytes,
          offset + 0x28 + index * 0x18,
          24,
          code,
          `DTMF memory ${DTMF_MEMORY_LABELS[index]}`,
          DTMF_PATTERN
        )
      }
    })
  }
  if (patch.pttIds !== undefined) {
    assertArrayLength(patch.pttIds, 8, "DTMF PTT ID")
    patch.pttIds.forEach((record, index) => {
      const recordOffset = offset + 0x1c2 + index * 0x31
      const previous = current.pttIds[index]
      if (!settingEqual(record.type, previous?.type))
        writeIndex(
          bytes,
          recordOffset,
          PTT_ID_TYPES,
          record.type,
          `DTMF PTT ID ${index} type`
        )
      if (record.start !== previous?.start)
        writeCode(
          bytes,
          recordOffset + 1,
          24,
          record.start,
          `DTMF PTT ID ${index} start`,
          DTMF_PATTERN
        )
      if (record.stop !== previous?.stop)
        writeCode(
          bytes,
          recordOffset + 25,
          24,
          record.stop,
          `DTMF PTT ID ${index} stop`,
          DTMF_PATTERN
        )
    })
  }

  return bytes
}

function decodeTwoToneSettings(bytes: Uint8Array): TwoToneSettings {
  assertBlock(bytes, TWO_TONE_SETTINGS_OFFSET, TWO_TONE_SETTINGS_SIZE, "2-Tone")
  const offset = TWO_TONE_SETTINGS_OFFSET

  return Object.freeze({
    transmitSidetone: decodeBoolean(bytes[offset]),
    autoResetSeconds: decodeIndex(bytes[offset + 1], AUTO_RESET_SECONDS),
    tone1DurationMs: decodeIndex(bytes[offset + 2], TWO_TONE_DURATIONS_MS),
    tone2DurationMs: decodeIndex(bytes[offset + 3], TWO_TONE_DURATIONS_MS),
    longToneDurationMs: decodeIndex(bytes[offset + 4], TWO_TONE_DURATIONS_MS),
    toneGapMs: decodeIndex(bytes[offset + 5], TWO_TONE_GAP_DURATIONS_MS),
    encodeRecords: Object.freeze(
      Array.from({ length: 16 }, (_, index) =>
        decodeTwoToneEncodeRecord(bytes, offset + 0x0a + index * 0x0c, index)
      )
    ),
    decodeRecords: Object.freeze(
      Array.from({ length: 16 }, (_, index) =>
        decodeTwoToneDecodeRecord(bytes, offset + 0x100 + index * 0x0e, index)
      )
    ),
  })
}

function editTwoToneSettingsBytes(
  source: Uint8Array,
  patch: TwoToneSettingsPatch
) {
  assertBlock(
    source,
    TWO_TONE_SETTINGS_OFFSET,
    TWO_TONE_SETTINGS_SIZE,
    "2-Tone"
  )
  const bytes = source.slice()
  const offset = TWO_TONE_SETTINGS_OFFSET
  const current = decodeTwoToneSettings(source)

  if (patch.transmitSidetone !== undefined)
    writeBoolean(bytes, offset, patch.transmitSidetone, "2-Tone sidetone")
  if (patch.autoResetSeconds !== undefined)
    writeIndex(
      bytes,
      offset + 1,
      AUTO_RESET_SECONDS,
      patch.autoResetSeconds,
      "2-Tone auto reset"
    )
  if (patch.tone1DurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 2,
      TWO_TONE_DURATIONS_MS,
      patch.tone1DurationMs,
      "2-Tone first-tone duration"
    )
  if (patch.tone2DurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 3,
      TWO_TONE_DURATIONS_MS,
      patch.tone2DurationMs,
      "2-Tone second-tone duration"
    )
  if (patch.longToneDurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 4,
      TWO_TONE_DURATIONS_MS,
      patch.longToneDurationMs,
      "2-Tone long-tone duration"
    )
  if (patch.toneGapMs !== undefined)
    writeIndex(
      bytes,
      offset + 5,
      TWO_TONE_GAP_DURATIONS_MS,
      patch.toneGapMs,
      "2-Tone gap duration"
    )
  if (patch.encodeRecords !== undefined) {
    assertArrayLength(patch.encodeRecords, 16, "2-Tone encoder")
    patch.encodeRecords.forEach((record, index) =>
      writeTwoToneEncodeRecord(
        bytes,
        offset + 0x0a + index * 0x0c,
        record,
        current.encodeRecords[index]
      )
    )
  }
  if (patch.decodeRecords !== undefined) {
    assertArrayLength(patch.decodeRecords, 16, "2-Tone decoder")
    patch.decodeRecords.forEach((record, index) =>
      writeTwoToneDecodeRecord(
        bytes,
        offset + 0x100 + index * 0x0e,
        record,
        current.decodeRecords[index]
      )
    )
  }

  return bytes
}

function decodeFiveToneSettings(bytes: Uint8Array): FiveToneSettings {
  assertBlock(
    bytes,
    FIVE_TONE_SETTINGS_OFFSET,
    FIVE_TONE_SETTINGS_SIZE,
    "5-Tone"
  )
  const offset = FIVE_TONE_SETTINGS_OFFSET

  return Object.freeze({
    ownId: decodeAscii(bytes, offset, 8),
    transmitSidetone: decodeBoolean(bytes[offset + 0x0a]),
    preCarrierMs: decodeIndex(bytes[offset + 0x0b], PRE_POST_DURATIONS_MS),
    postTransmitDelayMs: decodeIndex(
      bytes[offset + 0x0c],
      PRE_POST_DURATIONS_MS
    ),
    firstDigitDurationMs: decodeIndex(
      bytes[offset + 0x0d],
      PRE_POST_DURATIONS_MS
    ),
    pauseCode: decodeIndex(bytes[offset + 0x0e], FIVE_TONE_PAUSE_CODES),
    pauseDurationMs: decodeIndex(
      bytes[offset + 0x0f],
      FIVE_TONE_PAUSE_DURATIONS_MS
    ),
    firstToneAfterPauseMs: decodeIndex(
      bytes[offset + 0x10],
      PRE_POST_DURATIONS_MS
    ),
    pttIdPauseSeconds: decodeIndex(bytes[offset + 0x11], PTT_ID_PAUSE_SECONDS),
    decodeStandard: decodeIndex(bytes[offset + 0x1e], FIVE_TONE_STANDARDS),
    decodeDigitMask: bytes[offset + 0x1f],
    decodeResponse: decodeIndex(bytes[offset + 0x20], RESPONSE_TYPES),
    autoResetSeconds: decodeIndex(bytes[offset + 0x21], AUTO_RESET_SECONDS),
    aniDisplay: decodeIndex(bytes[offset + 0x22], ANI_DISPLAY_TYPES),
    encodeRecords: Object.freeze(
      Array.from({ length: 16 }, (_, index) => {
        const recordOffset = offset + 0x100 + index * 0x22
        return Object.freeze({
          number: index,
          label: FIVE_TONE_ENCODER_LABELS[index],
          standard: decodeIndex(bytes[recordOffset], FIVE_TONE_STANDARDS),
          code: decodeAscii(bytes, recordOffset + 1, 24),
          name: decodeAscii(bytes, recordOffset + 25, 9),
        })
      })
    ),
    pttIds: Object.freeze(
      Array.from({ length: 8 }, (_, index) => {
        const recordOffset = offset + 0x340 + index * 0x32
        return Object.freeze({
          number: index,
          type: decodeIndex(bytes[recordOffset], PTT_ID_TYPES),
          standard: decodeIndex(bytes[recordOffset + 1], FIVE_TONE_STANDARDS),
          start: decodeAscii(bytes, recordOffset + 2, 24),
          stop: decodeAscii(bytes, recordOffset + 26, 24),
        })
      })
    ),
    informationCodes: Object.freeze(
      Array.from({ length: 16 }, (_, index) => {
        const recordOffset = offset + 0x540 + index * 0x19
        return Object.freeze({
          number: index,
          function: decodeIndex(
            bytes[recordOffset],
            FIVE_TONE_INFORMATION_FUNCTIONS
          ),
          code: decodeAscii(bytes, recordOffset + 1, 24),
        })
      })
    ),
  })
}

function editFiveToneSettingsBytes(
  source: Uint8Array,
  patch: FiveToneSettingsPatch
) {
  assertBlock(
    source,
    FIVE_TONE_SETTINGS_OFFSET,
    FIVE_TONE_SETTINGS_SIZE,
    "5-Tone"
  )
  const bytes = source.slice()
  const offset = FIVE_TONE_SETTINGS_OFFSET
  const current = decodeFiveToneSettings(source)

  if (patch.ownId !== undefined)
    writeCode(
      bytes,
      offset,
      8,
      patch.ownId,
      "5-Tone local ID",
      FIVE_TONE_PATTERN
    )
  if (patch.transmitSidetone !== undefined)
    writeBoolean(
      bytes,
      offset + 0x0a,
      patch.transmitSidetone,
      "5-Tone sidetone"
    )
  if (patch.preCarrierMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x0b,
      PRE_POST_DURATIONS_MS,
      patch.preCarrierMs,
      "5-Tone pre-carrier time"
    )
  if (patch.postTransmitDelayMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x0c,
      PRE_POST_DURATIONS_MS,
      patch.postTransmitDelayMs,
      "5-Tone end delay"
    )
  if (patch.firstDigitDurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x0d,
      PRE_POST_DURATIONS_MS,
      patch.firstDigitDurationMs,
      "5-Tone first-digit duration"
    )
  if (patch.pauseCode !== undefined)
    writeIndex(
      bytes,
      offset + 0x0e,
      FIVE_TONE_PAUSE_CODES,
      patch.pauseCode,
      "5-Tone pause code"
    )
  if (patch.pauseDurationMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x0f,
      FIVE_TONE_PAUSE_DURATIONS_MS,
      patch.pauseDurationMs,
      "5-Tone pause duration"
    )
  if (patch.firstToneAfterPauseMs !== undefined)
    writeIndex(
      bytes,
      offset + 0x10,
      PRE_POST_DURATIONS_MS,
      patch.firstToneAfterPauseMs,
      "5-Tone first tone after pause"
    )
  if (patch.pttIdPauseSeconds !== undefined)
    writeIndex(
      bytes,
      offset + 0x11,
      PTT_ID_PAUSE_SECONDS,
      patch.pttIdPauseSeconds,
      "5-Tone PTT ID pause"
    )
  if (patch.decodeStandard !== undefined)
    writeIndex(
      bytes,
      offset + 0x1e,
      FIVE_TONE_STANDARDS,
      patch.decodeStandard,
      "5-Tone decode standard"
    )
  if (patch.decodeDigitMask !== undefined) {
    assertByte(patch.decodeDigitMask, "5-Tone decode-digit mask")
    bytes[offset + 0x1f] = patch.decodeDigitMask
  }
  if (patch.decodeResponse !== undefined)
    writeIndex(
      bytes,
      offset + 0x20,
      RESPONSE_TYPES,
      patch.decodeResponse,
      "5-Tone response"
    )
  if (patch.autoResetSeconds !== undefined)
    writeIndex(
      bytes,
      offset + 0x21,
      AUTO_RESET_SECONDS,
      patch.autoResetSeconds,
      "5-Tone auto reset"
    )
  if (patch.aniDisplay !== undefined)
    writeIndex(
      bytes,
      offset + 0x22,
      ANI_DISPLAY_TYPES,
      patch.aniDisplay,
      "5-Tone ANI display"
    )
  if (patch.encodeRecords !== undefined) {
    assertArrayLength(patch.encodeRecords, 16, "5-Tone encoder")
    patch.encodeRecords.forEach((record, index) => {
      const recordOffset = offset + 0x100 + index * 0x22
      const previous = current.encodeRecords[index]
      if (!settingEqual(record.standard, previous?.standard))
        writeIndex(
          bytes,
          recordOffset,
          FIVE_TONE_STANDARDS,
          record.standard,
          `5-Tone encoder ${index} standard`
        )
      if (record.code !== previous?.code)
        writeCode(
          bytes,
          recordOffset + 1,
          24,
          record.code,
          `5-Tone encoder ${index} code`,
          FIVE_TONE_PATTERN
        )
      if (record.name !== previous?.name)
        writeAscii(bytes, recordOffset + 25, 9, record.name, 8, "5-Tone name")
    })
  }
  if (patch.pttIds !== undefined) {
    assertArrayLength(patch.pttIds, 8, "5-Tone PTT ID")
    patch.pttIds.forEach((record, index) => {
      const recordOffset = offset + 0x340 + index * 0x32
      const previous = current.pttIds[index]
      if (!settingEqual(record.type, previous?.type))
        writeIndex(
          bytes,
          recordOffset,
          PTT_ID_TYPES,
          record.type,
          `5-Tone PTT ID ${index} type`
        )
      if (!settingEqual(record.standard, previous?.standard))
        writeIndex(
          bytes,
          recordOffset + 1,
          FIVE_TONE_STANDARDS,
          record.standard,
          `5-Tone PTT ID ${index} standard`
        )
      if (record.start !== previous?.start)
        writeCode(
          bytes,
          recordOffset + 2,
          24,
          record.start,
          `5-Tone PTT ID ${index} start`,
          FIVE_TONE_PATTERN
        )
      if (record.stop !== previous?.stop)
        writeCode(
          bytes,
          recordOffset + 26,
          24,
          record.stop,
          `5-Tone PTT ID ${index} stop`,
          FIVE_TONE_PATTERN
        )
    })
  }
  if (patch.informationCodes !== undefined) {
    assertArrayLength(patch.informationCodes, 16, "5-Tone information code")
    patch.informationCodes.forEach((record, index) => {
      const recordOffset = offset + 0x540 + index * 0x19
      const previous = current.informationCodes[index]
      if (!settingEqual(record.function, previous?.function))
        writeIndex(
          bytes,
          recordOffset,
          FIVE_TONE_INFORMATION_FUNCTIONS,
          record.function,
          `5-Tone information code ${index} function`
        )
      if (record.code !== previous?.code)
        writeCode(
          bytes,
          recordOffset + 1,
          24,
          record.code,
          `5-Tone information code ${index}`,
          FIVE_TONE_PATTERN
        )
    })
  }

  return bytes
}

function decodeTwoToneEncodeRecord(
  bytes: Uint8Array,
  offset: number,
  index: number
): TwoToneEncodeRecord {
  return Object.freeze({
    number: index,
    label: TWO_TONE_ENCODER_LABELS[index],
    tone1Hz: decodeToneFrequency(bytes, offset),
    tone2Hz: decodeToneFrequency(bytes, offset + 2),
    name: decodeAscii(bytes, offset + 4, 8),
  })
}

function decodeTwoToneDecodeRecord(
  bytes: Uint8Array,
  offset: number,
  index: number
): TwoToneDecodeRecord {
  return Object.freeze({
    number: index,
    tone1Hz: decodeToneFrequency(bytes, offset),
    tone2Hz: decodeToneFrequency(bytes, offset + 2),
    response: decodeIndex(bytes[offset + 4], RESPONSE_TYPES),
    name: decodeAscii(bytes, offset + 5, 8),
  })
}

function writeTwoToneEncodeRecord(
  bytes: Uint8Array,
  offset: number,
  record: TwoToneEncodeRecord,
  previous: TwoToneEncodeRecord | undefined
) {
  if (record.tone1Hz !== previous?.tone1Hz)
    writeToneFrequency(bytes, offset, record.tone1Hz, "2-Tone encoder Tone 1")
  if (record.tone2Hz !== previous?.tone2Hz)
    writeToneFrequency(
      bytes,
      offset + 2,
      record.tone2Hz,
      "2-Tone encoder Tone 2"
    )
  if (record.name !== previous?.name)
    writeAscii(bytes, offset + 4, 8, record.name, 8, "2-Tone encoder name")
}

function writeTwoToneDecodeRecord(
  bytes: Uint8Array,
  offset: number,
  record: TwoToneDecodeRecord,
  previous: TwoToneDecodeRecord | undefined
) {
  if (record.tone1Hz !== previous?.tone1Hz)
    writeToneFrequency(bytes, offset, record.tone1Hz, "2-Tone decoder Tone 1")
  if (record.tone2Hz !== previous?.tone2Hz)
    writeToneFrequency(
      bytes,
      offset + 2,
      record.tone2Hz,
      "2-Tone decoder Tone 2"
    )
  if (!settingEqual(record.response, previous?.response))
    writeIndex(
      bytes,
      offset + 4,
      RESPONSE_TYPES,
      record.response,
      "2-Tone decoder response"
    )
  if (record.name !== previous?.name)
    writeAscii(bytes, offset + 5, 8, record.name, 8, "2-Tone decoder name")
}

function decodeToneFrequency(bytes: Uint8Array, offset: number) {
  const raw = new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    2
  ).getUint16(0, true)
  return raw === 0xffff ? null : raw / 10
}

function writeToneFrequency(
  bytes: Uint8Array,
  offset: number,
  value: number | null,
  label: string
) {
  if (value === null) {
    new DataView(bytes.buffer, bytes.byteOffset + offset, 2).setUint16(
      0,
      0xffff,
      true
    )
    return
  }
  if (
    !Number.isFinite(value) ||
    value < 288 ||
    value > 3106 ||
    Math.round(value * 10) !== value * 10
  ) {
    throw new RangeError(`${label} must be between 288.0 and 3106.0 Hz`)
  }
  new DataView(bytes.buffer, bytes.byteOffset + offset, 2).setUint16(
    0,
    Math.round(value * 10),
    true
  )
}

const DTMF_PATTERN = /^[0-9A-D*#]*$/
const FIVE_TONE_PATTERN = /^[0-9A-F*#]*$/
const asciiEncoder = new TextEncoder()
const asciiDecoder = new TextDecoder("ascii")

function decodeAscii(bytes: Uint8Array, offset: number, length: number) {
  const slice = bytes.subarray(offset, offset + length)
  const end = slice.findIndex((byte) => byte === 0 || byte === 0xff)
  return asciiDecoder.decode(end === -1 ? slice : slice.subarray(0, end))
}

function writeCode(
  bytes: Uint8Array,
  offset: number,
  length: number,
  value: string,
  label: string,
  pattern: RegExp
) {
  if (!pattern.test(value) || value.length > length) {
    throw new RangeError(
      `${label} must contain at most ${length} valid symbols`
    )
  }
  writeAscii(bytes, offset, length, value, length, label)
}

function writeAscii(
  bytes: Uint8Array,
  offset: number,
  storageLength: number,
  value: string,
  maxLength: number,
  label: string
) {
  const encoded = asciiEncoder.encode(value)
  if (value.length > maxLength || encoded.length !== value.length) {
    throw new RangeError(
      `${label} must contain at most ${maxLength} ASCII characters`
    )
  }
  bytes.fill(0, offset, offset + storageLength)
  bytes.set(encoded, offset)
}

function decodeBoolean(raw: number): SettingValue<boolean> {
  return raw === 0 ? false : raw === 1 ? true : unknownValue(raw)
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? unknownValue(raw)
}

function writeBoolean(
  bytes: Uint8Array,
  offset: number,
  value: SettingValue<boolean>,
  label: string
) {
  if (isUnknown(value)) {
    assertByte(value.raw, label)
    bytes[offset] = value.raw
    return
  }
  if (typeof value !== "boolean")
    throw new RangeError(`${label} must be boolean`)
  bytes[offset] = value ? 1 : 0
}

function writeIndex(
  bytes: Uint8Array,
  offset: number,
  values: readonly unknown[],
  value: unknown,
  label: string
) {
  if (isUnknown(value)) {
    assertByte(value.raw, label)
    bytes[offset] = value.raw
    return
  }
  const index = values.indexOf(value)
  if (index === -1) throw new RangeError(`Unsupported ${label}`)
  bytes[offset] = index
}

function isUnknown(value: unknown): value is UnknownSettingValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "unknown" &&
    "raw" in value &&
    typeof value.raw === "number"
  )
}

function settingEqual(left: unknown, right: unknown) {
  if (isUnknown(left) && isUnknown(right)) return left.raw === right.raw
  return Object.is(left, right)
}

function unknownValue(raw: number): UnknownSettingValue {
  return Object.freeze({ kind: "unknown", raw })
}

function assertBlock(
  bytes: Uint8Array,
  offset: number,
  size: number,
  label: string
) {
  if (bytes.byteLength < offset + size) {
    throw new RangeError(`${label} settings block is incomplete`)
  }
}

function assertArrayLength(
  values: readonly unknown[],
  expected: number,
  label: string
) {
  if (values.length !== expected) {
    throw new RangeError(
      `${label} list must contain exactly ${expected} records`
    )
  }
}

function assertByte(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${label} must fit in one byte`)
  }
}

function range(start: number, end: number, step: number) {
  return Object.freeze(
    Array.from(
      { length: Math.floor((end - start) / step) + 1 },
      (_, index) => start + index * step
    )
  )
}

export {
  DTMF_SETTINGS_ADDRESS,
  DTMF_SETTINGS_OFFSET,
  FIVE_TONE_SETTINGS_ADDRESS,
  FIVE_TONE_SETTINGS_OFFSET,
  SIGNAL_SYSTEM_OPTIONS,
  TWO_TONE_SETTINGS_ADDRESS,
  TWO_TONE_SETTINGS_OFFSET,
  decodeDtmfSettings,
  decodeFiveToneSettings,
  decodeTwoToneSettings,
  editDtmfSettingsBytes,
  editFiveToneSettingsBytes,
  editTwoToneSettingsBytes,
}
export type {
  AniDisplayType,
  DialerType,
  DtmfPttId,
  DtmfSettings,
  DtmfSettingsPatch,
  DtmfSymbol,
  FiveToneEncodeRecord,
  FiveToneInformationCode,
  FiveToneInformationFunction,
  FiveTonePauseCode,
  FiveTonePttId,
  FiveToneSettings,
  FiveToneSettingsPatch,
  FiveToneStandard,
  PttIdType,
  ResponseType,
  TwoToneDecodeRecord,
  TwoToneEncodeRecord,
  TwoToneSettings,
  TwoToneSettingsPatch,
}
