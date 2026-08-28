import type {
  UpdatePrerequisite,
  UpdateRadioCompatibility,
  UpdateReleaseStatus,
  UpdateTargetVersions,
} from "../update-catalog/index.ts"

type ResourcePackageKind = "language" | "image" | "combined"
type UpdatePackageKind = "firmware" | ResourcePackageKind

interface UpdatePackageSummary {
  readonly catalogId: string
  readonly kind: UpdatePackageKind
  readonly fileName: string
  readonly version: string
  readonly releaseStatus: UpdateReleaseStatus
  readonly byteLength: number
  readonly sha256: string
  readonly blockCount: number
  readonly targets: UpdateTargetVersions
  readonly prerequisites: readonly UpdatePrerequisite[]
  readonly startAddress?: number
  readonly endAddress?: number
}

interface ValidatedFirmwarePackage extends UpdatePackageSummary {
  readonly kind: "firmware"
  readonly bytes: Uint8Array
  readonly radioCompatibility: UpdateRadioCompatibility
}

interface ValidatedResourcePackage extends UpdatePackageSummary {
  readonly kind: ResourcePackageKind
  readonly bytes: Uint8Array
  readonly startAddress: number
  readonly endAddress: number
  readonly compatibilityPayload: Uint8Array
  readonly recoveryCompatibilityPayload?: Uint8Array
  readonly radioCompatibility: UpdateRadioCompatibility
}

type ValidatedUpdatePackage =
  ValidatedFirmwarePackage | ValidatedResourcePackage

type UpdatePackageErrorCode =
  | "empty"
  | "extension"
  | "unknown-package"
  | "package-not-released"
  | "firmware-integrity"
  | "dat-encoding"
  | "dat-record"
  | "dat-address"

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
}
