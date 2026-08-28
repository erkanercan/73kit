import rawCatalog from "../../data/update-catalog/uvl15w.json" with { type: "json" }

type CatalogPackageKind = "firmware" | "language" | "image" | "combined"
type CatalogFileType = "fir" | "dat"
type UpdateReleaseStatus = "disabled" | "beta" | "stable"

interface UpdateTargetVersions {
  readonly firmware?: string
  readonly language?: string
  readonly image?: string
}

interface UpdatePrerequisite {
  readonly kind: "language"
  readonly version: string
  readonly relation: "exact" | "minimum"
}

interface UpdateRadioCompatibility {
  readonly hardwareFieldHashes: readonly string[]
  readonly bootloaderFieldHashes: readonly string[]
  readonly modelFieldHashes: readonly string[]
  readonly sourceFirmwareVersions: readonly string[]
}

interface CatalogRadioProfile {
  readonly id: string
  readonly hardwareFieldHashes: readonly string[]
  readonly bootloaderFieldHashes: readonly string[]
  readonly modelFieldHashes: readonly string[]
}

interface CatalogResourceFormat {
  readonly startAddress: number
  readonly endAddress: number
  readonly recordCount: number
  readonly compatibilityPayloadHex: string
  readonly recoveryCompatibilityPayloadHex?: string
}

interface CatalogPackage {
  readonly id: string
  readonly kind: CatalogPackageKind
  readonly fileType: CatalogFileType
  readonly version: string
  readonly releaseStatus: UpdateReleaseStatus
  readonly sha256: string
  readonly radioProfileId: string
  readonly sourceFirmwareVersions: readonly string[]
  readonly targets: UpdateTargetVersions
  readonly prerequisites: readonly UpdatePrerequisite[]
  readonly resource?: CatalogResourceFormat
}

interface UpdateCatalog {
  readonly schemaVersion: 2
  readonly normalModeFirmwareVersions: readonly string[]
  readonly radioProfiles: readonly CatalogRadioProfile[]
  readonly packages: readonly CatalogPackage[]
}

interface ResolvedCatalogPackage extends CatalogPackage {
  readonly radioCompatibility: UpdateRadioCompatibility
}

const catalog = rawCatalog as UpdateCatalog
validateCatalog(catalog)

function findCatalogPackage(
  sha256: string,
  fileType: CatalogFileType
): ResolvedCatalogPackage | undefined {
  const entry = catalog.packages.find(
    (candidate) =>
      candidate.sha256.toLowerCase() === sha256.toLowerCase() &&
      candidate.fileType === fileType
  )
  if (!entry) return undefined

  const profile = catalog.radioProfiles.find(
    (candidate) => candidate.id === entry.radioProfileId
  )
  if (!profile) {
    throw new Error(
      `Update catalog package ${entry.id} references an unknown Radio profile`
    )
  }

  return {
    ...entry,
    radioCompatibility: {
      hardwareFieldHashes: profile.hardwareFieldHashes,
      bootloaderFieldHashes: profile.bootloaderFieldHashes,
      modelFieldHashes: profile.modelFieldHashes,
      sourceFirmwareVersions: entry.sourceFirmwareVersions,
    },
  }
}

function findCatalogPackageBySha256(
  sha256: string
): ResolvedCatalogPackage | undefined {
  const entry = catalog.packages.find(
    (candidate) => candidate.sha256.toLowerCase() === sha256.toLowerCase()
  )
  return entry ? findCatalogPackage(entry.sha256, entry.fileType) : undefined
}

function getNormalModeFirmwareVersions() {
  return catalog.normalModeFirmwareVersions
}

function isResourceCatalogPackage(
  entry: ResolvedCatalogPackage
): entry is ResolvedCatalogPackage & {
  readonly kind: Exclude<CatalogPackageKind, "firmware">
  readonly fileType: "dat"
  readonly resource: CatalogResourceFormat
} {
  return entry.fileType === "dat" && entry.resource !== undefined
}

function validateCatalog(value: UpdateCatalog) {
  if (
    value.schemaVersion !== 2 ||
    value.normalModeFirmwareVersions.length === 0
  ) {
    throw new Error("Unsupported or incomplete update catalog schema")
  }

  const profileIds = new Set<string>()
  for (const profile of value.radioProfiles) {
    if (profileIds.has(profile.id)) {
      throw new Error(`Duplicate update Radio profile ${profile.id}`)
    }
    profileIds.add(profile.id)
    for (const hashes of [
      profile.hardwareFieldHashes,
      profile.bootloaderFieldHashes,
      profile.modelFieldHashes,
    ]) {
      if (hashes.length === 0 || hashes.some((hash) => !isSha256(hash))) {
        throw new Error(`Update Radio profile ${profile.id} has invalid hashes`)
      }
    }
  }

  const packageIds = new Set<string>()
  const packageHashes = new Set<string>()
  for (const entry of value.packages) {
    if (packageIds.has(entry.id) || packageHashes.has(entry.sha256)) {
      throw new Error(`Duplicate update catalog package ${entry.id}`)
    }
    packageIds.add(entry.id)
    packageHashes.add(entry.sha256)

    if (!profileIds.has(entry.radioProfileId)) {
      throw new Error(
        `Update catalog package ${entry.id} references an unknown Radio profile`
      )
    }
    if (!isSha256(entry.sha256) || entry.sourceFirmwareVersions.length === 0) {
      throw new Error(`Update catalog package ${entry.id} is incomplete`)
    }
    if (
      !(["disabled", "beta", "stable"] as const).includes(entry.releaseStatus)
    ) {
      throw new Error(
        `Update catalog package ${entry.id} has an invalid release status`
      )
    }
    if (entry.fileType === "fir" && entry.kind !== "firmware") {
      throw new Error(
        `Update catalog package ${entry.id} has a mismatched type`
      )
    }
    if (entry.fileType === "dat") {
      const resource = entry.resource
      if (
        entry.kind === "firmware" ||
        !resource ||
        resource.startAddress < 0 ||
        resource.endAddress <= resource.startAddress ||
        resource.recordCount * 32 !==
          resource.endAddress - resource.startAddress ||
        !/^[0-9a-f]{16}$/i.test(resource.compatibilityPayloadHex) ||
        (resource.recoveryCompatibilityPayloadHex !== undefined &&
          !/^[0-9a-f]{16}$/i.test(resource.recoveryCompatibilityPayloadHex))
      ) {
        throw new Error(
          `Update catalog package ${entry.id} has an invalid resource layout`
        )
      }
    }
  }
}

function isSha256(value: string) {
  return /^[0-9a-f]{64}$/i.test(value)
}

export {
  findCatalogPackage,
  findCatalogPackageBySha256,
  getNormalModeFirmwareVersions,
  isResourceCatalogPackage,
}
export type {
  CatalogFileType,
  CatalogResourceFormat,
  ResolvedCatalogPackage,
  UpdatePrerequisite,
  UpdateRadioCompatibility,
  UpdateReleaseStatus,
  UpdateTargetVersions,
}
