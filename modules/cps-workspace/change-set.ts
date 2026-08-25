import type {
  CallChannelPatch,
  ChannelCollectionPatch,
  Channel,
  Codeplug,
  MemoryChannelPatch,
  RadioBand,
  SpecialChannel,
  VfoChannelPatch,
} from "../codeplug/index.ts"

type WorkspaceChange =
  | {
      readonly kind: "move-memory-channel"
      readonly fromNumber: number
      readonly toNumber: number
    }
  | {
      readonly kind: "edit-memory-channel"
      readonly number: number
      readonly field: keyof MemoryChannelPatch
    }
  | {
      readonly kind: "add-memory-channel"
      readonly number: number
      readonly beforeCodeplug: Codeplug
    }
  | {
      readonly kind: "delete-memory-channel"
      readonly number: number
    }
  | {
      readonly kind: "edit-vfo-channel"
      readonly slot: "A" | "B"
      readonly field: keyof VfoChannelPatch
    }
  | {
      readonly kind: "edit-call-channel"
      readonly slot: 1 | 2
      readonly field: keyof CallChannelPatch
    }
  | {
      readonly kind: "edit-zone"
      readonly number: number
      readonly field: keyof ChannelCollectionPatch
    }
  | {
      readonly kind: "edit-scan-list"
      readonly number: number
      readonly field: keyof ChannelCollectionPatch
    }
  | {
      readonly kind: "edit-band-zone-selection"
      readonly band: RadioBand
    }

type MemoryChannelStructureChange = {
  readonly kind: "add-memory-channel" | "delete-memory-channel"
  readonly number: number
}

function reconcileMemoryChannelStructureChange(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  previousCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  change: MemoryChannelStructureChange
): {
  readonly codeplug: Codeplug
  readonly changes: readonly WorkspaceChange[]
} {
  if (workingCodeplug.equals(baselineCodeplug)) {
    return Object.freeze({ codeplug: workingCodeplug, changes: [] })
  }

  if (change.kind === "delete-memory-channel") {
    const additionIndex = current.findLastIndex(
      (candidate) =>
        candidate.kind === "add-memory-channel" &&
        candidate.number === change.number
    )
    const addition = current[additionIndex]
    const laterChanges = current.slice(additionIndex + 1)

    if (
      addition?.kind === "add-memory-channel" &&
      laterChanges.every(
        (candidate) => candidate.kind === "edit-memory-channel"
      )
    ) {
      let restoredCodeplug = addition.beforeCodeplug
      const retainedLaterChanges = laterChanges.filter(
        (candidate) =>
          candidate.kind === "edit-memory-channel" &&
          candidate.number !== change.number
      )

      for (const candidate of retainedLaterChanges) {
        if (candidate.kind !== "edit-memory-channel") {
          continue
        }
        const channel = previousCodeplug.getChannels()[candidate.number - 1]
        restoredCodeplug = restoredCodeplug.editMemoryChannel(
          candidate.number,
          memoryChannelFieldPatch(channel, candidate.field)
        )
      }

      return Object.freeze({
        codeplug: restoredCodeplug,
        changes: Object.freeze([
          ...current.slice(0, additionIndex),
          ...retainedLaterChanges,
        ]),
      })
    }
  }

  const workspaceChange: WorkspaceChange =
    change.kind === "add-memory-channel"
      ? Object.freeze({
          kind: "add-memory-channel",
          number: change.number,
          beforeCodeplug: previousCodeplug,
        })
      : Object.freeze({
          kind: "delete-memory-channel",
          number: change.number,
        })

  return Object.freeze({
    codeplug: workingCodeplug,
    changes: Object.freeze([...current, workspaceChange]),
  })
}

function memoryChannelFieldPatch(
  channel: Channel,
  field: keyof MemoryChannelPatch
): MemoryChannelPatch {
  return { [field]: channel[field] } as MemoryChannelPatch
}

function reconcileMemoryChannelEditChanges(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  number: number,
  fields: readonly (keyof MemoryChannelPatch)[]
): readonly WorkspaceChange[] {
  if (workingCodeplug.equals(baselineCodeplug)) {
    return Object.freeze([])
  }

  const baselineChannel = baselineCodeplug.getChannels()[number - 1]
  const workingChannel = workingCodeplug.getChannels()[number - 1]
  const affectedFields = new Set(fields)
  const retained = current.filter(
    (change) =>
      change.kind !== "edit-memory-channel" ||
      change.number !== number ||
      !affectedFields.has(change.field)
  )
  const changedFields = fields.filter(
    (field) => !channelFieldEquals(baselineChannel, workingChannel, field)
  )

  return Object.freeze([
    ...retained,
    ...changedFields.map((field) =>
      Object.freeze({
        kind: "edit-memory-channel" as const,
        number,
        field,
      })
    ),
  ])
}

type SpecialChannelEdit =
  | {
      readonly kind: "vfo"
      readonly slot: "A" | "B"
      readonly fields: readonly (keyof VfoChannelPatch)[]
    }
  | {
      readonly kind: "call"
      readonly slot: 1 | 2
      readonly fields: readonly (keyof CallChannelPatch)[]
    }

function reconcileSpecialChannelEditChanges(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  edit: SpecialChannelEdit
): readonly WorkspaceChange[] {
  if (workingCodeplug.equals(baselineCodeplug)) {
    return Object.freeze([])
  }

  const baselineChannels =
    edit.kind === "vfo"
      ? baselineCodeplug.getVfoChannels()
      : baselineCodeplug.getCallChannels()
  const workingChannels =
    edit.kind === "vfo"
      ? workingCodeplug.getVfoChannels()
      : workingCodeplug.getCallChannels()
  const baselineChannel = baselineChannels.find(
    (channel) => channel.slot === edit.slot
  )
  const workingChannel = workingChannels.find(
    (channel) => channel.slot === edit.slot
  )
  if (!baselineChannel || !workingChannel) {
    throw new RangeError(`Unknown ${edit.kind.toUpperCase()} Channel slot`)
  }

  const fields = edit.fields as readonly (keyof CallChannelPatch)[]
  const affectedFields = new Set(fields)
  const retained = current.filter((change) => {
    if (edit.kind === "vfo") {
      return (
        change.kind !== "edit-vfo-channel" ||
        change.slot !== edit.slot ||
        !affectedFields.has(change.field)
      )
    }
    return (
      change.kind !== "edit-call-channel" ||
      change.slot !== edit.slot ||
      !affectedFields.has(change.field)
    )
  })
  const changedFields = fields.filter(
    (field) => !channelRecordFieldEquals(baselineChannel, workingChannel, field)
  )

  return Object.freeze([
    ...retained,
    ...changedFields.map((field) =>
      edit.kind === "vfo"
        ? Object.freeze({
            kind: "edit-vfo-channel" as const,
            slot: edit.slot,
            field: field as keyof VfoChannelPatch,
          })
        : Object.freeze({
            kind: "edit-call-channel" as const,
            slot: edit.slot,
            field,
          })
    ),
  ])
}

function reconcileZoneEditChanges(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  number: number,
  fields: readonly (keyof ChannelCollectionPatch)[]
): readonly WorkspaceChange[] {
  return reconcileChannelCollectionEditChanges(
    current,
    baselineCodeplug,
    workingCodeplug,
    "zone",
    number,
    fields
  )
}

function reconcileScanListEditChanges(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  number: number,
  fields: readonly (keyof ChannelCollectionPatch)[]
): readonly WorkspaceChange[] {
  return reconcileChannelCollectionEditChanges(
    current,
    baselineCodeplug,
    workingCodeplug,
    "scan-list",
    number,
    fields
  )
}

function reconcileChannelCollectionEditChanges(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  kind: "zone" | "scan-list",
  number: number,
  fields: readonly (keyof ChannelCollectionPatch)[]
): readonly WorkspaceChange[] {
  if (workingCodeplug.equals(baselineCodeplug)) {
    return Object.freeze([])
  }

  const baselineCollection =
    kind === "zone"
      ? baselineCodeplug.getZones()[number - 1]
      : baselineCodeplug.getScanLists()[number - 1]
  const workingCollection =
    kind === "zone"
      ? workingCodeplug.getZones()[number - 1]
      : workingCodeplug.getScanLists()[number - 1]
  if (!baselineCollection || !workingCollection) {
    throw new RangeError(
      kind === "zone" ? "Unknown Zone number" : "Unknown Scan List number"
    )
  }

  const affectedFields = new Set(fields)
  const changeKind = kind === "zone" ? "edit-zone" : "edit-scan-list"
  const retained = current.filter(
    (change) =>
      change.kind !== changeKind ||
      change.number !== number ||
      !affectedFields.has(change.field)
  )
  const changedFields = fields.filter((field) => {
    if (field === "channelNumbers") {
      return !numberArraysEqual(
        baselineCollection.channelNumbers,
        workingCollection.channelNumbers
      )
    }
    return baselineCollection.name !== workingCollection.name
  })

  return Object.freeze([
    ...retained,
    ...changedFields.map((field) =>
      kind === "zone"
        ? Object.freeze({ kind: "edit-zone" as const, number, field })
        : Object.freeze({ kind: "edit-scan-list" as const, number, field })
    ),
  ])
}

function reconcileBandZoneSelectionChange(
  current: readonly WorkspaceChange[],
  baselineCodeplug: Codeplug,
  workingCodeplug: Codeplug,
  band: RadioBand
): readonly WorkspaceChange[] {
  if (workingCodeplug.equals(baselineCodeplug)) {
    return Object.freeze([])
  }

  const retained = current.filter(
    (change) =>
      change.kind !== "edit-band-zone-selection" || change.band !== band
  )
  const baseline = baselineCodeplug.getBandZoneSelections()[band]
  const working = workingCodeplug.getBandZoneSelections()[band]

  if (numberArraysEqual(baseline, working)) {
    return Object.freeze(retained)
  }

  return Object.freeze([
    ...retained,
    Object.freeze({ kind: "edit-band-zone-selection" as const, band }),
  ])
}

function numberArraysEqual(left: readonly number[], right: readonly number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function channelFieldEquals(
  baseline: Channel,
  working: Channel,
  field: keyof MemoryChannelPatch
) {
  if (field === "valid" || field === "scan") {
    return baseline[field] === working[field]
  }
  return channelRecordFieldEquals(
    baseline,
    working,
    field as keyof CallChannelPatch
  )
}

function channelRecordFieldEquals(
  baseline: Channel | SpecialChannel,
  working: Channel | SpecialChannel,
  field: keyof CallChannelPatch
) {
  if (field === "optionalSignaling") {
    return (
      baseline.optionalSignaling.kind === working.optionalSignaling.kind &&
      baseline.optionalSignaling.index === working.optionalSignaling.index
    )
  }

  if (field === "transmitTone" || field === "receiveTone") {
    return toneEquals(baseline[field], working[field])
  }

  return baseline[field] === working[field]
}

function toneEquals(
  baseline: Channel["transmitTone"],
  working: Channel["transmitTone"]
) {
  if (baseline.kind !== working.kind) {
    return false
  }
  if (baseline.kind === "off" || baseline.kind === "unknown") {
    return true
  }
  if (working.kind !== baseline.kind) {
    return false
  }
  if (baseline.kind === "ctcss") {
    if (working.kind !== "ctcss") {
      return false
    }
    return (
      baseline.frequencyHz === working.frequencyHz &&
      Boolean(baseline.reverse) === Boolean(working.reverse)
    )
  }
  if (working.kind !== "dcs") {
    return false
  }
  return (
    baseline.code === working.code &&
    Boolean(baseline.reverse) === Boolean(working.reverse)
  )
}

export {
  reconcileBandZoneSelectionChange,
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
  reconcileScanListEditChanges,
  reconcileSpecialChannelEditChanges,
  reconcileZoneEditChanges,
}
export type { WorkspaceChange }
