import type { CodeplugWriteDerivedChange } from "../codeplug/index.ts"
import type { SourceRadio } from "../uvl15w-radio/index.ts"
import type {
  RadioWriteArtifactReference,
  RadioWriteRecoveryRecord,
} from "./radio-write-policy.ts"

interface RadioWriteChangeSnapshot {
  readonly kind: string
  readonly [field: string]: string | number
}

interface PersistedRadioWriteArtifact {
  readonly reference: RadioWriteArtifactReference
  readonly bytes: Uint8Array
}

interface PersistedRadioWriteOperation {
  readonly schemaVersion: 1
  readonly recovery: RadioWriteRecoveryRecord
  readonly sourceRadio: SourceRadio
  readonly changeSet: readonly RadioWriteChangeSnapshot[]
  readonly derivedChanges: readonly CodeplugWriteDerivedChange[]
  readonly artifacts: {
    readonly baselineBackup: PersistedRadioWriteArtifact
    readonly recoveryBackup: PersistedRadioWriteArtifact
    readonly intendedWriteImage: PersistedRadioWriteArtifact
  }
}

interface RadioWriteStore {
  load(): Promise<PersistedRadioWriteOperation | null>
  save(operation: PersistedRadioWriteOperation): Promise<void>
  clear(): Promise<void>
}

export type {
  PersistedRadioWriteArtifact,
  PersistedRadioWriteOperation,
  RadioWriteChangeSnapshot,
  RadioWriteStore,
}
