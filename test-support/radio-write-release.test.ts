import assert from "node:assert/strict"
import test from "node:test"

import { isRadioWriteReleased } from "../modules/cps-workspace/radio-write-release.ts"

test("releases Radio Write by default with an emergency disable policy", () => {
  assert.equal(isRadioWriteReleased({ emergencyDisabled: false }), true)
  assert.equal(isRadioWriteReleased({ emergencyDisabled: true }), false)
})
