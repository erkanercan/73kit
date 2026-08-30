import {
  createCodeplug,
  isUnknownSettingValue,
  type Codeplug,
  type DisplaySettingsPatch,
} from "../codeplug/index.ts"
import type { SourceRadio } from "../uvl15w-radio/index.ts"
import type { BackupHistoryEntry } from "./backup-history.ts"
import {
  reconcileDisplaySettingChanges,
  type WorkspaceChange,
} from "./change-set.ts"
import { digestBytes } from "./cps-file.ts"
import type { CompletedRadioRead } from "./index.ts"
import { compareSourceRadios } from "./radio-write-policy.ts"
import {
  evaluateRestorePlan,
  materializeRestoreTarget,
} from "./restore-plan.ts"

interface RestoreSource {
  readonly createdAt: string
  readonly sourceRadio: SourceRadio
  readonly workingSha256: string
}

type RestorePreparationResult =
  | { readonly status: "already-current" }
  | { readonly status: "restore-ready"; readonly changedByteCount: number }

interface PreparedRestoreDocument {
  readonly completedRead: CompletedRadioRead
  readonly changes: readonly WorkspaceChange[]
  readonly result: RestorePreparationResult
}

async function restoreTargetFromBackup(
  entry: BackupHistoryEntry
): Promise<{ readonly source: RestoreSource; readonly target: Codeplug }> {
  if (entry.byteLength !== entry.bytes.byteLength) {
    throw new Error(
      "Restore blocked: the saved backup has an unexpected byte length."
    )
  }
  if ((await digestBytes(entry.bytes)) !== entry.sha256) {
    throw new Error(
      "Restore blocked: the saved backup failed its integrity check."
    )
  }

  return Object.freeze({
    source: Object.freeze({
      createdAt: entry.createdAt,
      sourceRadio: entry.sourceRadio,
      workingSha256: entry.sha256,
    }),
    target: createCodeplug(entry.bytes),
  })
}

function prepareRestoreDocument(
  source: RestoreSource,
  target: Codeplug,
  freshRead: CompletedRadioRead
): PreparedRestoreDocument {
  if (
    compareSourceRadios(source.sourceRadio, freshRead.sourceRadio).status !==
    "same"
  ) {
    throw new Error(
      "Restore blocked: the selected Radio is not the Source Radio recorded with this saved Codeplug."
    )
  }

  const currentRadioBytes = freshRead.baselineBackup.codeplug.toBytes()
  const restoreTargetBytes = materializeRestoreTarget(
    currentRadioBytes,
    target.toBytes()
  )
  const restorePlan = evaluateRestorePlan(currentRadioBytes, restoreTargetBytes)
  const completedRead: CompletedRadioRead = Object.freeze({
    ...freshRead,
    workingCodeplug: Object.freeze({
      sourceRadio: freshRead.sourceRadio,
      baselineBackup: freshRead.baselineBackup,
      codeplug: createCodeplug(restoreTargetBytes),
    }),
  })
  const result: RestorePreparationResult =
    restorePlan.status === "already-current"
      ? Object.freeze({ status: "already-current" })
      : Object.freeze({
          status: "restore-ready",
          changedByteCount: restorePlan.changedByteCount,
        })
  const changes =
    restorePlan.status === "already-current"
      ? []
      : createRestoreChanges(
          source,
          freshRead.baselineBackup.codeplug,
          completedRead.workingCodeplug.codeplug
        )

  return Object.freeze({ completedRead, changes, result })
}

function createRestoreChanges(
  source: RestoreSource,
  baseline: Codeplug,
  target: Codeplug
): readonly WorkspaceChange[] {
  const targetDisplaySettings = target.getDisplaySettings()
  const displayFields = Object.keys(
    targetDisplaySettings
  ) as (keyof DisplaySettingsPatch)[]
  const displayChanges = reconcileDisplaySettingChanges(
    [],
    baseline,
    target,
    displayFields
  )
  const semanticChanges: WorkspaceChange[] = []
  let explainedTarget = baseline

  for (const change of displayChanges) {
    if (change.kind !== "edit-display-setting") continue
    const value = targetDisplaySettings[change.field]
    if (isUnknownSettingValue(value)) continue

    explainedTarget = explainedTarget.editDisplaySettings({
      [change.field]: value,
    } as DisplaySettingsPatch)
    semanticChanges.push(change)
  }

  const residualChangedByteCount = countChangedBytes(
    explainedTarget.toBytes(),
    target.toBytes()
  )
  if (residualChangedByteCount > 0) {
    semanticChanges.push(
      Object.freeze({
        kind: "restore-imported-codeplug" as const,
        fileCreatedAt: source.createdAt,
        workingSha256: source.workingSha256,
        changedByteCount: residualChangedByteCount,
      })
    )
  }

  return Object.freeze(semanticChanges)
}

function countChangedBytes(before: Uint8Array, after: Uint8Array) {
  let count = 0
  for (let index = 0; index < before.byteLength; index += 1) {
    if (before[index] !== after[index]) count += 1
  }
  return count
}

export { prepareRestoreDocument, restoreTargetFromBackup }
export type { PreparedRestoreDocument, RestorePreparationResult, RestoreSource }
