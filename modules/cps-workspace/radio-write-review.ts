import type { Codeplug, CodeplugWriteDerivedChange } from "../codeplug/index.ts"
import type { WorkspaceChange } from "./change-set.ts"

interface RadioWriteReviewItem {
  readonly id: string
  readonly subject: string
  readonly field: string
  readonly before: unknown
  readonly after: unknown
}

function createRadioWriteReview(
  baseline: Codeplug,
  working: Codeplug,
  changes: readonly WorkspaceChange[],
  derivedChanges: readonly CodeplugWriteDerivedChange[] = []
) {
  const review = changes.map((change) =>
    reviewChange(baseline, working, change)
  )
  const derivedReview = derivedChanges.map((change) =>
    Object.freeze({
      id: `derived:${change}`,
      subject: "Write image preparation",
      field:
        change === "mirror-vfo-temporary-channels"
          ? "Mirror VFO temporary channels"
          : "Restore fixed weather channels",
      before: "Working Codeplug",
      after: "Applied to write image",
    })
  )
  return Object.freeze([...review, ...derivedReview])
}

function reviewChange(
  baseline: Codeplug,
  working: Codeplug,
  change: WorkspaceChange
): RadioWriteReviewItem {
  if (change.kind === "imported-working-codeplug") {
    return item(
      change,
      "Imported CPS File",
      "Working Codeplug",
      "Baseline Backup",
      changedBytesLabel(change.changedByteCount)
    )
  }
  if (change.kind === "restore-imported-codeplug") {
    return item(
      change,
      "Imported CPS File",
      "Restore Codeplug",
      "Fresh Radio Read",
      changedBytesLabel(change.changedByteCount)
    )
  }
  if (change.kind === "move-memory-channel") {
    return item(
      change,
      "Memory channel order",
      "Position",
      change.fromNumber,
      change.toNumber
    )
  }
  if (change.kind === "add-memory-channel") {
    return item(
      change,
      `Memory channel ${change.number}`,
      "Channel",
      null,
      working.getChannels()[change.number - 1] ?? null
    )
  }
  if (change.kind === "delete-memory-channel") {
    return item(
      change,
      `Memory channel ${change.number}`,
      "Channel",
      baseline.getChannels()[change.number - 1] ?? null,
      null
    )
  }

  const values = semanticValues(baseline, working, change)
  return item(
    change,
    values.subject,
    "field" in change ? humanize(change.field) : values.field,
    values.before,
    values.after
  )
}

function semanticValues(
  baseline: Codeplug,
  working: Codeplug,
  change: Exclude<
    WorkspaceChange,
    | { readonly kind: "imported-working-codeplug" }
    | { readonly kind: "restore-imported-codeplug" }
    | { readonly kind: "move-memory-channel" }
    | { readonly kind: "add-memory-channel" }
    | { readonly kind: "delete-memory-channel" }
  >
) {
  switch (change.kind) {
    case "edit-memory-channel":
      return fieldValues(
        `Memory channel ${change.number}`,
        baseline.getChannels()[change.number - 1],
        working.getChannels()[change.number - 1],
        change.field
      )
    case "edit-vfo-channel": {
      const index = change.slot === "A" ? 0 : 1
      return fieldValues(
        `VFO ${change.slot}`,
        baseline.getVfoChannels()[index],
        working.getVfoChannels()[index],
        change.field
      )
    }
    case "edit-call-channel":
      return fieldValues(
        `Call channel ${change.slot}`,
        baseline.getCallChannels()[change.slot - 1],
        working.getCallChannels()[change.slot - 1],
        change.field
      )
    case "edit-zone":
      return fieldValues(
        `Zone ${change.number}`,
        baseline.getZones()[change.number - 1],
        working.getZones()[change.number - 1],
        change.field
      )
    case "edit-scan-list":
      return fieldValues(
        `Scan list ${change.number}`,
        baseline.getScanLists()[change.number - 1],
        working.getScanLists()[change.number - 1],
        change.field
      )
    case "edit-band-zone-selection":
      return directValues(
        `Band ${change.band} zone selection`,
        "Selected zones",
        baseline.getBandZoneSelections()[change.band],
        working.getBandZoneSelections()[change.band]
      )
    case "edit-band-scan-list-selection":
      return directValues(
        `Band ${change.band} scan list selection`,
        "Selected scan lists",
        baseline.getBandScanListSelections()[change.band],
        working.getBandScanListSelections()[change.band]
      )
    case "edit-vfo-scan-edge":
      return fieldValues(
        `VFO scan edge ${change.number}`,
        baseline.getVfoScanEdges()[change.number - 1],
        working.getVfoScanEdges()[change.number - 1],
        change.field
      )
    case "edit-vfo-scan-edge-selection":
      return directValues(
        `Band ${change.band} VFO scan edges`,
        "Selected scan edges",
        baseline.getVfoScanEdgeSelections()[change.band],
        working.getVfoScanEdgeSelections()[change.band]
      )
    case "edit-function-setting":
      return fieldValues(
        "Function settings",
        baseline.getFunctionSettings(),
        working.getFunctionSettings(),
        change.field
      )
    case "edit-display-setting":
      return fieldValues(
        "Display settings",
        baseline.getDisplaySettings(),
        working.getDisplaySettings(),
        change.field
      )
    case "edit-sound-setting":
      return fieldValues(
        "Sound settings",
        baseline.getSoundSettings(),
        working.getSoundSettings(),
        change.field
      )
    case "edit-keyboard-setting":
      return fieldValues(
        "Keyboard settings",
        baseline.getKeyboardSettings(),
        working.getKeyboardSettings(),
        change.field
      )
    case "edit-menu-visibility":
      return directValues(
        "Menu visibility",
        humanize(change.id),
        baseline.getMenuVisibility()[change.id],
        working.getMenuVisibility()[change.id]
      )
    case "edit-aprs-setting":
      return fieldValues(
        "APRS settings",
        baseline.getAprsSettings(),
        working.getAprsSettings(),
        change.field
      )
    case "edit-gps-setting":
      return fieldValues(
        "GPS settings",
        baseline.getGpsSettings(),
        working.getGpsSettings(),
        change.field
      )
    case "edit-bluetooth-setting":
      return fieldValues(
        "Bluetooth settings",
        baseline.getBluetoothSettings(),
        working.getBluetoothSettings(),
        change.field
      )
    case "edit-spectrum-setting":
      return fieldValues(
        "Spectrum settings",
        baseline.getSpectrumSettings(),
        working.getSpectrumSettings(),
        change.field
      )
    case "edit-dtmf-setting":
      return fieldValues(
        "DTMF settings",
        baseline.getDtmfSettings(),
        working.getDtmfSettings(),
        change.field
      )
    case "edit-two-tone-setting":
      return fieldValues(
        "2-Tone settings",
        baseline.getTwoToneSettings(),
        working.getTwoToneSettings(),
        change.field
      )
    case "edit-five-tone-setting":
      return fieldValues(
        "5-Tone settings",
        baseline.getFiveToneSettings(),
        working.getFiveToneSettings(),
        change.field
      )
    case "edit-fm-broadcast-channel":
      return fieldValues(
        `FM broadcast channel ${change.number}`,
        baseline.getFmBroadcastChannels()[change.number - 1],
        working.getFmBroadcastChannels()[change.number - 1],
        change.field
      )
    case "edit-fm-broadcast-setting":
      return fieldValues(
        "FM broadcast settings",
        baseline.getFmBroadcastSettings(),
        working.getFmBroadcastSettings(),
        change.field
      )
  }
}

function fieldValues(
  subject: string,
  before: object | undefined,
  after: object | undefined,
  field: string
) {
  return directValues(
    subject,
    humanize(field),
    readField(before, field),
    readField(after, field)
  )
}

function directValues(
  subject: string,
  field: string,
  before: unknown,
  after: unknown
) {
  return { subject, field, before, after }
}

function readField(value: object | undefined, field: string) {
  return value ? (value as Record<string, unknown>)[field] : null
}

function item(
  change: WorkspaceChange,
  subject: string,
  field: string,
  before: unknown,
  after: unknown
): RadioWriteReviewItem {
  const discriminator = Object.entries(change)
    .filter(([key]) => key !== "kind" && key !== "beforeCodeplug")
    .map(([, value]) => String(value))
    .join(":")
  return Object.freeze({
    id: `${change.kind}${discriminator ? `:${discriminator}` : ""}`,
    subject,
    field,
    before,
    after,
  })
}

function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function changedBytesLabel(count: number) {
  return `${count} changed ${count === 1 ? "byte" : "bytes"}`
}

export { createRadioWriteReview }
export type { RadioWriteReviewItem }
