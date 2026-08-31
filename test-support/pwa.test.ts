import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("manifest declares a localized standalone application", async () => {
  const source = await readFile(
    new URL("../app/manifest.ts", import.meta.url),
    "utf8"
  )
  assert.match(source, /start_url: "\/tr"/)
  assert.match(source, /scope: "\/"/)
  assert.match(source, /display: "standalone"/)
  assert.match(source, /purpose: "maskable"/)
})

test("service worker excludes user and update artifacts from caches", async () => {
  const source = await readFile(
    new URL("../public/sw.js", import.meta.url),
    "utf8"
  )

  for (const extension of [".uvl15cps", ".bin", ".dat", ".fir", ".json"]) {
    assert.match(source, new RegExp(extension.replace(".", "\\."), "i"))
  }
  assert.match(source, /request\.method !== "GET"/)
  assert.match(source, /url\.origin !== self\.location\.origin/)
  assert.doesNotMatch(source, /skipWaiting/)
})
