import { readFile } from "node:fs/promises"
import { basename } from "node:path"

import { validateUpdatePackage } from "../../modules/update-package/index.ts"

const paths = process.argv.slice(2).filter((path) => path !== "--")
if (paths.length === 0) {
  console.error("Pass one or more official .Fir or .DAT package paths.")
  process.exitCode = 1
} else {
  for (const path of paths) {
    const updatePackage = await validateUpdatePackage(
      basename(path),
      new Uint8Array(await readFile(path)),
      { allowDisabledCatalogEntry: true }
    )
    console.log(
      `${updatePackage.catalogId}: ${updatePackage.kind} ${updatePackage.version}, ${updatePackage.blockCount} blocks`
    )
  }
}
