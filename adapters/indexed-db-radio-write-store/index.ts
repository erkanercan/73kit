import type {
  PersistedRadioWriteOperation,
  RadioWriteStore,
} from "../../modules/cps-workspace/index.ts"

const DEFAULT_DATABASE_NAME = "tyt-uvl15-web-cps"
const DATABASE_VERSION = 1
const OBJECT_STORE_NAME = "radio-write-operations"
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
    const database = await openDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readonly")
      const request = transaction
        .objectStore(OBJECT_STORE_NAME)
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
    const database = await openDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite")
      transaction
        .objectStore(OBJECT_STORE_NAME)
        .put(operation, ACTIVE_OPERATION_KEY)
      await transactionComplete(transaction)
    } finally {
      database.close()
    }
  }

  async clear() {
    const database = await openDatabase(this.#databaseName)
    try {
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite")
      transaction.objectStore(OBJECT_STORE_NAME).delete(ACTIVE_OPERATION_KEY)
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

function openDatabase(databaseName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION)

    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        request.result.createObjectStore(OBJECT_STORE_NAME)
      }
    })
    request.addEventListener("success", () => resolve(request.result))
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB could not be opened"))
    })
  })
}

function requestResult<Value>(request: IDBRequest<Value>) {
  return new Promise<Value>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result))
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB request failed"))
    })
  })
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve())
    transaction.addEventListener("abort", () => {
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
    })
    transaction.addEventListener("error", () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed"))
    })
  })
}

export { IndexedDbRadioWriteStore, createIndexedDbRadioWriteStore }
export type { IndexedDbRadioWriteStoreOptions }
