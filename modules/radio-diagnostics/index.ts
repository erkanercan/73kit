import type { RadioDebugEvent } from "../uvl15w-radio/index.ts"

const MAX_RADIO_DIAGNOSTIC_EVENTS = 1_000

interface RadioDiagnosticReportInput {
  readonly generatedAt: string
  readonly locale: string
  readonly pathname: string
  readonly phase: string
  readonly errorCode: string | null
  readonly environment: {
    readonly secureContext: boolean
    readonly online: boolean
    readonly webSerialSupported: boolean
    readonly serviceWorkerSupported: boolean
    readonly indexedDbSupported: boolean
  }
  readonly events: readonly RadioDebugEvent[]
}

interface RadioDiagnosticReportFile {
  readonly fileName: string
  readonly mimeType: "application/json"
  readonly content: string
}

function createRadioDiagnosticReport(
  input: RadioDiagnosticReportInput
): RadioDiagnosticReportFile {
  const timestamp = input.generatedAt.replaceAll(":", "-")
  return Object.freeze({
    fileName: `tyt-uvl15w-radio-diagnostics-${timestamp}.json`,
    mimeType: "application/json" as const,
    content: `${JSON.stringify(
      {
        schemaVersion: 1,
        product: "TYT UVL-15W Web CPS",
        reportType: "radio-diagnostics",
        generatedAt: input.generatedAt,
        locale: input.locale,
        route: safePathname(input.pathname),
        environment: { ...input.environment },
        operation: {
          phase: input.phase,
          errorCode: input.errorCode,
        },
        events: input.events
          .slice(-MAX_RADIO_DIAGNOSTIC_EVENTS)
          .map(sanitizeRadioDebugEvent),
      },
      null,
      2
    )}\n`,
  })
}

function sanitizeRadioDebugEvent(event: RadioDebugEvent) {
  return Object.freeze({
    sequence: event.sequence,
    direction: event.direction,
    command: event.command,
    payloadLength: event.payloadLength,
    ...(event.address === undefined ? {} : { address: event.address }),
    ...(event.dataLength === undefined ? {} : { dataLength: event.dataLength }),
    attempt: event.attempt,
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
  MAX_RADIO_DIAGNOSTIC_EVENTS,
  createRadioDiagnosticReport,
  sanitizeRadioDebugEvent,
}
export type { RadioDiagnosticReportFile, RadioDiagnosticReportInput }
