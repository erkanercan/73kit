import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("../components/overview-workspace.tsx", import.meta.url),
  "utf8"
)

test("renders Overview navigation as links instead of Base UI buttons", () => {
  assert.doesNotMatch(source, /<Button[^>]*render=\{<Link/)
  for (const href of ["channelsPath", "radioPath", "backupsPath"]) {
    assert.match(
      source,
      new RegExp(
        `<Link[\\s\\S]{0,160}href=\\{${href}\\}[\\s\\S]{0,160}buttonVariants`
      )
    )
  }
  assert.match(source, /href=\{destination\.href\}[\s\S]{0,160}buttonVariants/)
})
