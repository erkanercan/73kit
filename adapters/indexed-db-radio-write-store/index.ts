import type {
  PersistedRadioWriteOperation,
  RadioWriteStore,
} from "../../modules/cps-workspace/index.ts"
import {
  DEFAULT_DATABASE_NAME,
  RADIO_WRITE_STORE_NAME,
  openCpsDatabase,
  requestResult,
  transactionComplete,
} from "../indexed-db-cps-database/index.ts"

const ACTIVE_OPERATION_KEY = "active"

interface IndexedDbRadioWriteStoreOptions {
  readonly databaseName?: string
}

class IndexedDbRadioWriteStore implements RadioWriteStore {
  readonly #databaseName: string

  constructor(options: IndexedDbRadioWriteStoreOptions = {}) {
    this.#databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME
  }

  async load() {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        RADIO_WRITE_STORE_NAME,
        "readonly"
      )
      const request = transaction
        .objectStore(RADIO_WRITE_STORE_NAME)
        .get(ACTIVE_OPERATION_KEY)
      const value = await requestResult<
        PersistedRadioWriteOperation | undefined
      >(request)
      await transactionComplete(transaction)
      return value ?? null
    } finally {
      database.close()
    }
  }

  async save(operation: PersistedRadioWriteOperation) {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        RADIO_WRITE_STORE_NAME,
        "readwrite"
      )
      transaction
        .objectStore(RADIO_WRITE_STORE_NAME)
        .put(operation, ACTIVE_OPERATION_KEY)
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }

  async clear() {
    const database = await openCpsDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(
        RADIO_WRITE_STORE_NAME,
        "readwrite"
      )
      transaction
        .objectStore(RADIO_WRITE_STORE_NAME)
        .delete(ACTIVE_OPERATION_KEY)
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }
}

function createIndexedDbRadioWriteStore(
  options: IndexedDbRadioWriteStoreOptions = {}
) {
  return new IndexedDbRadioWriteStore(options)
}

export { IndexedDbRadioWriteStore, createIndexedDbRadioWriteStore }
export type { IndexedDbRadioWriteStoreOptions }
