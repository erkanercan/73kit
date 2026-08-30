import type { FiveToneStandard } from "./codeplug/signal-system.ts"

interface ToneSegment {
  readonly frequenciesHz: readonly number[]
  readonly durationMs: number
}

const DTMF_FREQUENCIES = Object.freeze({
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  A: [697, 1633],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  B: [770, 1633],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  C: [852, 1633],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
  D: [941, 1633],
} satisfies Readonly<Record<string, readonly [number, number]>>)

const FIVE_TONE_FREQUENCIES = Object.freeze({
  ZVEI1: [
    2400, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 2200, 2800, 810, 970,
    885, 2600, 680,
  ],
  ZVEI2: [
    2400, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 2200, 885, 810, 740,
    680, 970, 2600,
  ],
  ZVEI3: [
    2200, 970, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 885, 810, 2800,
    680, 2400, 2600,
  ],
  PZVEI: [
    2400, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 2200, 970, 810, 2800,
    885, 2600, 680,
  ],
  DZVEI: [
    2200, 970, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 825, 740, 2600,
    885, 2400, 680,
  ],
  PDZVEI: [
    2200, 970, 1060, 1160, 1270, 1400, 1530, 1670, 1830, 2000, 825, 886, 2600,
    856, 2400, 0,
  ],
  CCIR1: [
    1981, 1124, 1197, 1275, 1358, 1446, 1540, 1640, 1747, 1860, 2400, 930, 2247,
    991, 2110, 1055,
  ],
  CCIR2: [
    1981, 1124, 1197, 1275, 1358, 1446, 1540, 1640, 1747, 1860, 2400, 930, 2247,
    991, 2110, 1055,
  ],
  PCCIR: [
    1981, 1124, 1197, 1275, 1358, 1446, 1540, 1640, 1747, 1860, 1050, 930, 2400,
    991, 2110, 0,
  ],
  EEA: [
    1981, 1124, 1197, 1275, 1358, 1446, 1540, 1640, 1747, 1860, 1050, 930, 2400,
    991, 2110, 2247,
  ],
  "EURO SIGNAL": [
    979.8, 903.1, 832.5, 767.4, 707.4, 652, 601, 554, 510.7, 470.8, 433.9, 400,
    368.7, 1153.1, 1062.9, 0,
  ],
  NATEL: [
    1633, 631, 697, 770, 852, 941, 1040, 1209, 1336, 1477, 1995, 571, 2205,
    2437, 1805, 2694,
  ],
  MODAT: [
    637.5, 787.5, 937.5, 1087.5, 1237.5, 1387.5, 1537.5, 1687.5, 1837.5, 1987.5,
    0, 0, 0, 0, 487.5, 0,
  ],
  CCITT: [
    400, 697, 770, 852, 941, 1209, 1335, 1477, 1633, 1800, 1900, 2000, 2100,
    2200, 2300, 0,
  ],
  EIA: [
    600, 741, 882, 1023, 1164, 1305, 1446, 1587, 1728, 1869, 2151, 2433, 2010,
    2292, 459, 1091,
  ],
} satisfies Readonly<Record<FiveToneStandard, readonly number[]>>)

const FIVE_TONE_DURATIONS_MS = Object.freeze({
  ZVEI1: 70,
  ZVEI2: 70,
  ZVEI3: 70,
  PZVEI: 70,
  DZVEI: 70,
  PDZVEI: 70,
  CCIR1: 100,
  CCIR2: 70,
  PCCIR: 100,
  EEA: 40,
  "EURO SIGNAL": 100,
  NATEL: 70,
  MODAT: 40,
  CCITT: 100,
  EIA: 33,
} satisfies Readonly<Record<FiveToneStandard, number>>)

const FIVE_TONE_SYMBOLS = "0123456789ABCDEF"

function createDtmfPreview({
  code,
  digitDurationMs,
  firstDigitDurationMs,
  dCodeDelaySeconds,
}: {
  code: string
  digitDurationMs: number
  firstDigitDurationMs: number
  dCodeDelaySeconds: number | null
}): readonly ToneSegment[] {
  return Object.freeze(
    [...code.toUpperCase()].flatMap((symbol, index) => {
      const durationMs =
        index === 0 && firstDigitDurationMs > 0
          ? firstDigitDurationMs
          : digitDurationMs
      if (symbol === "D" && dCodeDelaySeconds !== null) {
        return [silence(dCodeDelaySeconds * 1000)]
      }
      const frequenciesHz =
        DTMF_FREQUENCIES[symbol as keyof typeof DTMF_FREQUENCIES]
      return frequenciesHz ? [tone(frequenciesHz, durationMs)] : []
    })
  )
}

function createTwoTonePreview({
  tone1Hz,
  tone2Hz,
  tone1DurationMs,
  tone2DurationMs,
  longToneDurationMs,
  toneGapMs,
}: {
  tone1Hz: number | null
  tone2Hz: number | null
  tone1DurationMs: number
  tone2DurationMs: number
  longToneDurationMs: number
  toneGapMs: number
}): readonly ToneSegment[] {
  const frequencies = [tone1Hz, tone2Hz].filter(
    (frequency): frequency is number => frequency !== null
  )
  if (frequencies.length === 0) return Object.freeze([])
  if (frequencies.length === 1) {
    return Object.freeze([tone([frequencies[0]], longToneDurationMs)])
  }
  return Object.freeze([
    tone([frequencies[0]], tone1DurationMs),
    ...(toneGapMs > 0 ? [silence(toneGapMs)] : []),
    tone([frequencies[1]], tone2DurationMs),
  ])
}

function createFiveTonePreview({
  standard,
  code,
  firstDigitDurationMs,
  pauseCode,
  pauseDurationMs,
  firstToneAfterPauseMs,
}: {
  standard: FiveToneStandard
  code: string
  firstDigitDurationMs: number
  pauseCode: "none" | "B" | "C" | "D" | "F"
  pauseDurationMs: number
  firstToneAfterPauseMs: number
}): readonly ToneSegment[] {
  const frequencies = FIVE_TONE_FREQUENCIES[standard]
  const normalDurationMs = FIVE_TONE_DURATIONS_MS[standard]
  const symbols = [...code.toUpperCase()].map(normalizeFiveToneSymbol)
  let followsPause = false

  return Object.freeze(
    symbols.flatMap((symbol, index) => {
      if (!symbol) return []
      if (pauseCode !== "none" && symbol === pauseCode) {
        followsPause = true
        return [silence(pauseDurationMs)]
      }

      const transmittedSymbol =
        index > 0 && symbols[index - 1] === symbol ? "E" : symbol
      const frequencyHz =
        frequencies[FIVE_TONE_SYMBOLS.indexOf(transmittedSymbol)]
      if (!frequencyHz) return []
      const durationMs =
        index === 0 && firstDigitDurationMs > 0
          ? firstDigitDurationMs
          : followsPause && firstToneAfterPauseMs > 0
            ? firstToneAfterPauseMs
            : normalDurationMs
      followsPause = false
      return [tone([frequencyHz], durationMs)]
    })
  )
}

function normalizeFiveToneSymbol(symbol: string) {
  if (symbol === "*") return "E"
  if (symbol === "#") return "F"
  return FIVE_TONE_SYMBOLS.includes(symbol) ? symbol : null
}

function tone(frequenciesHz: readonly number[], durationMs: number) {
  return Object.freeze({
    frequenciesHz: Object.freeze([...frequenciesHz]),
    durationMs,
  })
}

function silence(durationMs: number) {
  return tone([], durationMs)
}

export {
  FIVE_TONE_DURATIONS_MS,
  FIVE_TONE_FREQUENCIES,
  createDtmfPreview,
  createFiveTonePreview,
  createTwoTonePreview,
}
export type { ToneSegment }
