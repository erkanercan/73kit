import type { CpsFileManifest } from "./cps-file.ts"

const WORKING_CODEPLUG_DOCUMENT_FORMAT_VERSION = 1
const WORKING_CODEPLUG_NAME_MAX_LENGTH = 80

interface SavedWorkingCodeplug {
  readonly id: string
  readonly formatVersion: typeof WORKING_CODEPLUG_DOCUMENT_FORMAT_VERSION
  readonly name: string
  readonly normalizedName: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly revision: number
  readonly manifest: CpsFileManifest
  readonly cpsFileBytes: Uint8Array
}

interface CreateSavedWorkingCodeplugInput {
  readonly name: string
  readonly manifest: CpsFileManifest
  readonly cpsFileBytes: Uint8Array
  readonly id?: string
  readonly now?: Date
}

interface SavedWorkingCodeplugStore {
  list(): Promise<readonly SavedWorkingCodeplug[]>
  get(id: string): Promise<SavedWorkingCodeplug | null>
  create(entry: SavedWorkingCodeplug): Promise<void>
  rename(id: string, expectedRevision: number, name: string): Promise<void>
  delete(id: string, expectedRevision: number): Promise<void>
}

class WorkingCodeplugLibraryError extends Error {
  readonly code:
    "invalid-name" | "duplicate-name" | "revision-conflict" | "not-found"

  constructor(
    code: WorkingCodeplugLibraryError["code"],
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "WorkingCodeplugLibraryError"
    this.code = code
  }
}

function createSavedWorkingCodeplug(
  input: CreateSavedWorkingCodeplugInput
): SavedWorkingCodeplug {
  const name = validateWorkingCodeplugName(input.name)
  const now = (input.now ?? new Date()).toISOString()

  return Object.freeze({
    id: input.id ?? crypto.randomUUID(),
    formatVersion: WORKING_CODEPLUG_DOCUMENT_FORMAT_VERSION,
    name,
    normalizedName: normalizeWorkingCodeplugName(name),
    createdAt: now,
    updatedAt: now,
    revision: 1,
    manifest: structuredClone(input.manifest),
    cpsFileBytes: input.cpsFileBytes.slice(),
  })
}

function renamedSavedWorkingCodeplug(
  entry: SavedWorkingCodeplug,
  name: string,
  now = new Date()
): SavedWorkingCodeplug {
  const validatedName = validateWorkingCodeplugName(name)
  return Object.freeze({
    ...entry,
    name: validatedName,
    normalizedName: normalizeWorkingCodeplugName(validatedName),
    updatedAt: now.toISOString(),
    revision: entry.revision + 1,
    cpsFileBytes: entry.cpsFileBytes.slice(),
  })
}

function validateWorkingCodeplugName(value: string) {
  const name = value.trim()
  if (name.length === 0 || name.length > WORKING_CODEPLUG_NAME_MAX_LENGTH) {
    throw new WorkingCodeplugLibraryError(
      "invalid-name",
      `Working Codeplug names must contain 1–${WORKING_CODEPLUG_NAME_MAX_LENGTH} characters`
    )
  }
  return name
}

function normalizeWorkingCodeplugName(value: string) {
  return value.trim().toLocaleLowerCase("en-US")
}

export {
  WORKING_CODEPLUG_DOCUMENT_FORMAT_VERSION,
  WORKING_CODEPLUG_NAME_MAX_LENGTH,
  WorkingCodeplugLibraryError,
  createSavedWorkingCodeplug,
  normalizeWorkingCodeplugName,
  renamedSavedWorkingCodeplug,
  validateWorkingCodeplugName,
}
export type {
  CreateSavedWorkingCodeplugInput,
  SavedWorkingCodeplug,
  SavedWorkingCodeplugStore,
}
