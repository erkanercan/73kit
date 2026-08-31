const DIAGNOSTIC_SCHEMA_VERSION = 1
const DIAGNOSTIC_RETENTION_DAYS = 30
const MAX_INCIDENTS_PER_SOURCE = 10
const SUPPORT_EMAIL = "ta4en+erkanercandev@gmail.com"

type DiagnosticSource = "radio" | "update"
type DiagnosticOutcome = "failed" | "outcome-unknown" | "success"

interface SafeRadioMetadata {
  readonly model: string
  readonly firmwareVersion: string
  readonly hardwareVersion: string
  readonly resourceVersion: string
}

interface DiagnosticIncident {
  readonly id: string
  readonly schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION
  readonly source: DiagnosticSource
  readonly operation: string
  readonly outcome: DiagnosticOutcome
  readonly phase: string
  readonly errorCode: string | null
  readonly createdAt: string
  readonly expiresAt: string
  readonly eventCount: number
  readonly radio: SafeRadioMetadata | null
  readonly report: Readonly<Record<string, unknown>>
}

interface CreateDiagnosticIncidentInput {
  readonly id?: string
  readonly createdAt?: string
  readonly source: DiagnosticSource
  readonly operation: string
  readonly outcome: DiagnosticOutcome
  readonly phase: string
  readonly errorCode: string | null
  readonly eventCount: number
  readonly radio?: SafeRadioMetadata | null
  readonly reportContent: string
}

interface DiagnosticHistoryStore {
  list(): Promise<readonly DiagnosticIncident[]>
  save(incident: DiagnosticIncident): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

function createDiagnosticIncident(
  input: CreateDiagnosticIncidentInput
): DiagnosticIncident {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const expiresAt = new Date(
    new Date(createdAt).getTime() +
      DIAGNOSTIC_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  ).toISOString()
  const parsed = JSON.parse(input.reportContent) as unknown
  if (!isRecord(parsed)) {
    throw new TypeError("A diagnostic report must contain a JSON object")
  }

  return Object.freeze({
    id: input.id ?? crypto.randomUUID(),
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    source: input.source,
    operation: input.operation,
    outcome: input.outcome,
    phase: input.phase,
    errorCode: input.errorCode,
    createdAt,
    expiresAt,
    eventCount: Math.max(0, Math.trunc(input.eventCount)),
    radio: input.radio ? Object.freeze({ ...input.radio }) : null,
    report: Object.freeze(structuredClone(parsed)),
  })
}

function pruneDiagnosticIncidents(
  incidents: readonly DiagnosticIncident[],
  now = new Date()
) {
  const active = incidents
    .filter(
      (incident) => new Date(incident.expiresAt).getTime() > now.getTime()
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const retained: DiagnosticIncident[] = []
  const incidentCounts = new Map<DiagnosticSource, number>()
  const successSources = new Set<DiagnosticSource>()

  for (const incident of active) {
    if (incident.outcome === "success") {
      if (successSources.has(incident.source)) continue
      successSources.add(incident.source)
      retained.push(incident)
      continue
    }

    const count = incidentCounts.get(incident.source) ?? 0
    if (count >= MAX_INCIDENTS_PER_SOURCE) continue
    incidentCounts.set(incident.source, count + 1)
    retained.push(incident)
  }

  return Object.freeze(retained)
}

function serializeDiagnosticIncident(incident: DiagnosticIncident) {
  return `${JSON.stringify(incident.report, null, 2)}\n`
}

function diagnosticFileName(incident: DiagnosticIncident) {
  const timestamp = incident.createdAt.replaceAll(":", "-")
  return `73kit-${incident.source}-diagnostics-${timestamp}.json`
}

function diagnosticEmailHref(incident: DiagnosticIncident) {
  const subject = `73Kit support: ${incident.source} ${incident.errorCode ?? incident.outcome}`
  const body = [
    "Hello,",
    "",
    "I need help with a 73Kit operation.",
    "",
    `Operation: ${incident.operation}`,
    `Outcome: ${incident.outcome}`,
    `Error code: ${incident.errorCode ?? "none"}`,
    `Date: ${incident.createdAt}`,
    ...(incident.radio
      ? [
          `Radio: ${incident.radio.model}`,
          `Firmware: ${incident.radio.firmwareVersion}`,
          `Hardware: ${incident.radio.hardwareVersion}`,
          `Resource: ${incident.radio.resourceVersion}`,
        ]
      : []),
    "",
    `Please attach the downloaded report: ${diagnosticFileName(incident)}`,
  ].join("\n")

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export {
  DIAGNOSTIC_RETENTION_DAYS,
  DIAGNOSTIC_SCHEMA_VERSION,
  MAX_INCIDENTS_PER_SOURCE,
  SUPPORT_EMAIL,
  createDiagnosticIncident,
  diagnosticEmailHref,
  diagnosticFileName,
  pruneDiagnosticIncidents,
  serializeDiagnosticIncident,
}
export type {
  CreateDiagnosticIncidentInput,
  DiagnosticHistoryStore,
  DiagnosticIncident,
  DiagnosticOutcome,
  DiagnosticSource,
  SafeRadioMetadata,
}
