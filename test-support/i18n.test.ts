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
      spectrum: tr.navSpectrum,
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
      scanFlag: "Tarama Flag",
      scanLists: "Tarama Listeleri",
      spectrum: "Spektrum",
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

test("keeps Radio Write development notes out of operator copy", () => {
  const operatorCopy = [
    en.radioWriteUnavailable,
    en.radioWriteUnavailableTitle,
    en.radioWriteUnavailableDescription,
    tr.radioWriteUnavailable,
    tr.radioWriteUnavailableTitle,
    tr.radioWriteUnavailableDescription,
  ].join(" ")

  assert.doesNotMatch(
    operatorCopy,
    /canary|kanarya|physical validation|fiziksel doğrulama|release gate|step 6|3\.07\.23/i
  )
})

test("describes no-op restore results for files and Backup History", () => {
  assert.equal(
    en.cpsFileAlreadyCurrentTitle,
    "Radio already matches the saved Codeplug"
  )
  assert.equal(
    en.cpsFileAlreadyCurrentDescription,
    "The fresh Radio Read and restore target are identical. No Radio Write is needed."
  )
  assert.equal(
    tr.cpsFileAlreadyCurrentTitle,
    "Telsiz kayıtlı Codeplug ile zaten aynı"
  )
  assert.equal(
    tr.cpsFileAlreadyCurrentDescription,
    "Yeni Telsizden Okuma ile geri yükleme hedefi tamamen aynı. Telsize Yazma gerekmiyor."
  )
})
