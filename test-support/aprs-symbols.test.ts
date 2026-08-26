import assert from "node:assert/strict"
import test from "node:test"

import {
  APRS_SYMBOL_CODES,
  aprsSymbolCode,
  aprsSymbolSpritePosition,
} from "../modules/codeplug/index.ts"

test("maps all radio symbol indexes to APRS table codes", () => {
  assert.equal(APRS_SYMBOL_CODES.length, 94)
  assert.equal(aprsSymbolCode("primary", 0), "/!")
  assert.equal(aprsSymbolCode("primary", 93), "/~")
  assert.equal(aprsSymbolCode("secondary", 0), "\\!")
  assert.equal(aprsSymbolCode("secondary", 93), "\\~")
})

test("maps radio symbol indexes to the 16 by 6 sprite grid", () => {
  assert.deepEqual(aprsSymbolSpritePosition(0), { column: 0, row: 0 })
  assert.deepEqual(aprsSymbolSpritePosition(15), { column: 15, row: 0 })
  assert.deepEqual(aprsSymbolSpritePosition(16), { column: 0, row: 1 })
  assert.deepEqual(aprsSymbolSpritePosition(93), { column: 13, row: 5 })
})

test("rejects indexes outside the radio symbol range", () => {
  assert.throws(() => aprsSymbolCode("primary", -1), RangeError)
  assert.throws(() => aprsSymbolSpritePosition(94), RangeError)
})
