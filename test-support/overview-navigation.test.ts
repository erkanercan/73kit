import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const overviewPageSource = readFileSync(
  new URL("../app/[locale]/page.tsx", import.meta.url),
  "utf8"
)
const radioPageSource = readFileSync(
  new URL("../app/[locale]/radio/page.tsx", import.meta.url),
  "utf8"
)
const sidebarSource = readFileSync(
  new URL("../components/app-sidebar.tsx", import.meta.url),
  "utf8"
)
const shellSource = readFileSync(
  new URL("../components/cps-app-shell.tsx", import.meta.url),
  "utf8"
)
const overviewSource = readFileSync(
  new URL("../components/overview-workspace.tsx", import.meta.url),
  "utf8"
)
const radioWorkspaceSource = readFileSync(
  new URL("../components/radio-workspace.tsx", import.meta.url),
  "utf8"
)
const radioReadButtonSource = readFileSync(
  new URL("../components/radio-read-button.tsx", import.meta.url),
  "utf8"
)
const fullPageEmptyWorkspacePaths = [
  "../components/aprs/aprs-workspace.tsx",
  "../components/bluetooth/bluetooth-workspace.tsx",
  "../components/channel-collections/membership-collections-workspace.tsx",
  "../components/channels/channels-workspace.tsx",
  "../components/fm-broadcast/fm-broadcast-workspace.tsx",
  "../components/gps/gps-workspace.tsx",
  "../components/radio-settings/display-settings/display-settings-workspace.tsx",
  "../components/radio-settings/function-settings/function-settings-workspace.tsx",
  "../components/radio-settings/keyboard-settings/keyboard-settings-workspace.tsx",
  "../components/radio-settings/menu-visibility/menu-visibility-workspace.tsx",
  "../components/radio-settings/sound-settings/sound-settings-workspace.tsx",
  "../components/radio-workspace.tsx",
  "../components/signal-system/signal-system-workspace.tsx",
  "../components/spectrum/spectrum-workspace.tsx",
  "../components/vfo-scan-edges/vfo-scan-edges-workspace.tsx",
] as const

test("uses Overview as home and keeps Radio on its own route", () => {
  assert.match(overviewPageSource, /<OverviewWorkspace \/>/)
  assert.match(radioPageSource, /<RadioWorkspace \/>/)

  const workspaceNavigation = sidebarSource.slice(
    sidebarSource.indexOf('label: t("navWorkspace")'),
    sidebarSource.indexOf('label: t("navConfiguration")')
  )
  assert.ok(
    workspaceNavigation.indexOf('title: t("navOverview")') <
      workspaceNavigation.indexOf('title: t("navRadio")')
  )
  assert.match(workspaceNavigation, /title: t\("navOverview"\),\s*href: "\/"/)
  assert.match(workspaceNavigation, /title: t\("navRadio"\),\s*href: "\/radio"/)
})

test("maps every operator route to the correct breadcrumb", () => {
  for (const path of [
    "/",
    "/radio",
    "/channels",
    "/zones",
    "/scan-lists",
    "/vfo-scan-edges",
    "/aprs",
    "/gps",
    "/spectrum",
    "/bluetooth",
    "/fm-radio",
    "/signal-system",
    "/backups",
    "/updates",
    "/prototype/radio-write",
  ]) {
    assert.match(shellSource, new RegExp(`"${path.replaceAll("/", "\\/")}"`))
  }
})

test("keeps the Overview focused on the Codeplug workflow", () => {
  assert.match(overviewSource, /overviewStepReadTitle/)
  assert.match(overviewSource, /overviewStepProgramTitle/)
  assert.match(overviewSource, /overviewStepWriteTitle/)
  assert.match(overviewSource, /LatestBackupCard/)
  assert.doesNotMatch(overviewSource, /Chart|analytics|metric/i)
})

test("uses the standard full-page empty state for Radio identity", () => {
  assert.match(
    radioWorkspaceSource,
    /<Empty className="min-h-\[32rem\] border">/
  )
  assert.doesNotMatch(
    radioWorkspaceSource,
    /<Empty className="min-h-72 border">/
  )
  assert.match(
    radioWorkspaceSource,
    /<EmptyTitle>\{t\("noRadioInformation"\)\}<\/EmptyTitle>/
  )
})

test("uses one title-to-container gap across full-page empty states", () => {
  for (const path of fullPageEmptyWorkspacePaths) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8")
    const emptyIndex = source.indexOf(
      '<Empty className="min-h-[32rem] border">'
    )
    const mainIndex = source.lastIndexOf("<main className=", emptyIndex)
    const mainTag = source.slice(mainIndex, source.indexOf(">", mainIndex) + 1)

    assert.notEqual(emptyIndex, -1, `${path} has no full-page Empty`)
    assert.notEqual(mainIndex, -1, `${path} has no enclosing page shell`)
    assert.match(mainTag, /\bgap-3\b/, `${path} must use the standard gap-3`)
  }
})

test("uses the shared loading Radio Read action in every full-page empty state", () => {
  assert.match(radioReadButtonSource, /LoaderCircleIcon/)
  assert.match(radioReadButtonSource, /className="animate-spin"/)
  assert.match(radioReadButtonSource, /t\("readingRadio"\)/)
  assert.match(radioReadButtonSource, /disabled=\{disabled \|\| busy\}/)

  for (const path of fullPageEmptyWorkspacePaths) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8")
    const emptyIndex = source.indexOf(
      '<Empty className="min-h-[32rem] border">'
    )
    const emptyState = source.slice(emptyIndex, emptyIndex + 1_200)

    assert.match(
      emptyState,
      /<RadioReadButton[\s\S]*?busy=\{busy\}/,
      `${path} must use the shared loading Radio Read button`
    )
  }
})
