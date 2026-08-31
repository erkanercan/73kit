import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("Channel filter Selects resolve labels for their closed values", async () => {
  const source = await readFile(
    new URL("../components/channels/memory-channels-card.tsx", import.meta.url),
    "utf8"
  )

  assert.match(source, /<Select\s+items={options}\s+value={value}/)
})
