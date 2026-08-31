import {
  pruneDiagnosticIncidents,
  type DiagnosticHistoryStore,
  type DiagnosticIncident,
} from "../../modules/diagnostics/index.ts"
import {
  DEFAULT_DATABASE_NAME,
  DIAGNOSTIC_HISTORY_STORE_NAME,
  openCpsDatabase,
  requestResult,
  transactionComplete,
} from "../indexed-db-cps-database/index.ts"

function createIndexedDbDiagnosticHistoryStore(
  databaseName = DEFAULT_DATABASE_NAME
): DiagnosticHistoryStore {
  return Object.freeze({
    async list() {
      const entries = await readAll(databaseName)
      const retained = pruneDiagnosticIncidents(entries)
      if (retained.length !== entries.length) {
        await replaceAll(databaseName, retained)
      }
      return retained
    },

    async save(incident: DiagnosticIncident) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = database.transaction(
          DIAGNOSTIC_HISTORY_STORE_NAME,
          "readwrite"
        )
        transaction
          .objectStore(DIAGNOSTIC_HISTORY_STORE_NAME)
          .put(cloneIncident(incident))
        await transactionComplete(transaction)
      } finally {
        database.close()
      }
      await replaceAll(
        databaseName,
        pruneDiagnosticIncidents(await readAll(databaseName))
      )
    },

    async delete(id: string) {
      const database = await openCpsDatabase(databaseName)
      try {
        const transaction = database.transaction(
          DIAGNOSTIC_HISTORY_STORE_NAME,
          "readwrite"
        )
        transaction.objectStore(DIAGNOSTIC_HISTORY_STORE_NAME).delete(id)
        await transactionComplete(transaction)
      } finally {
        database.close()
      }
    },

    async clear() {
      await replaceAll(databaseName, [])
    },
  })
}

async function readAll(databaseName: string) {
  const database = await openCpsDatabase(databaseName)
  try {
    const transaction = database.transaction(
      DIAGNOSTIC_HISTORY_STORE_NAME,
      "readonly"
    )
    const entries = await requestResult<DiagnosticIncident[]>(
      transaction.objectStore(DIAGNOSTIC_HISTORY_STORE_NAME).getAll()
    )
    await transactionComplete(transaction)
    return entries.map(cloneIncident)
  } finally {
    database.close()
  }
}

async function replaceAll(
  databaseName: string,
  incidents: readonly DiagnosticIncident[]
) {
  const database = await openCpsDatabase(databaseName)
  try {
    const transaction = database.transaction(
      DIAGNOSTIC_HISTORY_STORE_NAME,
      "readwrite"
    )
    const store = transaction.objectStore(DIAGNOSTIC_HISTORY_STORE_NAME)
    store.clear()
    for (const incident of incidents) store.put(cloneIncident(incident))
    await transactionComplete(transaction)
  } finally {
    database.close()
  }
}

function cloneIncident(incident: DiagnosticIncident): DiagnosticIncident {
  return Object.freeze(structuredClone(incident))
}

export { createIndexedDbDiagnosticHistoryStore }
