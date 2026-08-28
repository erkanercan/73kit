import {
  findCatalogPackage,
  isResourceCatalogPackage,
  type CatalogFileType,
} from "../update-catalog/index.ts"
import { DatPackageError, parseDat } from "./dat-parser.ts"
import { validateFirmwareIntegrity } from "./package-integrity.ts"
import type { UpdatePackageErrorCode, ValidatedUpdatePackage } from "./types.ts"

class UpdatePackageError extends Error {
  readonly code: UpdatePackageErrorCode

  constructor(code: UpdatePackageErrorCode, message: string) {
    super(message)
    this.name = "UpdatePackageError"
    this.code = code
  }
}

async function validateUpdatePackage(
  fileName: string,
  input: Uint8Array,
  options: { readonly allowDisabledCatalogEntry?: boolean } = {}
): Promise<ValidatedUpdatePackage> {
  if (input.byteLength === 0) {
    throw new UpdatePackageError("empty", "The selected package is empty")
  }

  const fileType = extensionOf(fileName)
  const bytes = input.slice()
  const sha256 = await digestHex(bytes)
  const catalogPackage = findCatalogPackage(sha256, fileType)

  if (!catalogPackage) {
    throw new UpdatePackageError(
      "unknown-package",
      "This package is not in the validated UVL-15W release catalog"
    )
  }
  if (
    catalogPackage.releaseStatus === "disabled" &&
    !options.allowDisabledCatalogEntry
  ) {
    throw new UpdatePackageError(
      "package-not-released",
      "This package is registered but not released for browser updating"
    )
  }

  const common = {
    catalogId: catalogPackage.id,
    fileName,
    version: catalogPackage.version,
    releaseStatus: catalogPackage.releaseStatus,
    byteLength: bytes.byteLength,
    sha256,
    targets: catalogPackage.targets,
    prerequisites: catalogPackage.prerequisites,
    radioCompatibility: catalogPackage.radioCompatibility,
  }

  if (catalogPackage.kind === "firmware") {
    if (!validateFirmwareIntegrity(bytes)) {
      throw new UpdatePackageError(
        "firmware-integrity",
        "The firmware package failed its TYT integrity check"
      )
    }
    return Object.freeze({
      ...common,
      kind: "firmware",
      blockCount: Math.ceil((bytes.byteLength - 16) / 512),
      bytes,
    })
  }

  if (!isResourceCatalogPackage(catalogPackage)) {
    throw new UpdatePackageError(
      "dat-record",
      `Update catalog package ${catalogPackage.id} has no resource layout`
    )
  }

  try {
    const data = parseDat(bytes, catalogPackage.resource)
    return Object.freeze({
      ...common,
      kind: catalogPackage.kind,
      blockCount: Math.ceil(data.byteLength / 512),
      startAddress: catalogPackage.resource.startAddress,
      endAddress: catalogPackage.resource.endAddress,
      compatibilityPayload: fromHex(
        catalogPackage.resource.compatibilityPayloadHex
      ),
      recoveryCompatibilityPayload:
        catalogPackage.resource.recoveryCompatibilityPayloadHex === undefined
          ? undefined
          : fromHex(catalogPackage.resource.recoveryCompatibilityPayloadHex),
      bytes: data,
    })
  } catch (cause) {
    if (cause instanceof DatPackageError) {
      throw new UpdatePackageError(cause.code, cause.message)
    }
    throw cause
  }
}

function extensionOf(fileName: string): CatalogFileType {
  const extension = fileName.split(".").at(-1)?.toLowerCase()
  if (extension === "fir" || extension === "dat") return extension
  throw new UpdatePackageError(
    "extension",
    "Select an official TYT .Fir or .DAT package"
  )
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(value: string) {
  if (value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error("Update catalog contains invalid hexadecimal data")
  }
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16)
  )
}

export { UpdatePackageError, validateUpdatePackage }
export { md5, xxteaEncrypt } from "./package-integrity.ts"
export type {
  ResourcePackageKind,
  UpdatePackageErrorCode,
  UpdatePackageKind,
  UpdatePackageSummary,
  UpdatePrerequisite,
  UpdateRadioCompatibility,
  UpdateTargetVersions,
  ValidatedFirmwarePackage,
  ValidatedResourcePackage,
  ValidatedUpdatePackage,
} from "./types.ts"
