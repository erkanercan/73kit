import assert from "node:assert/strict"
import test from "node:test"

import {
  createDtmfPreview,
  createFiveTonePreview,
  createTwoTonePreview,
} from "../modules/tone-preview.ts"

test("DTMF preview creates the standard dual-frequency pairs", () => {
  assert.deepEqual(
    createDtmfPreview({
      code: "1D#",
      digitDurationMs: 100,
      firstDigitDurationMs: 200,
      dCodeDelaySeconds: null,
    }),
    [
      { frequenciesHz: [697, 1209], durationMs: 200 },
      { frequenciesHz: [941, 1633], durationMs: 100 },
      { frequenciesHz: [941, 1477], durationMs: 100 },
    ]
  )
})

test("DTMF preview applies the configured D-code silence", () => {
  assert.deepEqual(
    createDtmfPreview({
      code: "2D3",
      digitDurationMs: 75,
      firstDigitDurationMs: 0,
      dCodeDelaySeconds: 2,
    }),
    [
      { frequenciesHz: [697, 1336], durationMs: 75 },
      { frequenciesHz: [], durationMs: 2000 },
      { frequenciesHz: [697, 1477], durationMs: 75 },
    ]
  )
})

test("2-Tone preview supports two-tone and single-long-tone sequences", () => {
  assert.deepEqual(
    createTwoTonePreview({
      tone1Hz: 600,
      tone2Hz: 900,
      tone1DurationMs: 1000,
      tone2DurationMs: 1500,
      longToneDurationMs: 3000,
      toneGapMs: 200,
    }),
    [
      { frequenciesHz: [600], durationMs: 1000 },
      { frequenciesHz: [], durationMs: 200 },
      { frequenciesHz: [900], durationMs: 1500 },
    ]
  )
  assert.deepEqual(
    createTwoTonePreview({
      tone1Hz: null,
      tone2Hz: 900,
      tone1DurationMs: 1000,
      tone2DurationMs: 1500,
      longToneDurationMs: 3000,
      toneGapMs: 200,
    }),
    [{ frequenciesHz: [900], durationMs: 3000 }]
  )
})

test("5-Tone preview uses standard timings, repeat tones, keypad aliases, and pauses", () => {
  assert.deepEqual(
    createFiveTonePreview({
      standard: "ZVEI1",
      code: "11*#2",
      firstDigitDurationMs: 200,
      pauseCode: "F",
      pauseDurationMs: 500,
      firstToneAfterPauseMs: 150,
    }),
    [
      { frequenciesHz: [1060], durationMs: 200 },
      { frequenciesHz: [2600], durationMs: 70 },
      { frequenciesHz: [2600], durationMs: 70 },
      { frequenciesHz: [], durationMs: 500 },
      { frequenciesHz: [1160], durationMs: 150 },
    ]
  )
})

test("5-Tone preview exposes distinct frequency plans", () => {
  assert.deepEqual(
    createFiveTonePreview({
      standard: "CCITT",
      code: "09A",
      firstDigitDurationMs: 0,
      pauseCode: "none",
      pauseDurationMs: 0,
      firstToneAfterPauseMs: 0,
    }),
    [
      { frequenciesHz: [400], durationMs: 100 },
      { frequenciesHz: [1800], durationMs: 100 },
      { frequenciesHz: [1900], durationMs: 100 },
    ]
  )
  assert.deepEqual(
    createFiveTonePreview({
      standard: "MODAT",
      code: "09E",
      firstDigitDurationMs: 0,
      pauseCode: "none",
      pauseDurationMs: 0,
      firstToneAfterPauseMs: 0,
    }),
    [
      { frequenciesHz: [637.5], durationMs: 40 },
      { frequenciesHz: [1987.5], durationMs: 40 },
      { frequenciesHz: [487.5], durationMs: 40 },
    ]
  )
})
