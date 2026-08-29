import assert from "node:assert/strict"
import test from "node:test"

import { formatPercent } from "../lib/format-percent.ts"

test("formats progress as a bounded percentage with exactly two decimals", () => {
  assert.equal(formatPercent(0), "0.00%")
  assert.equal(formatPercent(7), "7.00%")
  assert.equal(formatPercent(42.345), "42.34%")
  assert.equal(formatPercent(100), "100.00%")
  assert.equal(formatPercent(-1), "0.00%")
  assert.equal(formatPercent(101), "100.00%")
  assert.equal(formatPercent(Number.NaN), "0.00%")
})
