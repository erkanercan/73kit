import { analyticsConfig, type AnalyticsMode } from "./config.ts"

const ANALYTICS_STORAGE_KEY = "73kit.analytics.v1"

type AnalyticsPreference = "enabled" | "disabled" | "unset"
type AnalyticsRadioModel = "tyt-uvl15w"
type AnalyticsBinding = "source_radio" | "unbound"
type AnalyticsFileKind = "cps_file" | "raw_bin" | "tyt_pf"
type AnalyticsErrorCategory =
  | "permission"
  | "connection"
  | "unsupported"
  | "integrity"
  | "protocol"
  | "storage"
  | "cancelled"
  | "unknown"
type AnalyticsDurationBucket =
  "under_15s" | "15_to_30s" | "30_to_60s" | "over_60s"
type AnalyticsChangeCountBucket = "1" | "2_to_5" | "6_to_20" | "over_20"
type AnalyticsSection =
  | "overview"
  | "radio"
  | "channels"
  | "zones"
  | "scan_lists"
  | "vfo_scan_edges"
  | "aprs"
  | "gps"
  | "spectrum"
  | "bluetooth"
  | "fm_radio"
  | "signal_system"
  | "radio_settings"
  | "backups"
  | "updates"
  | "diagnostics"
  | "unknown"

interface AnalyticsEventMap {
  serial_capability_checked: {
    radio_model: AnalyticsRadioModel
    supported: boolean
  }
  radio_read_started: {
    radio_model: AnalyticsRadioModel
    intent: "read" | "restore"
  }
  radio_read_completed: {
    radio_model: AnalyticsRadioModel
    compatibility_status: "validated" | "beta"
    duration_bucket: AnalyticsDurationBucket
  }
  radio_read_failed: {
    radio_model: AnalyticsRadioModel
    error_category: AnalyticsErrorCategory
  }
  codeplug_open_completed: {
    radio_model: AnalyticsRadioModel
    file_kind: AnalyticsFileKind
    binding: AnalyticsBinding
  }
  codeplug_open_failed: {
    file_kind: AnalyticsFileKind
    error_category: AnalyticsErrorCategory
  }
  codeplug_edit_started: {
    radio_model: AnalyticsRadioModel
    section: AnalyticsSection
    binding: AnalyticsBinding
  }
  codeplug_exported: {
    file_kind: AnalyticsFileKind
    binding: AnalyticsBinding
  }
  working_codeplug_saved: {
    radio_model: AnalyticsRadioModel
    binding: AnalyticsBinding
  }
  restore_prepared: {
    radio_model: AnalyticsRadioModel
    restore_source: "cps_file" | "backup_history"
    outcome: "success" | "failed"
  }
  radio_write_review_opened: {
    radio_model: AnalyticsRadioModel
    change_count_bucket: AnalyticsChangeCountBucket
  }
  radio_write_started: { radio_model: AnalyticsRadioModel }
  radio_write_completed: {
    radio_model: AnalyticsRadioModel
    duration_bucket: AnalyticsDurationBucket
  }
  radio_write_failed: {
    radio_model: AnalyticsRadioModel
    error_category: AnalyticsErrorCategory
  }
  radio_write_outcome_unknown: {
    radio_model: AnalyticsRadioModel
    error_category: AnalyticsErrorCategory
  }
  update_package_validated: {
    package_kind: "firmware" | "language" | "image" | "combined"
    release_status: "stable" | "beta"
  }
  update_started: {
    package_kind: "firmware" | "language" | "image" | "combined"
    recovery: boolean
  }
  update_completed: {
    package_kind: "firmware" | "language" | "image" | "combined"
    duration_bucket: AnalyticsDurationBucket
  }
  update_failed: {
    package_kind: "firmware" | "language" | "image" | "combined"
    error_category: AnalyticsErrorCategory
  }
  update_outcome_unknown: {
    package_kind: "firmware" | "language" | "image" | "combined"
    error_category: AnalyticsErrorCategory
  }
  diagnostic_report_exported: {
    source: "radio" | "update"
    outcome: "success" | "failed" | "outcome_unknown"
  }
}

interface StoredAnalyticsPreference {
  readonly preference: Exclude<AnalyticsPreference, "unset">
  readonly noticeVersion: number
}

interface AnalyticsResolutionInput {
  readonly configured: boolean
  readonly hostname: string
  readonly storageAvailable: boolean
  readonly preference: AnalyticsPreference
  readonly mode: AnalyticsMode
  readonly doNotTrack: boolean
  readonly globalPrivacyControl: boolean
}

type PropertySchema = "boolean" | readonly string[]

const radioModel = ["tyt-uvl15w"] as const
const duration = ["under_15s", "15_to_30s", "30_to_60s", "over_60s"] as const
const errors = [
  "permission",
  "connection",
  "unsupported",
  "integrity",
  "protocol",
  "storage",
  "cancelled",
  "unknown",
] as const
const packageKinds = ["firmware", "language", "image", "combined"] as const

const eventSchemas = Object.freeze({
  serial_capability_checked: { radio_model: radioModel, supported: "boolean" },
  radio_read_started: { radio_model: radioModel, intent: ["read", "restore"] },
  radio_read_completed: {
    radio_model: radioModel,
    compatibility_status: ["validated", "beta"],
    duration_bucket: duration,
  },
  radio_read_failed: { radio_model: radioModel, error_category: errors },
  codeplug_open_completed: {
    radio_model: radioModel,
    file_kind: ["cps_file", "raw_bin", "tyt_pf"],
    binding: ["source_radio", "unbound"],
  },
  codeplug_open_failed: {
    file_kind: ["cps_file", "raw_bin", "tyt_pf"],
    error_category: errors,
  },
  codeplug_edit_started: {
    radio_model: radioModel,
    section: [
      "overview",
      "radio",
      "channels",
      "zones",
      "scan_lists",
      "vfo_scan_edges",
      "aprs",
      "gps",
      "spectrum",
      "bluetooth",
      "fm_radio",
      "signal_system",
      "radio_settings",
      "backups",
      "updates",
      "diagnostics",
      "unknown",
    ],
    binding: ["source_radio", "unbound"],
  },
  codeplug_exported: {
    file_kind: ["cps_file", "raw_bin", "tyt_pf"],
    binding: ["source_radio", "unbound"],
  },
  working_codeplug_saved: {
    radio_model: radioModel,
    binding: ["source_radio", "unbound"],
  },
  restore_prepared: {
    radio_model: radioModel,
    restore_source: ["cps_file", "backup_history"],
    outcome: ["success", "failed"],
  },
  radio_write_review_opened: {
    radio_model: radioModel,
    change_count_bucket: ["1", "2_to_5", "6_to_20", "over_20"],
  },
  radio_write_started: { radio_model: radioModel },
  radio_write_completed: { radio_model: radioModel, duration_bucket: duration },
  radio_write_failed: { radio_model: radioModel, error_category: errors },
  radio_write_outcome_unknown: {
    radio_model: radioModel,
    error_category: errors,
  },
  update_package_validated: {
    package_kind: packageKinds,
    release_status: ["stable", "beta"],
  },
  update_started: { package_kind: packageKinds, recovery: "boolean" },
  update_completed: { package_kind: packageKinds, duration_bucket: duration },
  update_failed: { package_kind: packageKinds, error_category: errors },
  update_outcome_unknown: {
    package_kind: packageKinds,
    error_category: errors,
  },
  diagnostic_report_exported: {
    source: ["radio", "update"],
    outcome: ["success", "failed", "outcome_unknown"],
  },
} as const satisfies {
  [Event in keyof AnalyticsEventMap]: {
    [Property in keyof AnalyticsEventMap[Event]]: PropertySchema
  }
})

const analyticsEventContract = Object.freeze(
  Object.fromEntries(
    Object.entries(eventSchemas).map(([event, schema]) => [
      event,
      Object.fromEntries(
        Object.entries(schema).map(([property, values]) => [
          property,
          values === "boolean" ? ["true", "false"] : values,
        ])
      ),
    ])
  ) as {
    readonly [Event in keyof AnalyticsEventMap]: {
      readonly [Property in keyof AnalyticsEventMap[Event]]: readonly string[]
    }
  }
)

let runtimeEnabled = false

function isAnalyticsConfigured() {
  if (!analyticsConfig.enabled || !analyticsConfig.websiteId.trim())
    return false
  return isTrustedUmamiScriptUrl(analyticsConfig.scriptUrl)
}

function isTrustedUmamiScriptUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      (url.hostname === "umami.is" || url.hostname.endsWith(".umami.is")) &&
      url.pathname.endsWith(".js")
    )
  } catch {
    return false
  }
}

function readAnalyticsPreference(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(ANALYTICS_STORAGE_KEY)
    if (!raw) {
      return {
        storageAvailable: true,
        preference: "unset" as const,
        noticeVersion: 0,
      }
    }
    const parsed = JSON.parse(raw) as Partial<StoredAnalyticsPreference>
    if (
      (parsed.preference !== "enabled" && parsed.preference !== "disabled") ||
      !Number.isSafeInteger(parsed.noticeVersion) ||
      (parsed.noticeVersion ?? -1) < 0
    ) {
      return {
        storageAvailable: true,
        preference: "unset" as const,
        noticeVersion: 0,
      }
    }
    return {
      storageAvailable: true,
      preference: parsed.preference,
      noticeVersion: parsed.noticeVersion as number,
    }
  } catch {
    return {
      storageAvailable: false,
      preference: "unset" as const,
      noticeVersion: 0,
    }
  }
}

function writeAnalyticsPreference(
  storage: Pick<Storage, "setItem">,
  value: StoredAnalyticsPreference
) {
  try {
    storage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function applyAnalyticsPreference(
  storage: Pick<Storage, "setItem">,
  value: StoredAnalyticsPreference,
  reload: () => void
) {
  setAnalyticsRuntimeEnabled(false)
  if (!writeAnalyticsPreference(storage, value)) return false
  reload()
  return true
}

function resolveAnalyticsEnabled(input: AnalyticsResolutionInput) {
  if (
    !input.configured ||
    input.hostname !== analyticsConfig.allowedDomain ||
    !input.storageAvailable ||
    input.doNotTrack ||
    input.globalPrivacyControl ||
    input.preference === "disabled"
  ) {
    return false
  }
  if (input.preference === "enabled") return true
  return input.mode === "notice-opt-out"
}

function setAnalyticsRuntimeEnabled(enabled: boolean) {
  runtimeEnabled = enabled
}

function trackAnalytics<Event extends keyof AnalyticsEventMap>(
  event: Event,
  properties: AnalyticsEventMap[Event]
) {
  try {
    if (!runtimeEnabled || typeof window === "undefined") return
    if (!validateEvent(event, properties)) return
    window.umami?.track(event, properties)
  } catch {
    // Analytics must never affect an operator workflow.
  }
}

function validateEvent(
  event: string,
  properties: Readonly<Record<string, unknown>>
) {
  const schema = eventSchemas[event as keyof AnalyticsEventMap] as
    Record<string, PropertySchema> | undefined
  if (!schema || Object.keys(properties).length !== Object.keys(schema).length)
    return false
  return Object.entries(schema).every(([key, rule]) => {
    if (!Object.hasOwn(properties, key)) return false
    const value = properties[key]
    return rule === "boolean"
      ? typeof value === "boolean"
      : typeof value === "string" && rule.includes(value)
  })
}

function sanitizeUmamiPayload(type: string, input: unknown) {
  if (type !== "event" || !isRecord(input)) return false
  const payload = { ...input }
  delete payload.screen
  delete payload.language
  delete payload.timestamp

  if (typeof payload.url === "string") {
    payload.url = pathnameOnly(payload.url)
    if (!payload.url) return false
  }
  if (typeof payload.referrer === "string") {
    payload.referrer = referrerOrigin(payload.referrer)
  }

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string" || !isRecord(payload.data))
      return false
    if (!validateEvent(payload.name, payload.data)) return false
  }
  const allowedKeys = new Set([
    "website",
    "hostname",
    "url",
    "title",
    "referrer",
    ...(payload.name === undefined ? [] : ["name", "data"]),
  ])
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) return false
  for (const key of ["website", "hostname", "url", "title", "referrer", "name"])
    if (payload[key] !== undefined && typeof payload[key] !== "string")
      return false
  return payload
}

function pathnameOnly(value: string) {
  try {
    const url = new URL(value, "https://73kit.erkan.dev")
    return url.pathname.startsWith("/") ? url.pathname : null
  } catch {
    return null
  }
}

function referrerOrigin(value: string) {
  if (!value) return ""
  try {
    return new URL(value).origin
  } catch {
    return ""
  }
}

function durationBucket(durationMs: number): AnalyticsDurationBucket {
  if (durationMs < 15_000) return "under_15s"
  if (durationMs < 30_000) return "15_to_30s"
  if (durationMs < 60_000) return "30_to_60s"
  return "over_60s"
}

function changeCountBucket(count: number): AnalyticsChangeCountBucket {
  if (count <= 1) return "1"
  if (count <= 5) return "2_to_5"
  if (count <= 20) return "6_to_20"
  return "over_20"
}

function analyticsSection(pathname: string): AnalyticsSection {
  const normalized = pathname.replace(/^\/(?:en|tr)\//, "/")
  if (normalized.includes("/radio-settings/")) return "radio_settings"
  const segment = normalized.split("/").filter(Boolean).at(-1)
  const sections: Record<string, AnalyticsSection> = {
    radio: "radio",
    channels: "channels",
    zones: "zones",
    "scan-lists": "scan_lists",
    "vfo-scan-edges": "vfo_scan_edges",
    aprs: "aprs",
    gps: "gps",
    spectrum: "spectrum",
    bluetooth: "bluetooth",
    "fm-radio": "fm_radio",
    "signal-system": "signal_system",
    backups: "backups",
    updates: "updates",
    diagnostics: "diagnostics",
  }
  return segment ? (sections[segment] ?? "overview") : "unknown"
}

function errorCategory(value: unknown): AnalyticsErrorCategory {
  const text =
    typeof value === "string"
      ? value
      : isRecord(value) && typeof value.key === "string"
        ? value.key
        : value instanceof Error
          ? `${value.name} ${value.message}`
          : ""
  const normalized = text.toLowerCase()
  if (/notfound|cancel|abort/.test(normalized)) return "cancelled"
  if (/permission|security|denied/.test(normalized)) return "permission"
  if (/unsupported|unavailable|firmware|browser/.test(normalized))
    return "unsupported"
  if (/integrity|hash|package|file|format|encoding/.test(normalized))
    return "integrity"
  if (/storage|indexeddb|quota/.test(normalized)) return "storage"
  if (/network|connect|serial|port|usb|timeout/.test(normalized))
    return "connection"
  if (/protocol|ack|frame|response|write|read/.test(normalized))
    return "protocol"
  return "unknown"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

declare global {
  interface Window {
    umami?: { track(name: string, properties?: Record<string, unknown>): void }
    __73kitUmamiBeforeSend?: (type: string, payload: unknown) => unknown
  }
}

export {
  ANALYTICS_STORAGE_KEY,
  analyticsEventContract,
  applyAnalyticsPreference,
  analyticsSection,
  changeCountBucket,
  durationBucket,
  errorCategory,
  isAnalyticsConfigured,
  isTrustedUmamiScriptUrl,
  readAnalyticsPreference,
  resolveAnalyticsEnabled,
  sanitizeUmamiPayload,
  setAnalyticsRuntimeEnabled,
  trackAnalytics,
  validateEvent,
  writeAnalyticsPreference,
}
export type {
  AnalyticsBinding,
  AnalyticsChangeCountBucket,
  AnalyticsDurationBucket,
  AnalyticsErrorCategory,
  AnalyticsEventMap,
  AnalyticsFileKind,
  AnalyticsPreference,
  AnalyticsRadioModel,
  AnalyticsResolutionInput,
  AnalyticsSection,
  StoredAnalyticsPreference,
}
