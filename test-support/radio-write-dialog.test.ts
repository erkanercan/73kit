import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const shellSource = readFileSync(
  new URL("../components/cps-app-shell.tsx", import.meta.url),
  "utf8"
)
const overviewSource = readFileSync(
  new URL("../components/overview-workspace.tsx", import.meta.url),
  "utf8"
)
const dialogSource = readFileSync(
  new URL("../components/radio-write/radio-write-dialog.tsx", import.meta.url),
  "utf8"
)
const workflowSource = readFileSync(
  new URL(
    "../components/radio-write/radio-write-workflow.tsx",
    import.meta.url
  ),
  "utf8"
)
const controllerSource = readFileSync(
  new URL("../components/cps-workspace-controller.tsx", import.meta.url),
  "utf8"
)

test("opens the shared Radio Write workflow from the persistent app header", () => {
  assert.match(shellSource, /<RadioWriteDialog \/>/)
  assert.doesNotMatch(overviewSource, /RadioWriteWorkflow/)
  assert.match(dialogSource, /<DialogTrigger/)
  assert.match(dialogSource, /disabled={!radioWriteReleased \|\| updateBusy}/)
  assert.match(dialogSource, /<RadioWriteWorkflow/)
})

test("keeps Radio Read visible in the persistent app header on every route", () => {
  assert.match(shellSource, /<RadioReadButton/)
  assert.doesNotMatch(shellSource, /showHeaderRead|includes\(pathname\)/)
})

test("keeps an active Radio Write visible and explains unavailable inputs", () => {
  assert.match(dialogSource, /if \(!nextOpen && writeActive\) return/)
  assert.match(dialogSource, /showCloseButton={!writeActive}/)
  assert.match(workflowSource, /radioWriteReadRequiredTitle/)
  assert.match(workflowSource, /radioWriteNoChangesTitle/)
})

test("clears the Radio Write workflow whenever the dialog closes", () => {
  assert.match(
    dialogSource,
    /if \(!nextOpen\) \{\s*setWriteAttempted\(false\)\s*void discardRadioWriteStatus\(\)\s*\}/
  )
  assert.match(
    controllerSource,
    /const discardRadioWriteStatus = React\.useCallback\(async \(\) => \{\s*setRadioWriteSnapshot\(null\)\s*setRadioWriteReview\(\[\]\)\s*setError\(null\)\s*try \{\s*await workspace\.current\?\.discardRadioWriteOperation\(\)/
  )
})
