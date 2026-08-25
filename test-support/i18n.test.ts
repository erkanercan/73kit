import assert from "node:assert/strict"
import test from "node:test"

import en from "../dictionaries/en.ts"
import tr from "../dictionaries/tr.ts"
import { isLocale, routing } from "../i18n/routing.ts"

test("recognizes only supported locales", () => {
  assert.equal(isLocale("tr"), true)
  assert.equal(isLocale("en"), true)
  assert.equal(isLocale("de"), false)
})

test("uses Turkish as the default locale and prefixes every locale", () => {
  assert.equal(routing.defaultLocale, "tr")
  assert.equal(routing.localePrefix, "always")
})

test("keeps approved radio terminology in Turkish", () => {
  assert.deepEqual(
    {
      fmNarrow: tr.valueFmNarrow,
      amNarrow: tr.valueAmNarrow,
      txTone: tr.txTone,
      rxTone: tr.rxTone,
      scanFlag: tr.scanFlag,
      scanLists: tr.navScanLists,
      bclo: tr.busyChannelLockout,
      split: tr.valueSplit,
      mediumPower: tr.valueMedium,
      squelchTone: tr.valueTone,
      twoTone: tr.valueTwoTone,
      aprsMuted: tr.valueOnMuted,
      pttId: tr.pttId,
    },
    {
      fmNarrow: "FM-N",
      amNarrow: "AM-N",
      txTone: "TX Tonu",
      rxTone: "RX Tonu",
      scanFlag: "Scan Flag",
      scanLists: "Scan Listeleri",
      bclo: "BCLO",
      split: "Split",
      mediumPower: "Orta",
      squelchTone: "CTCSS/DCS Tonu",
      twoTone: "2-Tone",
      aprsMuted: "Açık (Sessiz)",
      pttId: "PTT ID",
    }
  )
  assert.deepEqual(Object.keys(tr), Object.keys(en))
})
