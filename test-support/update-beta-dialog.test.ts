import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("../components/updates/update-beta-dialog.tsx", import.meta.url),
  "utf8"
)

test("renders update navigation as a link instead of a Base UI button", () => {
  assert.doesNotMatch(source, /<Button[^>]*render=\{<Link/)
  assert.match(source, /<Link[\s\S]*className=\{buttonVariants\(/)
})
