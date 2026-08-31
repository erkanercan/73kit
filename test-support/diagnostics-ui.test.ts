import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const pageSource = readFileSync(
  new URL("../app/[locale]/diagnostics/page.tsx", import.meta.url),
  "utf8"
)
const workspaceSource = readFileSync(
  new URL(
    "../components/diagnostics/diagnostics-workspace.tsx",
    import.meta.url
  ),
  "utf8"
)
const sidebarSource = readFileSync(
  new URL("../components/app-sidebar.tsx", import.meta.url),
  "utf8"
)
const radioControllerSource = readFileSync(
  new URL(
    "../components/cps-workspace/use-cps-workspace-controller.ts",
    import.meta.url
  ),
  "utf8"
)
const updateControllerSource = readFileSync(
  new URL("../components/update-coordinator-controller.tsx", import.meta.url),
  "utf8"
)

test("routes Diagnostics as an implemented secondary workspace", () => {
  assert.match(pageSource, /<DiagnosticsWorkspace \/>/)
  const item = sidebarSource.slice(
    sidebarSource.indexOf('title: t("navDiagnostics")'),
    sidebarSource.indexOf('title: t("navAbout")')
  )
  assert.match(item, /href: "\/diagnostics"/)
  assert.match(item, /planned: false/)
})

test("keeps diagnostics local and makes support submission operator-controlled", () => {
  assert.match(workspaceSource, /diagnosticHistoryStore[\s\S]*\.list\(\)/)
  assert.match(workspaceSource, /serializeDiagnosticIncident\(selected\)/)
  assert.match(workspaceSource, /diagnosticEmailHref\(selected\)/)
  assert.match(workspaceSource, /diagnosticsExcludedDescription/)
  assert.doesNotMatch(workspaceSource, /fetch\(|XMLHttpRequest/)
})

test("records Radio and Update outcomes without making diagnostics part of their result", () => {
  assert.match(radioControllerSource, /recordRadioDiagnostic\(\{/)
  assert.match(radioControllerSource, /outcome: "success"/)
  assert.match(radioControllerSource, /"write-outcome-unknown"/)
  assert.match(updateControllerSource, /recordDiagnosticIncident\(\{/)
  assert.match(updateControllerSource, /phase === "complete"/)
  assert.match(updateControllerSource, /phase === "outcome-unknown"/)
})
