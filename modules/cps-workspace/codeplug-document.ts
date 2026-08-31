import {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_SIZE,
  createCodeplug,
  type Codeplug,
} from "../codeplug/index.ts"
import type {
  CodeplugBackup,
  CompletedRadioRead,
  WorkingCodeplug,
} from "./index.ts"
import {
  digestBytes,
  type CpsFileManifest,
  type ParsedCpsFile,
} from "./cps-file.ts"

const RAW_CODEPLUG_IMPORT_LAYOUT = Object.freeze({
  id: CODEPLUG_LAYOUT_3_07_23.id,
  firmwareVersion: CODEPLUG_LAYOUT_3_07_23.firmwareVersion,
  byteLength: CODEPLUG_SIZE,
})

interface DocumentCodeplugBackup {
  readonly id: string
  readonly sha256: string
  readonly sourceRadio: CompletedRadioRead["sourceRadio"] | null
  readonly codeplug: Codeplug
  readonly createdAt: Date
}

interface DocumentWorkingCodeplug {
  readonly sourceRadio: CompletedRadioRead["sourceRadio"] | null
  readonly baselineBackup: DocumentCodeplugBackup
  readonly codeplug: Codeplug
}

interface ActiveCodeplugDocument {
  readonly binding: "source-radio" | "cps-file" | "unbound"
  readonly sourceRadio: CompletedRadioRead["sourceRadio"] | null
  readonly baselineBackup: DocumentCodeplugBackup
  readonly workingCodeplug: DocumentWorkingCodeplug
  readonly backupHistory: readonly DocumentCodeplugBackup[]
  readonly cpsFileManifest?: CpsFileManifest
  readonly rawImport?: {
    readonly fileName: string
    readonly importedAt: Date
    readonly byteLength: number
    readonly sha256: string
    readonly layoutId: typeof CODEPLUG_LAYOUT_3_07_23.id
  }
}

type BoundCodeplugDocument = ActiveCodeplugDocument & {
  readonly binding: "source-radio"
  readonly sourceRadio: CompletedRadioRead["sourceRadio"]
  readonly baselineBackup: CodeplugBackup
  readonly workingCodeplug: WorkingCodeplug
}

type CpsFileCodeplugDocument = ActiveCodeplugDocument & {
  readonly binding: "cps-file"
  readonly sourceRadio: CompletedRadioRead["sourceRadio"]
  readonly baselineBackup: CodeplugBackup
  readonly workingCodeplug: WorkingCodeplug
  readonly cpsFileManifest: CpsFileManifest
}

type UnboundCodeplugDocument = ActiveCodeplugDocument & {
  readonly binding: "unbound"
  readonly sourceRadio: null
  readonly rawImport: NonNullable<ActiveCodeplugDocument["rawImport"]>
}

type RawCodeplugImportErrorCode =
  "invalid-extension" | "invalid-size" | "read-failed" | "size-changed"

class RawCodeplugImportError extends Error {
  readonly code: RawCodeplugImportErrorCode

  constructor(
    code: RawCodeplugImportErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "RawCodeplugImportError"
    this.code = code
  }
}

interface RawCodeplugFile {
  readonly name: string
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

function bindRadioRead(read: CompletedRadioRead): BoundCodeplugDocument {
  return Object.freeze({ ...read, binding: "source-radio" })
}

function bindCpsFile(parsed: ParsedCpsFile): CpsFileCodeplugDocument {
  const baselineBackup: CodeplugBackup = Object.freeze({
    id: `cps-import-${parsed.manifest.baseline.sha256.slice(0, 16)}`,
    sha256: parsed.manifest.baseline.sha256,
    sourceRadio: parsed.manifest.sourceRadio,
    codeplug: parsed.baseline,
    createdAt: new Date(parsed.manifest.createdAt),
  })
  const workingCodeplug: WorkingCodeplug = Object.freeze({
    sourceRadio: parsed.manifest.sourceRadio,
    baselineBackup,
    codeplug: parsed.working,
  })

  return Object.freeze({
    binding: "cps-file",
    cpsFileManifest: parsed.manifest,
    sourceRadio: parsed.manifest.sourceRadio,
    baselineBackup,
    workingCodeplug,
    backupHistory: Object.freeze([baselineBackup]),
  })
}

async function importRawCodeplugFile(
  file: RawCodeplugFile,
  importedAt = new Date()
): Promise<UnboundCodeplugDocument> {
  if (!file.name.toLocaleLowerCase("en-US").endsWith(".bin")) {
    throw new RawCodeplugImportError(
      "invalid-extension",
      "Choose a raw Codeplug file with a .bin extension"
    )
  }
  if (file.size !== RAW_CODEPLUG_IMPORT_LAYOUT.byteLength) {
    throw new RawCodeplugImportError(
      "invalid-size",
      `A firmware ${RAW_CODEPLUG_IMPORT_LAYOUT.firmwareVersion} raw Codeplug must contain exactly ${RAW_CODEPLUG_IMPORT_LAYOUT.byteLength.toLocaleString("en-US")} bytes; selected file contains ${file.size.toLocaleString("en-US")}`
    )
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (cause) {
    throw new RawCodeplugImportError(
      "read-failed",
      "The raw Codeplug file could not be read",
      { cause }
    )
  }
  if (buffer.byteLength !== RAW_CODEPLUG_IMPORT_LAYOUT.byteLength) {
    throw new RawCodeplugImportError(
      "size-changed",
      "The raw Codeplug file changed while it was being read"
    )
  }

  const bytes = new Uint8Array(buffer).slice()
  const sha256 = await digestBytes(bytes)
  const baselineBackup: DocumentCodeplugBackup = Object.freeze({
    id: `raw-import-${sha256.slice(0, 16)}`,
    sha256,
    sourceRadio: null,
    codeplug: createCodeplug(bytes),
    createdAt: new Date(importedAt),
  })

  return Object.freeze({
    binding: "unbound",
    sourceRadio: null,
    baselineBackup,
    workingCodeplug: Object.freeze({
      sourceRadio: null,
      baselineBackup,
      codeplug: createCodeplug(bytes),
    }),
    backupHistory: Object.freeze([] as DocumentCodeplugBackup[]),
    rawImport: Object.freeze({
      fileName: file.name,
      importedAt: new Date(importedAt),
      byteLength: bytes.byteLength,
      sha256,
      layoutId: CODEPLUG_LAYOUT_3_07_23.id,
    }),
  })
}

function canPrepareRadioWrite(
  document: ActiveCodeplugDocument | null
): document is BoundCodeplugDocument {
  return document?.binding === "source-radio"
}

function canPrepareImportedRestore(
  document: ActiveCodeplugDocument | null
): document is CpsFileCodeplugDocument {
  return document?.binding === "cps-file"
}

function canExportCpsFile(
  document: ActiveCodeplugDocument | null
): document is BoundCodeplugDocument | CpsFileCodeplugDocument {
  return document !== null && document.binding !== "unbound"
}

function isUnboundCodeplug(
  document: ActiveCodeplugDocument | null
): document is UnboundCodeplugDocument {
  return document?.binding === "unbound"
}

export {
  RawCodeplugImportError,
  RAW_CODEPLUG_IMPORT_LAYOUT,
  bindCpsFile,
  bindRadioRead,
  canExportCpsFile,
  canPrepareImportedRestore,
  canPrepareRadioWrite,
  importRawCodeplugFile,
  isUnboundCodeplug,
}
export type {
  ActiveCodeplugDocument,
  CpsFileCodeplugDocument,
  RawCodeplugFile,
  RawCodeplugImportErrorCode,
  UnboundCodeplugDocument,
}
