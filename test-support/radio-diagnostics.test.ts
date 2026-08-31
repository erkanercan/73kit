import assert from "node:assert/strict"
import test from "node:test"

import { createRadioDiagnosticReport } from "../modules/radio-diagnostics/index.ts"

test("creates a bounded allowlist-only Radio diagnostic report", () => {
  const report = createRadioDiagnosticReport({
    generatedAt: "2026-08-31T12:00:00.000Z",
    locale: "en",
    pathname: "https://example.test/en/diagnostics?secret=value#fragment",
    phase: "ready",
    errorCode: null,
    operation: "radio-read",
    radio: {
      model: "UVL-15W",
      firmwareVersion: "3.07.23",
      hardwareVersion: "1.0",
      resourceVersion: "2.0",
    },
    environment: {
      secureContext: true,
      online: true,
      webSerialSupported: true,
      serviceWorkerSupported: true,
      indexedDbSupported: true,
    },
    events: [
      {
        sequence: 1,
        direction: "received",
        command: 0xe4,
        payloadLength: 518,
        address: 0x8000,
        dataLength: 512,
        attempt: 1,
      },
    ],
  })
  const content = JSON.parse(report.content) as Record<string, unknown>
  const serialized = JSON.stringify(content)

  assert.equal(content.route, "/en/diagnostics")
  assert.deepEqual(content.radio, {
    model: "UVL-15W",
    firmwareVersion: "3.07.23",
    hardwareVersion: "1.0",
    resourceVersion: "2.0",
  })
  assert.equal(serialized.includes("secret"), false)
  for (const forbidden of [
    "serialNumber",
    "cpuId",
    "frameHex",
    "userAgent",
    "sessionKey",
    "bytes",
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
