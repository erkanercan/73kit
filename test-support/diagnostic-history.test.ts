import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_INCIDENTS_PER_SOURCE,
  SUPPORT_EMAIL,
  createDiagnosticIncident,
  diagnosticEmailHref,
  pruneDiagnosticIncidents,
  serializeDiagnosticIncident,
} from "../modules/diagnostics/index.ts"

function incident(
  id: string,
  source: "radio" | "update",
  outcome: "failed" | "outcome-unknown" | "success",
  day: number
) {
  return createDiagnosticIncident({
    id,
    createdAt: `2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`,
    source,
    operation: source === "radio" ? "radio-read" : "firmware-update",
    outcome,
    phase: outcome,
    errorCode: outcome === "success" ? null : "response-timeout",
    eventCount: 3,
    reportContent: JSON.stringify({ reportType: `${source}-diagnostics`, id }),
  })
}

test("retains ten incidents and only the latest success per source", () => {
  const entries = [
    ...Array.from({ length: 12 }, (_, index) =>
      incident(`radio-${index}`, "radio", "failed", index + 1)
    ),
    incident("radio-success-old", "radio", "success", 12),
    incident("radio-success-new", "radio", "success", 13),
    ...Array.from({ length: 12 }, (_, index) =>
      incident(`update-${index}`, "update", "outcome-unknown", index + 1)
    ),
  ]

  const retained = pruneDiagnosticIncidents(
    entries,
    new Date("2026-08-20T00:00:00.000Z")
  )
  assert.equal(
    retained.filter(
      (entry) => entry.source === "radio" && entry.outcome !== "success"
    ).length,
    MAX_INCIDENTS_PER_SOURCE
  )
  assert.equal(
    retained.filter(
      (entry) => entry.source === "update" && entry.outcome !== "success"
    ).length,
    MAX_INCIDENTS_PER_SOURCE
  )
  assert.deepEqual(
    retained
      .filter((entry) => entry.outcome === "success")
      .map((entry) => entry.id),
    ["radio-success-new"]
  )
})

test("expires diagnostic history after thirty days", () => {
  const retained = pruneDiagnosticIncidents(
    [incident("expired", "radio", "failed", 1)],
    new Date("2026-09-01T12:00:00.001Z")
  )
  assert.deepEqual(retained, [])
})

test("serializes only the source allowlisted report and prepares support email", () => {
  const entry = createDiagnosticIncident({
    id: "safe-report",
    createdAt: "2026-08-31T12:00:00.000Z",
    source: "radio",
    operation: "radio-read",
    outcome: "failed",
    phase: "reading",
    errorCode: "response-timeout",
    eventCount: 1,
    radio: {
      model: "UVL-15W",
      firmwareVersion: "3.07.23",
      hardwareVersion: "1.0",
      resourceVersion: "2.0",
    },
    reportContent: JSON.stringify({ safe: true }),
  })

  assert.deepEqual(JSON.parse(serializeDiagnosticIncident(entry)), {
    safe: true,
  })
  const email = decodeURIComponent(diagnosticEmailHref(entry))
  assert.match(email, new RegExp(`mailto:${SUPPORT_EMAIL.replace("+", "\\+")}`))
  assert.match(email, /Please attach the downloaded report/)
  assert.doesNotMatch(email, /serialNumber|cpuId/)
})
