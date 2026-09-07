import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("keeps analytics repository-configured, privacy-filtered, and out of the service worker", async () => {
  const [config, provider, analytics, serviceWorker, privacy] =
    await Promise.all([
      readFile(new URL("../lib/analytics/config.ts", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../components/analytics/analytics-provider.tsx",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(new URL("../lib/analytics/index.ts", import.meta.url), "utf8"),
      readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
      readFile(
        new URL("../components/privacy/privacy-workspace.tsx", import.meta.url),
        "utf8"
      ),
    ])

  assert.doesNotMatch(config, /process\.env|import\.meta\.env|NEXT_PUBLIC/)
  assert.match(provider, /data-exclude-search="true"/)
  assert.match(provider, /data-exclude-hash="true"/)
  assert.match(provider, /data-do-not-track="true"/)
  assert.match(provider, /data-before-send="__73kitUmamiBeforeSend"/)
  assert.doesNotMatch(provider, /data-performance|data-auto-track|proxy/)
  assert.doesNotMatch(analytics, /\.identify\(|replay|heatmap|eventQueue/)
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/)
  assert.doesNotMatch(serviceWorker, /umami/i)
  assert.match(analytics, /radio_write_outcome_unknown/)
  assert.match(analytics, /update_outcome_unknown/)
  assert.match(privacy, /analyticsEventContract/)
})
