import type {
  BackupHistoryEntry,
  BackupHistoryStore,
} from "../../modules/cps-workspace/index.ts"
import {
  BACKUP_HISTORY_STORE_NAME,
  DEFAULT_DATABASE_NAME,
  openCpsDatabase,
  requestResult,
  transactionComplete,
} from "../indexed-db-cps-database/index.ts"

interface IndexedDbBackupHistoryStoreOptions {
  readonly databaseName?: string
}

class IndexedDbBackupHistoryStore implements BackupHistoryStore {
  readonly #databaseName: string

  constructor(options: IndexedDbBackupHistoryStoreOptions = {}) {
    this.#databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME
  }

  async list() {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        BACKUP_HISTORY_STORE_NAME,
        "readonly"
      )
      const entries = await requestResult<BackupHistoryEntry[]>(
        transaction.objectStore(BACKUP_HISTORY_STORE_NAME).getAll()
      )
      await transactionComplete(transaction)
      return Object.freeze(
        entries
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map(cloneEntry)
      )
    } finally {
      database.close()
    }
  }

  async save(entry: BackupHistoryEntry) {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        BACKUP_HISTORY_STORE_NAME,
        "readwrite"
      )
      transaction.objectStore(BACKUP_HISTORY_STORE_NAME).put(cloneEntry(entry))
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }

  async delete(id: string) {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        BACKUP_HISTORY_STORE_NAME,
        "readwrite"
      )
      transaction.objectStore(BACKUP_HISTORY_STORE_NAME).delete(id)
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }

  async clear() {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        BACKUP_HISTORY_STORE_NAME,
        "readwrite"
      )
      transaction.objectStore(BACKUP_HISTORY_STORE_NAME).clear()
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }
}

function cloneEntry(entry: BackupHistoryEntry): BackupHistoryEntry {
  return Object.freeze({ ...entry, bytes: entry.bytes.slice() })
}

function createIndexedDbBackupHistoryStore(
  options: IndexedDbBackupHistoryStoreOptions = {}
) {
  return new IndexedDbBackupHistoryStore(options)
}

export { IndexedDbBackupHistoryStore, createIndexedDbBackupHistoryStore }
export type { IndexedDbBackupHistoryStoreOptions }
