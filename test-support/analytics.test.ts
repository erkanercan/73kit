import assert from "node:assert/strict"
import test from "node:test"

import { analyticsConfig } from "../lib/analytics/config.ts"
import {
  ANALYTICS_STORAGE_KEY,
  applyAnalyticsPreference,
  changeCountBucket,
  durationBucket,
  errorCategory,
  isAnalyticsConfigured,
  isTrustedUmamiScriptUrl,
  readAnalyticsPreference,
  resolveAnalyticsEnabled,
  sanitizeUmamiPayload,
  setAnalyticsRuntimeEnabled,
  trackAnalytics,
  validateEvent,
  writeAnalyticsPreference,
} from "../lib/analytics/index.ts"

test("ships enabled with the checked-in public Umami configuration", () => {
  assert.equal(analyticsConfig.enabled, true)
  assert.equal(
    analyticsConfig.websiteId,
    "9a553594-03ac-4009-a1b6-3f6267387aa6"
  )
  assert.equal(analyticsConfig.scriptUrl, "https://cloud.umami.is/script.js")
  assert.equal(isAnalyticsConfigured(), true)
})

test("accepts only HTTPS Umami tracker origins and JavaScript paths", () => {
  assert.equal(
    isTrustedUmamiScriptUrl("https://cloud.umami.is/script.js"),
    true
  )
  assert.equal(isTrustedUmamiScriptUrl("https://umami.is/custom.js"), true)
  assert.equal(
    isTrustedUmamiScriptUrl("http://cloud.umami.is/script.js"),
    false
  )
  assert.equal(isTrustedUmamiScriptUrl("https://example.com/script.js"), false)
  assert.equal(isTrustedUmamiScriptUrl("not a URL"), false)
})

test("resolves both modes with privacy and storage precedence", () => {
  const base = {
    configured: true,
    hostname: analyticsConfig.allowedDomain,
    storageAvailable: true,
    preference: "unset" as const,
    mode: "notice-opt-out" as const,
    doNotTrack: false,
    globalPrivacyControl: false,
  }
  assert.equal(resolveAnalyticsEnabled(base), true)
  assert.equal(
    resolveAnalyticsEnabled({ ...base, mode: "consent-opt-in" }),
    false
  )
  assert.equal(
    resolveAnalyticsEnabled({ ...base, preference: "enabled" }),
    true
  )
  assert.equal(
    resolveAnalyticsEnabled({ ...base, preference: "disabled" }),
    false
  )
  assert.equal(resolveAnalyticsEnabled({ ...base, doNotTrack: true }), false)
  assert.equal(
    resolveAnalyticsEnabled({ ...base, globalPrivacyControl: true }),
    false
  )
  assert.equal(
    resolveAnalyticsEnabled({ ...base, storageAvailable: false }),
    false
  )
  assert.equal(
    resolveAnalyticsEnabled({ ...base, hostname: "localhost" }),
    false
  )
})

test("reads, writes, versions, and safely fails analytics preference storage", () => {
  let stored: string | null = null
  const storage = {
    getItem: (key: string) => (key === ANALYTICS_STORAGE_KEY ? stored : null),
    setItem: (key: string, value: string) => {
      assert.equal(key, ANALYTICS_STORAGE_KEY)
      stored = value
    },
  }
  assert.deepEqual(readAnalyticsPreference(storage), {
    storageAvailable: true,
    preference: "unset",
    noticeVersion: 0,
  })
  assert.equal(
    writeAnalyticsPreference(storage, {
      preference: "disabled",
      noticeVersion: 2,
    }),
    true
  )
  assert.deepEqual(readAnalyticsPreference(storage), {
    storageAvailable: true,
    preference: "disabled",
    noticeVersion: 2,
  })
  assert.equal(
    writeAnalyticsPreference(
      {
        setItem: () => {
          throw new Error("blocked")
        },
      },
      { preference: "enabled", noticeVersion: 1 }
    ),
    false
  )
  assert.equal(
    readAnalyticsPreference({
      getItem: () => {
        throw new Error("blocked")
      },
    }).storageAvailable,
    false
  )
})

test("blocks tracking before persisting a preference and reloading", () => {
  let tracked = 0
  let reloads = 0
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      umami: {
        track: () => {
          tracked += 1
        },
      },
    },
  })
  setAnalyticsRuntimeEnabled(true)
  assert.equal(
    applyAnalyticsPreference(
      { setItem: () => undefined },
      { preference: "disabled", noticeVersion: 1 },
      () => {
        reloads += 1
      }
    ),
    true
  )
  trackAnalytics("radio_write_started", { radio_model: "tyt-uvl15w" })
  assert.equal(tracked, 0)
  assert.equal(reloads, 1)
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  })
})

test("accepts only exact event names, properties, and categorical values", () => {
  assert.equal(
    validateEvent("radio_read_failed", {
      radio_model: "tyt-uvl15w",
      error_category: "connection",
    }),
    true
  )
  assert.equal(
    validateEvent("radio_read_failed", {
      radio_model: "A Radio Name",
      error_category: "connection",
    }),
    false
  )
  assert.equal(
    validateEvent("radio_read_failed", {
      radio_model: "tyt-uvl15w",
      error_category: "free form",
    }),
    false
  )
  assert.equal(validateEvent("unknown", {}), false)
  assert.equal(
    validateEvent("restore_prepared", {
      radio_model: "tyt-uvl15w",
      restore_source: "cps_file",
      outcome: "outcome_unknown",
    }),
    false
  )
  assert.equal(
    validateEvent("diagnostic_report_exported", {
      source: "radio",
      outcome: "success",
    }),
    true
  )
})

test("sanitizes pageviews and rejects unsafe custom events", () => {
  assert.deepEqual(
    sanitizeUmamiPayload("event", {
      url: "https://73kit.erkan.dev/en/cps?serial=secret#part",
      referrer: "https://search.example/results?q=secret",
      screen: "1920x1080",
      language: "en-US",
      timestamp: 1_800_000_000,
      hostname: "73kit.erkan.dev",
    }),
    {
      url: "/en/cps",
      referrer: "https://search.example",
      hostname: "73kit.erkan.dev",
    }
  )
  assert.equal(
    sanitizeUmamiPayload("event", {
      name: "radio_read_failed",
      data: { radio_model: "tyt-uvl15w", message: "secret" },
    }),
    false
  )
  assert.equal(
    sanitizeUmamiPayload("event", { name: "unknown", data: {} }),
    false
  )
  assert.equal(sanitizeUmamiPayload("event", []), false)
  assert.equal(
    sanitizeUmamiPayload("identify", {
      website: "public-id",
      url: "/en",
    }),
    false
  )
  assert.equal(
    sanitizeUmamiPayload("event", {
      website: "public-id",
      url: "/en",
      distinctId: "identifier",
    }),
    false
  )
  assert.equal(
    sanitizeUmamiPayload("event", {
      website: { identifier: "secret" },
      url: "/en",
    }),
    false
  )
  assert.equal(
    sanitizeUmamiPayload("event", {
      hostname: ["73kit.erkan.dev"],
      url: "/en",
    }),
    false
  )
})

test("tracking is best-effort and never throws", () => {
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      umami: {
        track: () => {
          throw new Error("network")
        },
      },
    },
  })
  setAnalyticsRuntimeEnabled(true)
  assert.doesNotThrow(() =>
    trackAnalytics("radio_write_started", { radio_model: "tyt-uvl15w" })
  )
  setAnalyticsRuntimeEnabled(false)
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow,
  })
})

test("maps raw durations, counts, and errors to fixed categories", () => {
  assert.equal(durationBucket(14_999), "under_15s")
  assert.equal(durationBucket(15_000), "15_to_30s")
  assert.equal(durationBucket(60_000), "over_60s")
  assert.equal(changeCountBucket(1), "1")
  assert.equal(changeCountBucket(20), "6_to_20")
  assert.equal(changeCountBucket(21), "over_20")
  assert.equal(errorCategory(new Error("Permission denied")), "permission")
  assert.equal(errorCategory("private arbitrary content"), "unknown")
})
