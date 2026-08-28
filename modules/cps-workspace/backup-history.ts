import type { SourceRadio } from "../uvl15w-radio/index.ts"

type BackupHistoryOrigin = "radio-read" | "radio-write"

interface BackupHistoryEntry {
  readonly schemaVersion: 1
  readonly id: string
  readonly origin: BackupHistoryOrigin
  readonly sourceRadio: SourceRadio
  readonly createdAt: string
  readonly sha256: string
  readonly byteLength: number
  readonly changeCount: number
  readonly bytes: Uint8Array
}

interface BackupHistoryStore {
  list(): Promise<readonly BackupHistoryEntry[]>
  save(entry: BackupHistoryEntry): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

export type { BackupHistoryEntry, BackupHistoryOrigin, BackupHistoryStore }
