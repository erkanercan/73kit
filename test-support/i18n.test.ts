import assert from "node:assert/strict"
import test from "node:test"

import { isLocale, routing } from "../i18n/routing.ts"

test("recognizes only supported locales", () => {
  assert.equal(isLocale("tr"), true)
  assert.equal(isLocale("en"), true)
  assert.equal(isLocale("de"), false)
})

test("uses Turkish as the default locale and prefixes every locale", () => {
  assert.equal(routing.defaultLocale, "tr")
  assert.equal(routing.localePrefix, "always")
})
