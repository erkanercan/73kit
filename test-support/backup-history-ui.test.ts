import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const backupsSource = readFileSync(
  new URL("../components/backups/backups-workspace.tsx", import.meta.url),
  "utf8"
)
const sidebarSource = readFileSync(
  new URL("../components/app-sidebar.tsx", import.meta.url),
  "utf8"
)

test("exposes Backup History row actions like the Channels table", () => {
  assert.doesNotMatch(backupsSource, /DropdownMenu|MoreHorizontalIcon/)
  assert.match(
    backupsSource,
    /variant="ghost"[\s\S]*size="icon-sm"[\s\S]*backupsDownload/
  )
  assert.match(
    backupsSource,
    /variant="ghost"[\s\S]*size="icon-sm"[\s\S]*backupsDelete/
  )
})

test("places Backups directly above Updates in secondary navigation", () => {
  const secondaryNavigation = sidebarSource.slice(
    sidebarSource.indexOf("const secondaryNavigation"),
    sidebarSource.indexOf(
      "return (",
      sidebarSource.indexOf("const secondaryNavigation")
    )
  )

  assert.ok(secondaryNavigation.indexOf('t("navBackups")') >= 0)
  assert.ok(
    secondaryNavigation.indexOf('t("navBackups")') <
      secondaryNavigation.indexOf('t("navUpdates")')
  )
})
