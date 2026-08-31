const DEFAULT_DATABASE_NAME = "tyt-uvl15-web-cps"
const DATABASE_VERSION = 3
const RADIO_WRITE_STORE_NAME = "radio-write-operations"
const BACKUP_HISTORY_STORE_NAME = "codeplug-backups"
const WORKING_CODEPLUG_STORE_NAME = "working-codeplugs"

function openCpsDatabase(databaseName = DEFAULT_DATABASE_NAME) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION)

    request.addEventListener("upgradeneeded", () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RADIO_WRITE_STORE_NAME)) {
        database.createObjectStore(RADIO_WRITE_STORE_NAME)
      }
      if (!database.objectStoreNames.contains(BACKUP_HISTORY_STORE_NAME)) {
        database.createObjectStore(BACKUP_HISTORY_STORE_NAME, {
          keyPath: "id",
        })
      }
      if (!database.objectStoreNames.contains(WORKING_CODEPLUG_STORE_NAME)) {
        const store = database.createObjectStore(WORKING_CODEPLUG_STORE_NAME, {
          keyPath: "id",
        })
        store.createIndex("normalizedName", "normalizedName", { unique: true })
      }
    })
    request.addEventListener("blocked", () => {
      reject(
        new Error(
          "Close other CPS tabs before upgrading browser Codeplug storage"
        )
      )
    })
    request.addEventListener("success", () => {
      const database = request.result
      database.addEventListener("versionchange", () => database.close())
      resolve(database)
    })
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

export {
  BACKUP_HISTORY_STORE_NAME,
  DEFAULT_DATABASE_NAME,
  RADIO_WRITE_STORE_NAME,
  WORKING_CODEPLUG_STORE_NAME,
  openCpsDatabase,
  requestResult,
  transactionComplete,
}
