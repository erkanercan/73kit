import type { UpdatePackageSummary } from "../update-package/index.ts"
import type { UpdateDebugEvent } from "../uvl15w-updater/index.ts"

const MAX_UPDATE_DIAGNOSTIC_EVENTS = 1_000
const MAX_UPDATE_DIAGNOSTIC_DETAIL_LENGTH = 240

interface UpdateDiagnosticReportInput {
  readonly generatedAt: string
  readonly locale: string
  readonly pathname: string
  readonly environment: {
    readonly secureContext: boolean
    readonly online: boolean
    readonly webSerialSupported: boolean
    readonly serviceWorkerSupported: boolean
    readonly indexedDbSupported: boolean
  }
  readonly phase: string
  readonly errorCode: string
  readonly selectedPackage: UpdatePackageSummary | null
  readonly progress: {
    readonly percent: number
    readonly completedBlocks: number
    readonly totalBlocks: number
    readonly lastAcknowledgedAddress?: number
  }
  readonly recovery: {
    readonly phase: string
    readonly errorCode: string | null
    readonly lastAcknowledgedBlock: number
    readonly lastAcknowledgedAddress?: number
  } | null
  readonly transfer: {
    readonly kind: string
    readonly requiresLanguageConfirmation: boolean
  } | null
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
  return Object.freeze({
    fileName: `tyt-uvl15w-update-error-${timestamp}.json`,
    mimeType: "application/json" as const,
    content: `${JSON.stringify(
      {
        schemaVersion: 2,
        product: "TYT UVL-15W Web CPS",
        reportType: "update-error",
        generatedAt: input.generatedAt,
        locale: input.locale,
        route: safePathname(input.pathname),
        environment: { ...input.environment },
        failure: {
          phase: input.phase,
          errorCode: input.errorCode,
        },
        package: input.selectedPackage
          ? sanitizePackage(input.selectedPackage)
          : null,
        progress: { ...input.progress },
        recovery: input.recovery ? { ...input.recovery } : null,
        transfer: input.transfer ? { ...input.transfer } : null,
        protocolEvents: input.events
          .slice(-MAX_UPDATE_DIAGNOSTIC_EVENTS)
          .map(sanitizeUpdateDebugEvent),
      },
      null,
      2
    )}\n`,
  })
}

function sanitizePackage(updatePackage: UpdatePackageSummary) {
  return Object.freeze({
    catalogId: updatePackage.catalogId,
    kind: updatePackage.kind,
    fileName: updatePackage.fileName,
    version: updatePackage.version,
    releaseStatus: updatePackage.releaseStatus,
    byteLength: updatePackage.byteLength,
    sha256: updatePackage.sha256,
    blockCount: updatePackage.blockCount,
    targets: { ...updatePackage.targets },
    prerequisites: updatePackage.prerequisites.map((item) => ({ ...item })),
    startAddress: updatePackage.startAddress,
    endAddress: updatePackage.endAddress,
  })
}

function sanitizeUpdateDebugEvent(event: UpdateDebugEvent) {
  return Object.freeze({
    sequence: event.sequence,
    elapsedMs: event.elapsedMs,
    kind: event.kind,
    ...(event.direction === undefined ? {} : { direction: event.direction }),
    ...(event.command === undefined ? {} : { command: event.command }),
    ...(event.commandLabel === undefined
      ? {}
      : { commandLabel: event.commandLabel.slice(0, 80) }),
    ...(event.code === undefined ? {} : { code: event.code }),
    detail: event.detail.slice(0, MAX_UPDATE_DIAGNOSTIC_DETAIL_LENGTH),
  })
}

function safePathname(value: string) {
  try {
    return new URL(value, "https://local.invalid").pathname
  } catch {
    return "/"
  }
}

export {
  MAX_UPDATE_DIAGNOSTIC_DETAIL_LENGTH,
  MAX_UPDATE_DIAGNOSTIC_EVENTS,
  createUpdateDiagnosticReport,
  sanitizeUpdateDebugEvent,
}
export type { UpdateDiagnosticReportFile, UpdateDiagnosticReportInput }
