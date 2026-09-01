import assert from "node:assert/strict"
import test from "node:test"

import {
  evaluateFirmwareSupport,
  findRadioModel,
  listRadioModels,
  radioCpsPath,
} from "../modules/radio-support/index.ts"

test("registers UVL-15W and its Tekser alias as one Radio Model", () => {
  const radios = listRadioModels()

  assert.equal(radios.length, 1)
  assert.equal(radios[0]?.id, "tyt-uvl15w")
  assert.deepEqual(radios[0]?.aliases, ["Tekser TR-UV15"])
  assert.equal(findRadioModel("tekser-tr-uv15"), undefined)
})

test("resolves exact validated firmware without accepting newer versions", () => {
  assert.deepEqual(evaluateFirmwareSupport("tyt-uvl15w", "V3.07.23"), {
    id: "tyt-uvl15w-3.07.23",
    version: "3.07.23",
    status: "validated",
    codeplugLayoutId: "uvl15w-3.07.23",
  })
  assert.deepEqual(evaluateFirmwareSupport("tyt-uvl15w", "3.08.00"), {
    id: "tyt-uvl15w-3.08.00",
    version: "3.08.00",
    status: "not-validated",
    codeplugLayoutId: null,
  })
})

test("builds every CPS destination below the dynamic Radio Model route", () => {
  assert.equal(radioCpsPath("tyt-uvl15w"), "/cps/tyt-uvl15w")
  assert.equal(
    radioCpsPath("tyt-uvl15w", "/channels/"),
    "/cps/tyt-uvl15w/channels"
  )
})
