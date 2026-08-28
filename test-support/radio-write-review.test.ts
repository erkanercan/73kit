import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import { createRadioWriteReview } from "../modules/cps-workspace/radio-write-review.ts"

test("presents semantic before and after values for a Change Set", () => {
  const baseline = createCodeplug(new Uint8Array(CODEPLUG_SIZE))
  const working = baseline.editDisplaySettings({ showBootImage: true })

  assert.deepEqual(
    createRadioWriteReview(baseline, working, [
      { kind: "edit-display-setting", field: "showBootImage" },
    ]),
    [
      {
        id: "edit-display-setting:showBootImage",
        subject: "Display settings",
        field: "Show boot image",
        before: false,
        after: true,
      },
    ]
  )
})

test("discloses write-image normalization as semantic review items", () => {
  const codeplug = createCodeplug(new Uint8Array(CODEPLUG_SIZE))

  assert.deepEqual(
    createRadioWriteReview(
      codeplug,
      codeplug,
      [],
      ["mirror-vfo-temporary-channels", "restore-fixed-weather-channels"]
    ),
    [
      {
        id: "derived:mirror-vfo-temporary-channels",
        subject: "Write image preparation",
        field: "Mirror VFO temporary channels",
        before: "Working Codeplug",
        after: "Applied to write image",
      },
      {
        id: "derived:restore-fixed-weather-channels",
        subject: "Write image preparation",
        field: "Restore fixed weather channels",
        before: "Working Codeplug",
        after: "Applied to write image",
      },
    ]
  )
})
