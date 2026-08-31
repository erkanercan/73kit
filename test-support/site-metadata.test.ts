import assert from "node:assert/strict"
import test from "node:test"

import robots from "../app/robots.ts"
import sitemap from "../app/sitemap.ts"
import {
  absoluteUrl,
  localizedAlternates,
  localizedPath,
  SITE_ORIGIN,
} from "../lib/site.ts"

test("site URLs resolve against the canonical production origin", () => {
  assert.equal(SITE_ORIGIN.toString(), "https://cps.erkan.dev/")
  assert.equal(absoluteUrl("/tr"), "https://cps.erkan.dev/tr")
  assert.equal(localizedPath("en"), "/en")
  assert.deepEqual(localizedAlternates(), {
    en: "https://cps.erkan.dev/en",
    tr: "https://cps.erkan.dev/tr",
    "x-default": "https://cps.erkan.dev/tr",
  })
})

test("robots allows discovery and advertises the canonical sitemap", () => {
  assert.deepEqual(robots(), {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: ["GPTBot", "ClaudeBot"],
        disallow: "/",
      },
    ],
    sitemap: "https://cps.erkan.dev/sitemap.xml",
    host: "cps.erkan.dev",
  })
})

test("sitemap contains only the localized CPS entry URLs", () => {
  const entries = sitemap()

  assert.equal(entries.length, 2)
  assert.deepEqual(
    entries.map(({ url }) => url),
    ["https://cps.erkan.dev/tr", "https://cps.erkan.dev/en"]
  )

  for (const entry of entries) {
    assert.equal(entry.url.startsWith("https://cps.erkan.dev/"), true)
    assert.equal(
      entry.alternates?.languages?.["x-default"]?.startsWith(
        "https://cps.erkan.dev/tr"
      ),
      true
    )
  }
})
