import { createIndexedDbDiagnosticHistoryStore } from "@/adapters/indexed-db-diagnostic-history-store/index"
import {
  createDiagnosticIncident,
  type CreateDiagnosticIncidentInput,
} from "@/modules/diagnostics/index"

const diagnosticHistoryStore = createIndexedDbDiagnosticHistoryStore()

async function recordDiagnosticIncident(input: CreateDiagnosticIncidentInput) {
  try {
    await diagnosticHistoryStore.save(createDiagnosticIncident(input))
  } catch {
    // Diagnostics must never replace or fail the operation being diagnosed.
  }
}

export { diagnosticHistoryStore, recordDiagnosticIncident }
