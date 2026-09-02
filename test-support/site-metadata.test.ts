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
  assert.equal(SITE_ORIGIN.toString(), "https://73kit.erkan.dev/")
  assert.equal(absoluteUrl("/tr"), "https://73kit.erkan.dev/tr")
  assert.equal(localizedPath("en"), "/en")
  assert.deepEqual(localizedAlternates(), {
    en: "https://73kit.erkan.dev/en",
    tr: "https://73kit.erkan.dev/tr",
    "x-default": "https://73kit.erkan.dev/tr",
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
    sitemap: "https://73kit.erkan.dev/sitemap.xml",
    host: "73kit.erkan.dev",
  })
})

test("sitemap contains the localized 73Kit and Radio CPS entry URLs", () => {
  const entries = sitemap()

  assert.equal(entries.length, 6)
  assert.deepEqual(
    entries.map(({ url }) => url),
    [
      "https://73kit.erkan.dev/tr",
      "https://73kit.erkan.dev/en",
      "https://73kit.erkan.dev/tr/cps",
      "https://73kit.erkan.dev/en/cps",
      "https://73kit.erkan.dev/tr/cps/tyt-uvl15w",
      "https://73kit.erkan.dev/en/cps/tyt-uvl15w",
    ]
  )

  for (const entry of entries) {
    assert.equal(entry.url.startsWith("https://73kit.erkan.dev/"), true)
    assert.equal(
      entry.alternates?.languages?.["x-default"]?.startsWith(
        "https://73kit.erkan.dev/tr"
      ),
      true
    )
  }
})
