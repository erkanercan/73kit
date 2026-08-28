import assert from "node:assert/strict"
import test from "node:test"

import {
  getNavigationItemState,
  getUpdateReadiness,
  getUpdateStepState,
} from "../modules/update-presentation/index.ts"

test("distinguishes locked navigation from unreleased menu items", () => {
  assert.equal(
    getNavigationItemState({ planned: false, disabled: false }),
    "available"
  )
  assert.equal(
    getNavigationItemState({ planned: true, disabled: false }),
    "planned"
  )
  assert.equal(
    getNavigationItemState({ planned: false, disabled: true }),
    "locked"
  )
})

test("shows completed, current, and upcoming update steps", () => {
  assert.deepEqual(
    [1, 2, 3].map((step) => getUpdateStepState("transferring", step)),
    ["complete", "active", "upcoming"]
  )
  assert.deepEqual(
    [1, 2, 3].map((step) => getUpdateStepState("complete", step)),
    ["complete", "complete", "complete"]
  )
  assert.deepEqual(
    [1, 2, 3].map((step) => getUpdateStepState("outcome-unknown", step)),
    ["complete", "complete", "active"]
  )
})

test("prevents starting until the browser and preparation are ready", () => {
  assert.deepEqual(getUpdateReadiness("checking", true), {
    state: "checking",
    canStart: false,
  })
  assert.deepEqual(getUpdateReadiness("unsupported", true), {
    state: "unsupported",
    canStart: false,
  })
  assert.deepEqual(getUpdateReadiness("available", false), {
    state: "available",
    canStart: false,
  })
  assert.deepEqual(getUpdateReadiness("available", true), {
    state: "available",
    canStart: true,
  })
})
