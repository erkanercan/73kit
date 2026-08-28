import type { UpdatePackageSummary } from "../update-package/index.ts"
import type {
  UpdateDebugEvent,
  UpdateTransferResult,
} from "../uvl15w-updater/index.ts"

interface UpdateDiagnosticReportInput {
  readonly generatedAt: string
  readonly pageUrl: string
  readonly userAgent: string
  readonly phase: string
  readonly errorCode: string
  readonly selectedPackage: UpdatePackageSummary | null
  readonly progress: {
    readonly percent: number
    readonly completedBlocks: number
    readonly totalBlocks: number
    readonly lastAcknowledgedAddress?: number
  }
  readonly recoveryRecord: unknown
  readonly transferResult: UpdateTransferResult | null
  readonly events: readonly UpdateDebugEvent[]
}

interface UpdateDiagnosticReportFile {
  readonly fileName: string
  readonly mimeType: "application/json"
  readonly content: string
}

function createUpdateDiagnosticReport(
  input: UpdateDiagnosticReportInput
): UpdateDiagnosticReportFile {
  const timestamp = input.generatedAt.replaceAll(":", "-")
  const updatePackage =
    input.selectedPackage ?? recoveryPackageSummary(input.recoveryRecord)
  return {
    fileName: `tyt-uvl15w-update-error-${timestamp}.json`,
    mimeType: "application/json",
    content: `${JSON.stringify(
      {
        schemaVersion: 1,
        product: "TYT UVL-15W Web CPS",
        reportType: "update-error",
        generatedAt: input.generatedAt,
        environment: {
          pageUrl: input.pageUrl,
          userAgent: input.userAgent,
        },
        failure: {
          phase: input.phase,
          errorCode: input.errorCode,
        },
        package: updatePackage
          ? {
              catalogId: updatePackage.catalogId,
              kind: updatePackage.kind,
              fileName: updatePackage.fileName,
              version: updatePackage.version,
              releaseStatus: updatePackage.releaseStatus,
              byteLength: updatePackage.byteLength,
              sha256: updatePackage.sha256,
              blockCount: updatePackage.blockCount,
              targets: updatePackage.targets,
              prerequisites: updatePackage.prerequisites,
              startAddress: updatePackage.startAddress,
              endAddress: updatePackage.endAddress,
            }
          : null,
        progress: input.progress,
        recovery: input.recoveryRecord,
        transferResult: input.transferResult,
        protocolEvents: input.events,
      },
      null,
      2
    )}\n`,
  }
}

function recoveryPackageSummary(value: unknown): UpdatePackageSummary | null {
  if (!value || typeof value !== "object" || !("packageSummary" in value)) {
    return null
  }
  const packageSummary = value.packageSummary
  if (
    !packageSummary ||
    typeof packageSummary !== "object" ||
    !("catalogId" in packageSummary) ||
    !("sha256" in packageSummary)
  ) {
    return null
  }
  return packageSummary as UpdatePackageSummary
}

export { createUpdateDiagnosticReport }
export type { UpdateDiagnosticReportFile, UpdateDiagnosticReportInput }
