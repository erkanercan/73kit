import {
  type Codeplug,
  createCodeplug,
  getCodeplugLayout,
} from "../codeplug/index.ts"
import {
  RadioWriteError,
  createUvl15wRadio,
  type RadioReadOptions,
  type SourceRadio,
  type Uvl15wRadio,
  type Uvl15wRadioOptions,
} from "../uvl15w-radio/index.ts"
import type { RadioTransport } from "../uvl15w-radio/transport.ts"
import { evaluateFirmwareSupport } from "../radio-support/index.ts"
import type { WorkspaceChange } from "./change-set.ts"
import {
  createRadioWriteReview,
  type RadioWriteReviewItem,
} from "./radio-write-review.ts"
import {
  compareSourceRadios,
  evaluateRadioWriteSource,
  type PreparedRadioWrite,
  type RadioWriteOperationSnapshot,
} from "./radio-write-policy.ts"
import type {
  PersistedRadioWriteOperation,
  RadioWriteChangeSnapshot,
  RadioWriteStore,
} from "./radio-write-store.ts"
import type {
  BackupHistoryEntry,
  BackupHistoryOrigin,
  BackupHistoryStore,
} from "./backup-history.ts"

interface CodeplugBackup {
  readonly id: string
  readonly sha256: string
  readonly sourceRadio: SourceRadio
  readonly codeplug: Codeplug
  readonly createdAt: Date
}

interface WorkingCodeplug {
  readonly sourceRadio: SourceRadio
  readonly baselineBackup: CodeplugBackup
  readonly codeplug: Codeplug
}

interface CompletedRadioRead {
  readonly sourceRadio: SourceRadio
  readonly baselineBackup: CodeplugBackup
  readonly workingCodeplug: WorkingCodeplug
  readonly backupHistory: readonly CodeplugBackup[]
}

interface CompletedRadioWrite extends CompletedRadioRead {
  readonly preparedWrite: PreparedRadioWrite
}

interface PrepareRadioWriteInput {
  readonly workingCodeplug: WorkingCodeplug
  readonly changeSet: readonly WorkspaceChange[]
  readonly onProgress?: (
    snapshot: RadioWriteOperationSnapshot
  ) => void | Promise<void>
}

interface ExecuteRadioWriteOptions {
  readonly onProgress?: (
    snapshot: RadioWriteOperationSnapshot
  ) => void | Promise<void>
}

interface CpsWorkspaceOptions extends Uvl15wRadioOptions {
  readonly radioWriteStore?: RadioWriteStore
  readonly backupHistoryStore?: BackupHistoryStore
  readonly onBackupHistoryError?: (
    origin: BackupHistoryOrigin,
    error: unknown
  ) => void
}

type CpsWorkspaceRadioWriteErrorCode =
  | "workspace-not-ready"
  | "durable-store-required"
  | "empty-change-set"
  | "baseline-binding-mismatch"
  | "source-radio-ineligible"
  | "source-radio-mismatch"
  | "no-prepared-write"
  | "invalid-persisted-operation"
  | "persistence-state-missing"

class CpsWorkspaceRadioWriteError extends Error {
  readonly code: CpsWorkspaceRadioWriteErrorCode

  constructor(
    code: CpsWorkspaceRadioWriteErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "CpsWorkspaceRadioWriteError"
    this.code = code
  }
}

type CpsWorkspaceSnapshot =
  | { readonly status: "disconnected" }
  | { readonly status: "connected"; readonly sourceRadio: SourceRadio }
  | { readonly status: "reading"; readonly sourceRadio: SourceRadio }
  | {
      readonly status: "ready"
      readonly sourceRadio: SourceRadio
      readonly baselineBackup: CodeplugBackup
      readonly workingCodeplug: WorkingCodeplug
      readonly backupHistory: readonly CodeplugBackup[]
    }

interface CpsWorkspace {
  getSnapshot(): CpsWorkspaceSnapshot
  connect(): Promise<SourceRadio>
  read(options?: RadioReadOptions): Promise<CompletedRadioRead>
  prepareRadioWrite(input: PrepareRadioWriteInput): Promise<PreparedRadioWrite>
  executePreparedRadioWrite(
    options?: ExecuteRadioWriteOptions
  ): Promise<CompletedRadioWrite>
  restoreRadioWriteRecovery(): Promise<RadioWriteOperationSnapshot | null>
  discardRadioWriteOperation(): Promise<void>
  getRadioWriteSnapshot(): RadioWriteOperationSnapshot | null
  getRadioWriteReview(): readonly RadioWriteReviewItem[]
  disconnect(): Promise<void>
}

class CpsWorkspaceImplementation implements CpsWorkspace {
  readonly #radio: Uvl15wRadio
  readonly #radioWriteStore: RadioWriteStore | undefined
  readonly #backupHistoryStore: BackupHistoryStore | undefined
  readonly #onBackupHistoryError:
    ((origin: BackupHistoryOrigin, error: unknown) => void) | undefined
  #snapshot: CpsWorkspaceSnapshot = { status: "disconnected" }
  #radioWriteSnapshot: RadioWriteOperationSnapshot | null = null
  #persistedRadioWrite: PersistedRadioWriteOperation | null = null

  constructor(
    radio: Uvl15wRadio,
    options: Pick<
      CpsWorkspaceOptions,
      "radioWriteStore" | "backupHistoryStore" | "onBackupHistoryError"
    >
  ) {
    this.#radio = radio
    this.#radioWriteStore = options.radioWriteStore
    this.#backupHistoryStore = options.backupHistoryStore
    this.#onBackupHistoryError = options.onBackupHistoryError
  }

  getSnapshot() {
    return this.#snapshot
  }

  getRadioWriteSnapshot() {
    return this.#radioWriteSnapshot
  }

  getRadioWriteReview() {
    const persisted = this.#persistedRadioWrite
    if (!persisted) return Object.freeze([])
    return createRadioWriteReview(
      createCodeplug(
        persisted.artifacts.baselineBackup.bytes,
        persisted.recovery.preparedWrite.layout.id
      ),
      createCodeplug(
        persisted.artifacts.intendedWriteImage.bytes,
        persisted.recovery.preparedWrite.layout.id
      ),
      persisted.changeSet as readonly WorkspaceChange[],
      persisted.derivedChanges
    )
  }

  async connect() {
    if (this.#snapshot.status !== "disconnected") {
      throw new Error("The CPS Workspace is already connected to a Radio")
    }

    const sourceRadio = await this.#radio.connect()
    this.#snapshot = { status: "connected", sourceRadio }
    return sourceRadio
  }

  async read(options?: RadioReadOptions) {
    if (this.#snapshot.status !== "connected") {
      throw new Error("Connect a Radio before starting a Radio Read")
    }

    const sourceRadio = this.#snapshot.sourceRadio
    this.#snapshot = { status: "reading", sourceRadio }

    try {
      const codeplug = await this.#radio.read(options)
      const baselineBackup = await createCodeplugBackup(sourceRadio, codeplug)
      const workingCodeplug = Object.freeze({
        sourceRadio,
        baselineBackup,
        codeplug: createCodeplug(codeplug.toBytes(), codeplug.layoutId),
      })
      const completedRead = Object.freeze({
        sourceRadio,
        baselineBackup,
        workingCodeplug,
        backupHistory: Object.freeze([baselineBackup]),
      })

      this.#snapshot = {
        status: "ready",
        ...completedRead,
      }
      await this.#saveBackupHistory(baselineBackup, "radio-read", 0)

      return completedRead
    } catch (error) {
      this.#snapshot = { status: "disconnected" }
      await this.#radio.disconnect().catch(() => undefined)
      throw error
    }
  }

  async prepareRadioWrite(input: PrepareRadioWriteInput) {
    if (this.#snapshot.status !== "ready") {
      throw new CpsWorkspaceRadioWriteError(
        "workspace-not-ready",
        "A ready Working Codeplug is required for Radio Write"
      )
    }
    if (!this.#radioWriteStore) {
      throw new CpsWorkspaceRadioWriteError(
        "durable-store-required",
        "Durable Radio Write storage is required"
      )
    }
    if (
      input.changeSet.length === 0 ||
      input.workingCodeplug.codeplug.equals(
        input.workingCodeplug.baselineBackup.codeplug
      )
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "empty-change-set",
        "An empty Change Set cannot be written"
      )
    }
    if (
      input.workingCodeplug.baselineBackup !== this.#snapshot.baselineBackup
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "baseline-binding-mismatch",
        "The Working Codeplug is not based on this Baseline Backup"
      )
    }

    const sourceEvaluation = evaluateRadioWriteSource(
      this.#snapshot.sourceRadio
    )
    if (sourceEvaluation.status !== "eligible") {
      throw new CpsWorkspaceRadioWriteError(
        "source-radio-ineligible",
        `Source Radio is not eligible: ${sourceEvaluation.status}`
      )
    }

    const writeImage =
      await input.workingCodeplug.codeplug.materializeWriteImage(
        sourceEvaluation.layout.id
      )
    const changeSet = snapshotChangeSet(input.changeSet)
    const preparedAt = new Date().toISOString()
    const baselineBackup = artifactReference(this.#snapshot.baselineBackup)
    const intendedWriteImage = Object.freeze({
      id: createArtifactId("write-image"),
      sha256: writeImage.sha256,
      byteLength: writeImage.byteLength,
    })
    const preparedWrite = Object.freeze({
      schemaVersion: 1 as const,
      sourceRadioIdentity: sourceEvaluation.identity,
      supportProfileId: sourceEvaluation.supportProfileId,
      firmwareVersion: sourceEvaluation.firmwareVersion,
      layout: sourceEvaluation.layout,
      baselineBackup,
      recoveryBackup: baselineBackup,
      intendedWriteImage,
      changeSetSha256: await digestJson(changeSet),
      preparedAt,
    })
    const recovery = Object.freeze({
      schemaVersion: 1 as const,
      preparedWrite,
      phase: "review-required" as const,
      updatedAt: preparedAt,
    })
    const baselineBytes = this.#snapshot.baselineBackup.codeplug.toBytes()
    const persisted = Object.freeze({
      schemaVersion: 1 as const,
      recovery,
      sourceRadio: this.#snapshot.sourceRadio,
      changeSet,
      derivedChanges: writeImage.derivedChanges,
      artifacts: Object.freeze({
        baselineBackup: storedArtifact(baselineBackup, baselineBytes),
        recoveryBackup: storedArtifact(baselineBackup, baselineBytes),
        intendedWriteImage: storedArtifact(
          intendedWriteImage,
          writeImage.toBytes()
        ),
      }),
    })

    await this.#radioWriteStore.save(persisted)
    this.#persistedRadioWrite = persisted
    this.#radioWriteSnapshot = {
      phase: "review-required",
      preparedWrite,
    }
    await input.onProgress?.(this.#radioWriteSnapshot)
    return preparedWrite
  }

  async executePreparedRadioWrite(
    options: ExecuteRadioWriteOptions = {}
  ): Promise<CompletedRadioWrite> {
    const persisted = this.#persistedRadioWrite
    const store = this.#radioWriteStore
    if (
      !persisted ||
      !store ||
      this.#radioWriteSnapshot?.phase !== "review-required"
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "no-prepared-write",
        "No reviewed Radio Write is prepared"
      )
    }

    await validatePersistedOperation(persisted)
    const intendedCodeplug = createCodeplug(
      persisted.artifacts.intendedWriteImage.bytes,
      persisted.recovery.preparedWrite.layout.id
    )
    const writeImage = await intendedCodeplug.materializeWriteImage(
      persisted.recovery.preparedWrite.layout.id
    )
    if (
      writeImage.sha256 !==
      persisted.recovery.preparedWrite.intendedWriteImage.sha256
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "invalid-persisted-operation",
        "The persisted intended write image is invalid"
      )
    }

    const preparedAt = new Date(persisted.recovery.preparedWrite.preparedAt)
    const existingBackupHistory =
      this.#snapshot.status === "ready"
        ? this.#snapshot.backupHistory
        : Object.freeze([
            rehydrateBackup(
              persisted.sourceRadio,
              persisted.artifacts.baselineBackup,
              preparedAt
            ),
          ])

    try {
      await this.#persistRadioWritePhase("checking-radio")
      await notifyRadioWriteProgress(options, this.#radioWriteSnapshot)
      const writeRadio = await this.#radio.connect()
      assertSameEligibleRadio(
        persisted.sourceRadio,
        writeRadio,
        persisted.recovery.preparedWrite
      )
      await this.#persistRadioWritePhase("writing-before-first-block", 0)
      await notifyRadioWriteProgress(options, this.#radioWriteSnapshot)

      try {
        await this.#radio.write(writeImage, {
          onProgress: async ({ bytesWritten }) => {
            await this.#persistRadioWritePhase("writing", bytesWritten)
            await notifyRadioWriteProgress(options, this.#radioWriteSnapshot)
          },
        })
      } catch (error) {
        if (
          error instanceof RadioWriteError &&
          error.disposition === "write-outcome-unknown"
        ) {
          await this.#persistRadioWriteUnknown(error.message)
        } else {
          await this.#persistRadioWritePhase("review-required")
        }
        throw error
      }

      await this.#radio.disconnect().catch(() => undefined)
      const completedBackup = Object.freeze({
        id: createArtifactId("backup"),
        sha256: persisted.recovery.preparedWrite.intendedWriteImage.sha256,
        sourceRadio: persisted.sourceRadio,
        codeplug: intendedCodeplug,
        createdAt: new Date(),
      })
      const workingCodeplug = Object.freeze({
        sourceRadio: persisted.sourceRadio,
        baselineBackup: completedBackup,
        codeplug: createCodeplug(
          intendedCodeplug.toBytes(),
          intendedCodeplug.layoutId
        ),
      })
      const backupHistory = Object.freeze([
        ...existingBackupHistory,
        completedBackup,
      ])
      const completedWrite = Object.freeze({
        sourceRadio: persisted.sourceRadio,
        baselineBackup: completedBackup,
        workingCodeplug,
        backupHistory,
        preparedWrite: persisted.recovery.preparedWrite,
      })
      const completedAt = new Date().toISOString()

      await store.clear().catch(() => undefined)
      this.#persistedRadioWrite = null
      this.#radioWriteSnapshot = {
        phase: "completed",
        preparedWrite: persisted.recovery.preparedWrite,
        completedBackup: artifactReference(completedBackup),
        completedAt,
      }
      await notifyRadioWriteProgress(options, this.#radioWriteSnapshot).catch(
        () => undefined
      )
      this.#snapshot = { status: "ready", ...completedWrite }
      await this.#saveBackupHistory(
        completedBackup,
        "radio-write",
        persisted.changeSet.length + persisted.derivedChanges.length
      )
      return completedWrite
    } catch (error) {
      await this.#radio.disconnect().catch(() => undefined)
      if (
        this.#persistedRadioWrite?.recovery.phase !== "write-outcome-unknown"
      ) {
        await this.#persistRadioWritePhase("review-required")
      }
      await notifyRadioWriteProgress(options, this.#radioWriteSnapshot)
      throw error
    }
  }

  async restoreRadioWriteRecovery() {
    const store = this.#radioWriteStore
    if (!store) {
      throw new CpsWorkspaceRadioWriteError(
        "durable-store-required",
        "Durable Radio Write storage is required"
      )
    }

    const persisted = await store.load()
    if (!persisted) {
      this.#persistedRadioWrite = null
      this.#radioWriteSnapshot = null
      return null
    }

    await validatePersistedOperation(persisted)
    this.#persistedRadioWrite = persisted

    if (
      persisted.recovery.phase === "review-required" ||
      persisted.recovery.phase === "checking-radio" ||
      persisted.recovery.phase === "writing-before-first-block"
    ) {
      if (persisted.recovery.phase !== "review-required") {
        await this.#persistRadioWritePhase("review-required")
      }
      this.#radioWriteSnapshot = {
        phase: "review-required",
        preparedWrite: persisted.recovery.preparedWrite,
      }
      return this.#radioWriteSnapshot
    }

    if (persisted.recovery.phase !== "write-outcome-unknown") {
      await this.#persistRadioWriteUnknown(
        `The CPS reloaded during ${persisted.recovery.phase}`
      )
      return this.#radioWriteSnapshot
    }

    this.#radioWriteSnapshot = {
      phase: "write-outcome-unknown",
      recovery: persisted.recovery,
    }
    return this.#radioWriteSnapshot
  }

  async discardRadioWriteOperation() {
    await this.#radioWriteStore?.clear()
    this.#persistedRadioWrite = null
    this.#radioWriteSnapshot = null
  }

  async #persistRadioWritePhase(
    phase:
      | "review-required"
      | "checking-radio"
      | "writing-before-first-block"
      | "writing",
    bytesAcknowledged = 0
  ) {
    const persisted = this.#persistedRadioWrite
    const store = this.#radioWriteStore
    if (!persisted || !store) {
      throw new CpsWorkspaceRadioWriteError(
        "persistence-state-missing",
        "No durable Radio Write operation exists"
      )
    }

    const recovery = Object.freeze({
      schemaVersion: 1 as const,
      preparedWrite: persisted.recovery.preparedWrite,
      phase,
      updatedAt: new Date().toISOString(),
    })
    const next = Object.freeze({ ...persisted, recovery })
    await store.save(next)
    this.#persistedRadioWrite = next
    this.#radioWriteSnapshot =
      phase === "review-required"
        ? { phase, preparedWrite: recovery.preparedWrite }
        : phase === "writing-before-first-block" || phase === "writing"
          ? { phase, preparedWrite: recovery.preparedWrite, bytesAcknowledged }
          : { phase, preparedWrite: recovery.preparedWrite }
  }

  async #persistRadioWriteUnknown(reason: string) {
    const persisted = this.#persistedRadioWrite
    const store = this.#radioWriteStore
    if (!persisted || !store) {
      throw new CpsWorkspaceRadioWriteError(
        "persistence-state-missing",
        "No durable Radio Write operation exists"
      )
    }

    const recovery = Object.freeze({
      schemaVersion: 1 as const,
      preparedWrite: persisted.recovery.preparedWrite,
      phase: "write-outcome-unknown" as const,
      updatedAt: new Date().toISOString(),
      reason,
    })
    const next = Object.freeze({ ...persisted, recovery })
    await store.save(next)
    this.#persistedRadioWrite = next
    this.#radioWriteSnapshot = { phase: "write-outcome-unknown", recovery }
  }

  async disconnect() {
    await this.#radio.disconnect()
    this.#snapshot = { status: "disconnected" }
  }

  async #saveBackupHistory(
    backup: CodeplugBackup,
    origin: BackupHistoryOrigin,
    changeCount: number
  ) {
    if (!this.#backupHistoryStore) return

    const entry = backupHistoryEntry(backup, origin, changeCount)
    try {
      await this.#backupHistoryStore.save(entry)
    } catch (error) {
      this.#onBackupHistoryError?.(origin, error)
    }
  }
}

async function notifyRadioWriteProgress(
  options: ExecuteRadioWriteOptions,
  snapshot: RadioWriteOperationSnapshot | null
) {
  if (snapshot) await options.onProgress?.(snapshot)
}

function createCpsWorkspace(
  transport: RadioTransport,
  options: CpsWorkspaceOptions = {}
) {
  const {
    radioWriteStore,
    backupHistoryStore,
    onBackupHistoryError,
    ...radioOptions
  } = options
  return new CpsWorkspaceImplementation(
    createUvl15wRadio(transport, radioOptions),
    { radioWriteStore, backupHistoryStore, onBackupHistoryError }
  )
}

async function createCodeplugBackup(
  sourceRadio: SourceRadio,
  codeplug: Codeplug
): Promise<CodeplugBackup> {
  return Object.freeze({
    id: createArtifactId("backup"),
    sha256: await digestBytes(codeplug.toBytes()),
    sourceRadio,
    codeplug,
    createdAt: new Date(),
  })
}

function createArtifactId(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`
}

function backupHistoryEntry(
  backup: CodeplugBackup,
  origin: BackupHistoryOrigin,
  changeCount: number
): BackupHistoryEntry {
  const bytes = backup.codeplug.toBytes()
  return Object.freeze({
    schemaVersion: 1 as const,
    id: backup.id,
    origin,
    sourceRadio: backup.sourceRadio,
    createdAt: backup.createdAt.toISOString(),
    sha256: backup.sha256,
    byteLength: bytes.byteLength,
    changeCount,
    bytes,
  })
}

function artifactReference(backup: CodeplugBackup) {
  return Object.freeze({
    id: backup.id,
    sha256: backup.sha256,
    byteLength: backup.codeplug.byteLength,
  })
}

function storedArtifact(
  reference: ReturnType<typeof artifactReference>,
  bytes: Uint8Array
) {
  return Object.freeze({ reference, bytes: bytes.slice() })
}

function snapshotChangeSet(changes: readonly WorkspaceChange[]) {
  return Object.freeze(
    changes.map((change) => {
      const snapshot: Record<string, string | number> = { kind: change.kind }
      for (const [field, value] of Object.entries(change)) {
        if (field !== "beforeCodeplug" && typeof value !== "object") {
          snapshot[field] = value
        }
      }
      return Object.freeze(snapshot) as RadioWriteChangeSnapshot
    })
  )
}

async function digestJson(value: unknown) {
  return digestBytes(new TextEncoder().encode(JSON.stringify(value)))
}

async function digestBytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function assertSameEligibleRadio(
  expected: SourceRadio,
  candidate: SourceRadio,
  preparedWrite: PreparedRadioWrite
) {
  const comparison = compareSourceRadios(expected, candidate)
  if (comparison.status !== "same") {
    throw new CpsWorkspaceRadioWriteError(
      "source-radio-mismatch",
      "The selected Radio is not the Source Radio"
    )
  }
  const evaluation = evaluateRadioWriteSource(candidate)
  if (evaluation.status !== "eligible") {
    throw new CpsWorkspaceRadioWriteError(
      "source-radio-ineligible",
      `Selected Radio is not eligible: ${evaluation.status}`
    )
  }
  const expectedProfile = evaluateFirmwareSupport(
    "tyt-uvl15w",
    expected.firmwareVersion
  )
  const candidateProfile = evaluateFirmwareSupport(
    "tyt-uvl15w",
    candidate.firmwareVersion
  )
  if (
    expectedProfile.id !== preparedWrite.supportProfileId ||
    candidateProfile.id !== preparedWrite.supportProfileId
  ) {
    throw new CpsWorkspaceRadioWriteError(
      "source-radio-mismatch",
      `The Source Radio firmware profile changed from ${expectedProfile.version} to ${candidateProfile.version}`
    )
  }
}

async function validatePersistedOperation(
  operation: PersistedRadioWriteOperation
) {
  try {
    const preparedWrite = operation.recovery.preparedWrite
    const layout = preparedWrite.layout
    const supportedLayout = getCodeplugLayout(layout.id)
    const sourceProfile = evaluateFirmwareSupport(
      "tyt-uvl15w",
      operation.sourceRadio.firmwareVersion
    )
    if (
      operation.schemaVersion !== 1 ||
      operation.recovery.schemaVersion !== 1 ||
      preparedWrite.schemaVersion !== 1 ||
      preparedWrite.supportProfileId !== sourceProfile.id ||
      preparedWrite.firmwareVersion !== sourceProfile.version ||
      sourceProfile.codeplugLayoutId !== layout.id ||
      layout.firmwareVersion !== supportedLayout.firmwareVersion ||
      layout.startAddress !== supportedLayout.startAddress ||
      layout.endAddress !== supportedLayout.endAddress ||
      layout.byteLength !== supportedLayout.byteLength ||
      layout.writeBlockSize !== supportedLayout.writeBlockSize ||
      !Number.isFinite(Date.parse(preparedWrite.preparedAt)) ||
      preparedWrite.changeSetSha256 !==
        (await digestJson(operation.changeSet)) ||
      !sourceRadioMatchesPreparedIdentity(operation.sourceRadio, preparedWrite)
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "invalid-persisted-operation",
        "Persisted Radio Write metadata is invalid"
      )
    }

    const artifactNames = [
      "baselineBackup",
      "recoveryBackup",
      "intendedWriteImage",
    ] as const
    const expectedReferences = {
      baselineBackup: preparedWrite.baselineBackup,
      recoveryBackup: preparedWrite.recoveryBackup,
      intendedWriteImage: preparedWrite.intendedWriteImage,
    }

    for (const name of artifactNames) {
      const artifact = operation.artifacts[name]
      const expectedReference = expectedReferences[name]
      if (
        artifact.reference.id !== expectedReference.id ||
        artifact.reference.sha256 !== expectedReference.sha256 ||
        artifact.reference.byteLength !== expectedReference.byteLength ||
        expectedReference.byteLength !== layout.byteLength ||
        artifact.bytes.byteLength !== artifact.reference.byteLength ||
        (await digestBytes(artifact.bytes)) !== artifact.reference.sha256
      ) {
        throw new CpsWorkspaceRadioWriteError(
          "invalid-persisted-operation",
          `Persisted Radio Write artifact ${artifact.reference.id} is invalid`
        )
      }
    }
  } catch (error) {
    if (error instanceof CpsWorkspaceRadioWriteError) {
      throw error
    }
    throw new CpsWorkspaceRadioWriteError(
      "invalid-persisted-operation",
      "Persisted Radio Write data could not be validated",
      error instanceof Error ? { cause: error } : undefined
    )
  }
}

function sourceRadioMatchesPreparedIdentity(
  sourceRadio: SourceRadio,
  preparedWrite: PreparedRadioWrite
) {
  const identity = preparedWrite.sourceRadioIdentity
  return (
    sourceRadio.model === identity.model &&
    sourceRadio.subModel === identity.subModel &&
    sourceRadio.cpuId === identity.cpuId &&
    sourceRadio.serialNumber === identity.serialNumber
  )
}

function rehydrateBackup(
  sourceRadio: SourceRadio,
  artifact: PersistedRadioWriteOperation["artifacts"]["recoveryBackup"],
  createdAt: Date
): CodeplugBackup {
  const evaluation = evaluateRadioWriteSource(sourceRadio)
  if (evaluation.status !== "eligible") {
    throw new CpsWorkspaceRadioWriteError(
      "invalid-persisted-operation",
      "Persisted Radio Write has an unsupported Source Radio"
    )
  }
  return Object.freeze({
    id: artifact.reference.id,
    sha256: artifact.reference.sha256,
    sourceRadio,
    codeplug: createCodeplug(artifact.bytes, evaluation.layout.id),
    createdAt,
  })
}

export { CpsWorkspaceRadioWriteError, createCpsWorkspace }
export { createRadioWriteReview } from "./radio-write-review.ts"
export type {
  BackupHistoryEntry,
  BackupHistoryOrigin,
  BackupHistoryStore,
} from "./backup-history.ts"
export type {
  CodeplugBackup,
  CompletedRadioWrite,
  CompletedRadioRead,
  CpsWorkspaceOptions,
  CpsWorkspaceRadioWriteErrorCode,
  CpsWorkspace,
  ExecuteRadioWriteOptions,
  CpsWorkspaceSnapshot,
  PrepareRadioWriteInput,
  RadioWriteReviewItem,
  WorkingCodeplug,
}
export type {
  PersistedRadioWriteArtifact,
  PersistedRadioWriteOperation,
  RadioWriteChangeSnapshot,
  RadioWriteStore,
} from "./radio-write-store.ts"
export {
  canCancelRadioWrite,
  classifyRadioWriteFailure,
  compareSourceRadios,
  evaluateRadioWriteSource,
} from "./radio-write-policy.ts"
export type {
  PreparedRadioWrite,
  RadioWriteArtifactReference,
  RadioWriteFailureDisposition,
  RadioWriteLayout,
  RadioWriteOperationSnapshot,
  RadioWritePhase,
  RadioWriteRecoveryRecord,
  RadioWriteSourceEvaluation,
  SourceRadioComparison,
  SourceRadioIdentity,
  SourceRadioIdentityField,
} from "./radio-write-policy.ts"
