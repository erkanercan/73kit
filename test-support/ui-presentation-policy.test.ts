import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import test from "node:test"

const projectRoot = process.cwd()
const componentRoot = join(projectRoot, "components")
const alertDialogSource = readFileSync(
  join(componentRoot, "ui/alert-dialog.tsx"),
  "utf8"
)

function componentFiles(directory = componentRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "ui" ? [] : componentFiles(path)
    }
    return entry.name.endsWith(".tsx") ? [path] : []
  })
}

test("only planned navigation items use badges", () => {
  const badgeFiles = componentFiles()
    .filter((path) => readFileSync(path, "utf8").includes("<Badge"))
    .map((path) => relative(projectRoot, path))
    .sort()

  assert.deepEqual(badgeFiles, [
    "components/nav-main.tsx",
    "components/nav-secondary.tsx",
  ])
})

test("page content does not use gray title-description components", () => {
  for (const path of componentFiles()) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /CardDescription|EmptyDescription/, path)
    assert.doesNotMatch(
      source,
      /<(?:Alert)?DialogDescription(?![^>]*className="sr-only")/,
      path
    )
    assert.doesNotMatch(
      source,
      /<\/PageHeader>\s*<p[^>]*text-muted-foreground/,
      path
    )
  }
})

test("every progress value uses the shared two-decimal formatter", () => {
  for (const path of componentFiles()) {
    const source = readFileSync(path, "utf8")
    if (!source.includes("<ProgressValue")) continue

    assert.match(source, /formatPercent/, path)
    assert.doesNotMatch(source, /<ProgressValue\s*\/>/, path)
  }
})

test("alert dialog cancel buttons have comfortable horizontal padding", () => {
  assert.match(
    alertDialogSource,
    /data-slot="alert-dialog-cancel"\s*className={cn\("px-4", className\)}/
  )
})
