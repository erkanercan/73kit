import type {
  BackupHistoryEntry,
  BackupHistoryStore,
} from "../../modules/cps-workspace/index.ts"

class InMemoryBackupHistoryStore implements BackupHistoryStore {
  readonly #entries = new Map<string, BackupHistoryEntry>()

  async list() {
    return Object.freeze(
      [...this.#entries.values()]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(cloneEntry)
    )
  }

  async save(entry: BackupHistoryEntry) {
    this.#entries.set(entry.id, cloneEntry(entry))
  }

  async delete(id: string) {
    this.#entries.delete(id)
  }

  async clear() {
    this.#entries.clear()
  }
}

function cloneEntry(entry: BackupHistoryEntry): BackupHistoryEntry {
  return Object.freeze({ ...entry, bytes: entry.bytes.slice() })
}

export { InMemoryBackupHistoryStore }
