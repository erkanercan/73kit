import assert from "node:assert/strict"
import test from "node:test"

import { canEnableRadioWriteCanary } from "../modules/cps-workspace/radio-write-canary.ts"

test("enables Radio Write only for an explicit local development canary", () => {
  assert.equal(
    canEnableRadioWriteCanary({ development: true, requested: true }),
    true
  )
  assert.equal(
    canEnableRadioWriteCanary({ development: true, requested: false }),
    false
  )
  assert.equal(
    canEnableRadioWriteCanary({ development: false, requested: true }),
    false
  )
})
