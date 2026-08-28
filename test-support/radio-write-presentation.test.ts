import assert from "node:assert/strict"
import test from "node:test"

import {
  radioWritePresentation,
  RADIO_WRITE_STAGES,
} from "../modules/cps-workspace/radio-write-presentation.ts"

test("maps every Radio Write lifecycle phase to a visible desktop stage", () => {
  assert.equal(radioWritePresentation("checking-radio", 0).activeStage, 0)
  assert.equal(radioWritePresentation("review-required", 0).activeStage, 0)
  assert.equal(radioWritePresentation("writing", 51_200).activeStage, 1)
  assert.equal(radioWritePresentation("completed", 102_400).activeStage, 2)
  assert.equal(
    radioWritePresentation("write-outcome-unknown", 0).activeStage,
    2
  )
  assert.equal(RADIO_WRITE_STAGES.length, 3)
})

test("marks only post-boundary phases as destructive and reports block progress", () => {
  assert.equal(radioWritePresentation("review-required", 0).destructive, false)
  assert.equal(
    radioWritePresentation("writing-before-first-block", 0).destructive,
    false
  )
  assert.equal(radioWritePresentation("writing", 51_200).destructive, true)
  assert.equal(radioWritePresentation("completed", 102_400).destructive, false)
  assert.equal(
    radioWritePresentation("write-outcome-unknown", 0).destructive,
    false
  )
  assert.deepEqual(radioWritePresentation("writing", 51_200).progress, {
    percent: 50,
    completedBlocks: 100,
    totalBlocks: 200,
  })
})
