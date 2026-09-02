import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("73Kit brand assets use the approved mark and wordmark", async () => {
  const [mark, logo, sidebar, seo, proxy] = await Promise.all([
    readFile(
      new URL("../public/brand/73kit-mark.svg", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../public/brand/73kit-logo.svg", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../components/app-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/seo.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
  ])

  assert.match(mark, /linearGradient id="path"/)
  assert.match(mark, /linearGradient id="signal"/)
  assert.match(logo, /<g fill="#211A82" aria-label="73Kit">/)
  assert.doesNotMatch(logo, /<text\b/)
  assert.doesNotMatch(logo, /@font-face|font-family/)
  assert.match(sidebar, />\s*73Kit\s*</)
  assert.match(seo, /images: \["\/opengraph-image\.png"\]/)
  assert.match(proxy, /favicon\.ico\|opengraph-image/)
})
