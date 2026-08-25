import type {
  Channel,
  Codeplug,
  MemoryChannelPatch,
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
      laterChanges.every((candidate) => candidate.kind === "edit-memory-channel")
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

function channelFieldEquals(
  baseline: Channel,
  working: Channel,
  field: keyof MemoryChannelPatch
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
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
}
export type { WorkspaceChange }
