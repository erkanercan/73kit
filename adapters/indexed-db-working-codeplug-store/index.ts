import {
  WorkingCodeplugLibraryError,
  renamedSavedWorkingCodeplug,
  type SavedWorkingCodeplug,
  type SavedWorkingCodeplugStore,
} from "../../modules/cps-workspace/working-codeplug-library.ts"
import {
  DEFAULT_DATABASE_NAME,
  WORKING_CODEPLUG_STORE_NAME,
  openCpsDatabase,
  requestResult,
  transactionComplete,
} from "../indexed-db-cps-database/index.ts"

function createIndexedDbWorkingCodeplugStore(
  databaseName = DEFAULT_DATABASE_NAME
): SavedWorkingCodeplugStore {
  const store: SavedWorkingCodeplugStore = {
    async list() {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = database.transaction(
          WORKING_CODEPLUG_STORE_NAME,
          "readonly"
        )
        const entries = await requestResult<SavedWorkingCodeplug[]>(
          transaction.objectStore(WORKING_CODEPLUG_STORE_NAME).getAll()
        )
        await transactionComplete(transaction)
        return Object.freeze(
          entries
            .map(cloneEntry)
            .sort((left, right) =>
              right.updatedAt.localeCompare(left.updatedAt)
            )
        )
      } finally {
        database.close()
      }
    },

    async get(id) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = database.transaction(
          WORKING_CODEPLUG_STORE_NAME,
          "readonly"
        )
        const result = await requestResult<SavedWorkingCodeplug | undefined>(
          transaction.objectStore(WORKING_CODEPLUG_STORE_NAME).get(id)
        )
        await transactionComplete(transaction)
        return result ? cloneEntry(result) : null
      } finally {
        database.close()
      }
    },

    async create(entry) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = strictReadwriteTransaction(database)
        transaction
          .objectStore(WORKING_CODEPLUG_STORE_NAME)
          .add(cloneEntry(entry))
        await completeWithConstraintMapping(transaction)
      } finally {
        database.close()
      }
    },

    async rename(id, expectedRevision, name) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = strictReadwriteTransaction(database)
        const store = transaction.objectStore(WORKING_CODEPLUG_STORE_NAME)
        const current = await requestResult<SavedWorkingCodeplug | undefined>(
          store.get(id)
        )
        if (!current) {
          transaction.abort()
          throw new WorkingCodeplugLibraryError(
            "not-found",
            "The saved Working Codeplug no longer exists"
          )
        }
        if (current.revision !== expectedRevision) {
          transaction.abort()
          throw new WorkingCodeplugLibraryError(
            "revision-conflict",
            "The saved Working Codeplug changed in another tab"
          )
        }
        store.put(cloneEntry(renamedSavedWorkingCodeplug(current, name)))
        await completeWithConstraintMapping(transaction)
      } finally {
        database.close()
      }
    },

    async delete(id, expectedRevision) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = strictReadwriteTransaction(database)
        const store = transaction.objectStore(WORKING_CODEPLUG_STORE_NAME)
        const current = await requestResult<SavedWorkingCodeplug | undefined>(
          store.get(id)
        )
        if (!current) {
          transaction.abort()
          throw new WorkingCodeplugLibraryError(
            "not-found",
            "The saved Working Codeplug no longer exists"
          )
        }
        if (current.revision !== expectedRevision) {
          transaction.abort()
          throw new WorkingCodeplugLibraryError(
            "revision-conflict",
            "The saved Working Codeplug changed in another tab"
          )
        }
        store.delete(id)
        await transactionComplete(transaction)
      } finally {
        database.close()
      }
    },
  }
  return Object.freeze(store)
}

function strictReadwriteTransaction(database: IDBDatabase) {
  return database.transaction(WORKING_CODEPLUG_STORE_NAME, "readwrite", {
    durability: "strict",
  })
}

async function completeWithConstraintMapping(transaction: IDBTransaction) {
  try {
    await transactionComplete(transaction)
  } catch (cause) {
    if (
      transaction.error?.name === "ConstraintError" ||
      (cause instanceof DOMException && cause.name === "ConstraintError")
    ) {
      throw new WorkingCodeplugLibraryError(
        "duplicate-name",
        "A saved Working Codeplug already uses that name",
        { cause }
      )
    }
    throw cause
  }
}

function cloneEntry(entry: SavedWorkingCodeplug): SavedWorkingCodeplug {
  return Object.freeze({
    ...entry,
    manifest: structuredClone(entry.manifest),
    cpsFileBytes: entry.cpsFileBytes.slice(),
  })
}

export { createIndexedDbWorkingCodeplugStore }
