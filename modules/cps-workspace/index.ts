import {
  CODEPLUG_LAYOUT_3_07_23,
  type Codeplug,
  createCodeplug,
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
import type { WorkspaceChange } from "./change-set.ts"
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

interface RadioWriteRecoveryResolution extends CompletedRadioWrite {
  readonly status: "intended-write-verified" | "recovery-backup-confirmed"
}

interface PrepareRadioWriteInput {
  readonly workingCodeplug: WorkingCodeplug
  readonly changeSet: readonly WorkspaceChange[]
}

interface CpsWorkspaceOptions extends Uvl15wRadioOptions {
  readonly radioWriteStore?: RadioWriteStore
}

type CpsWorkspaceRadioWriteErrorCode =
  | "workspace-not-ready"
  | "durable-store-required"
  | "empty-change-set"
  | "baseline-binding-mismatch"
  | "source-radio-ineligible"
  | "source-radio-mismatch"
  | "baseline-drift"
  | "no-prepared-write"
  | "invalid-persisted-operation"
  | "verification-mismatch"
  | "no-recovery"
  | "recovery-unresolved"
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
  executePreparedRadioWrite(): Promise<CompletedRadioWrite>
  restoreRadioWriteRecovery(): Promise<RadioWriteOperationSnapshot | null>
  resolveRadioWriteRecovery(): Promise<RadioWriteRecoveryResolution>
  getRadioWriteSnapshot(): RadioWriteOperationSnapshot | null
  disconnect(): Promise<void>
}

class CpsWorkspaceImplementation implements CpsWorkspace {
  readonly #radio: Uvl15wRadio
  readonly #radioWriteStore: RadioWriteStore | undefined
  #snapshot: CpsWorkspaceSnapshot = { status: "disconnected" }
  #radioWriteSnapshot: RadioWriteOperationSnapshot | null = null
  #persistedRadioWrite: PersistedRadioWriteOperation | null = null

  constructor(radio: Uvl15wRadio, radioWriteStore?: RadioWriteStore) {
    this.#radio = radio
    this.#radioWriteStore = radioWriteStore
  }

  getSnapshot() {
    return this.#snapshot
  }

  getRadioWriteSnapshot() {
    return this.#radioWriteSnapshot
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
        codeplug: createCodeplug(codeplug.toBytes()),
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
    this.#radioWriteSnapshot = { phase: "preflight-reading" }

    try {
      const candidateRadio = await this.#radio.connect()
      assertSameEligibleRadio(this.#snapshot.sourceRadio, candidateRadio)
      const recoveryCodeplug = await this.#radio.read()

      if (!recoveryCodeplug.equals(this.#snapshot.baselineBackup.codeplug)) {
        throw new CpsWorkspaceRadioWriteError(
          "baseline-drift",
          "The preflight Radio Read does not match the Baseline Backup"
        )
      }

      const recoveryBackup = await createCodeplugBackup(
        candidateRadio,
        recoveryCodeplug
      )
      const changeSet = snapshotChangeSet(input.changeSet)
      const preparedAt = new Date().toISOString()
      const intendedWriteImage = Object.freeze({
        id: createArtifactId("write-image"),
        sha256: writeImage.sha256,
        byteLength: writeImage.byteLength,
      })
      const preparedWrite = Object.freeze({
        schemaVersion: 1 as const,
        sourceRadioIdentity: sourceEvaluation.identity,
        layout: CODEPLUG_LAYOUT_3_07_23,
        baselineBackup: artifactReference(this.#snapshot.baselineBackup),
        recoveryBackup: artifactReference(recoveryBackup),
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
      const persisted = Object.freeze({
        schemaVersion: 1 as const,
        recovery,
        sourceRadio: candidateRadio,
        changeSet,
        derivedChanges: writeImage.derivedChanges,
        artifacts: Object.freeze({
          baselineBackup: storedArtifact(
            preparedWrite.baselineBackup,
            this.#snapshot.baselineBackup.codeplug.toBytes()
          ),
          recoveryBackup: storedArtifact(
            preparedWrite.recoveryBackup,
            recoveryCodeplug.toBytes()
          ),
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
      return preparedWrite
    } catch (error) {
      this.#radioWriteSnapshot = null
      await this.#radio.disconnect().catch(() => undefined)
      throw error
    }
  }

  async executePreparedRadioWrite(): Promise<CompletedRadioWrite> {
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
      persisted.artifacts.intendedWriteImage.bytes
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

    let writeCompleted = false

    try {
      const writeRadio = await this.#radio.connect()
      assertSameEligibleRadio(persisted.sourceRadio, writeRadio)
      await this.#persistRadioWritePhase("writing-before-first-block", 0)

      try {
        await this.#radio.write(writeImage, {
          onProgress: async ({ bytesWritten }) => {
            await this.#persistRadioWritePhase("writing", bytesWritten)
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

      writeCompleted = true
      await this.#persistRadioWritePhase("awaiting-reconnect")
      const verificationRadio = await this.#radio.connect()
      assertSameEligibleRadio(persisted.sourceRadio, verificationRadio)
      await this.#persistRadioWritePhase("verifying")
      const verifiedCodeplug = await this.#radio.read()

      if (!verifiedCodeplug.equals(intendedCodeplug)) {
        throw new CpsWorkspaceRadioWriteError(
          "verification-mismatch",
          "The verification Radio Read does not match the intended write image"
        )
      }

      const verifiedBackup = await createCodeplugBackup(
        verificationRadio,
        verifiedCodeplug
      )
      const recoveryBackup = rehydrateBackup(
        persisted.sourceRadio,
        persisted.artifacts.recoveryBackup,
        preparedAt
      )
      const workingCodeplug = Object.freeze({
        sourceRadio: verificationRadio,
        baselineBackup: verifiedBackup,
        codeplug: createCodeplug(verifiedCodeplug.toBytes()),
      })
      const backupHistory = Object.freeze([
        ...existingBackupHistory,
        recoveryBackup,
        verifiedBackup,
      ])
      const completedWrite = Object.freeze({
        sourceRadio: verificationRadio,
        baselineBackup: verifiedBackup,
        workingCodeplug,
        backupHistory,
        preparedWrite: persisted.recovery.preparedWrite,
      })
      const verifiedAt = new Date().toISOString()

      await store.clear()
      this.#persistedRadioWrite = null
      this.#radioWriteSnapshot = {
        phase: "verified",
        preparedWrite: persisted.recovery.preparedWrite,
        verifiedBackup: artifactReference(verifiedBackup),
        verifiedAt,
      }
      this.#snapshot = { status: "ready", ...completedWrite }
      return completedWrite
    } catch (error) {
      await this.#radio.disconnect().catch(() => undefined)
      if (writeCompleted) {
        await this.#persistRadioWriteUnknown(errorMessage(error))
      }
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

    if (persisted.recovery.phase === "review-required") {
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

  async resolveRadioWriteRecovery(): Promise<RadioWriteRecoveryResolution> {
    const persisted = this.#persistedRadioWrite
    const store = this.#radioWriteStore
    if (
      !persisted ||
      !store ||
      this.#radioWriteSnapshot?.phase !== "write-outcome-unknown"
    ) {
      throw new CpsWorkspaceRadioWriteError(
        "no-recovery",
        "No Write Outcome Unknown recovery is available"
      )
    }

    await validatePersistedOperation(persisted)

    try {
      const candidateRadio = await this.#radio.connect()
      assertSameEligibleRadio(persisted.sourceRadio, candidateRadio)
      await this.#persistRadioWritePhase("verifying")
      const codeplug = await this.#radio.read()
      const intendedCodeplug = createCodeplug(
        persisted.artifacts.intendedWriteImage.bytes
      )
      const recoveryCodeplug = createCodeplug(
        persisted.artifacts.recoveryBackup.bytes
      )
      const matchesIntended = codeplug.equals(intendedCodeplug)
      const matchesRecovery = codeplug.equals(recoveryCodeplug)

      if (!matchesIntended && !matchesRecovery) {
        throw new CpsWorkspaceRadioWriteError(
          "recovery-unresolved",
          "The recovery Radio Read matches neither the intended image nor the recovery backup"
        )
      }

      const verifiedBackup = await createCodeplugBackup(
        candidateRadio,
        codeplug
      )
      const preparedAt = new Date(persisted.recovery.preparedWrite.preparedAt)
      const baselineBackup = rehydrateBackup(
        candidateRadio,
        persisted.artifacts.baselineBackup,
        preparedAt
      )
      const recoveryBackup = rehydrateBackup(
        candidateRadio,
        persisted.artifacts.recoveryBackup,
        preparedAt
      )
      const workingCodeplug = Object.freeze({
        sourceRadio: candidateRadio,
        baselineBackup: verifiedBackup,
        codeplug: createCodeplug(codeplug.toBytes()),
      })
      const resolution = Object.freeze({
        status: matchesIntended
          ? ("intended-write-verified" as const)
          : ("recovery-backup-confirmed" as const),
        sourceRadio: candidateRadio,
        baselineBackup: verifiedBackup,
        workingCodeplug,
        backupHistory: Object.freeze([
          baselineBackup,
          recoveryBackup,
          verifiedBackup,
        ]),
        preparedWrite: persisted.recovery.preparedWrite,
      })
      const verifiedAt = new Date().toISOString()

      await store.clear()
      this.#persistedRadioWrite = null
      this.#radioWriteSnapshot = matchesIntended
        ? {
            phase: "verified",
            preparedWrite: persisted.recovery.preparedWrite,
            verifiedBackup: artifactReference(verifiedBackup),
            verifiedAt,
          }
        : null
      this.#snapshot = {
        status: "ready",
        sourceRadio: resolution.sourceRadio,
        baselineBackup: resolution.baselineBackup,
        workingCodeplug: resolution.workingCodeplug,
        backupHistory: resolution.backupHistory,
      }
      return resolution
    } catch (error) {
      await this.#radio.disconnect().catch(() => undefined)
      await this.#persistRadioWriteUnknown(errorMessage(error))
      throw error
    }
  }

  async #persistRadioWritePhase(
    phase:
      | "review-required"
      | "writing-before-first-block"
      | "writing"
      | "awaiting-reconnect"
      | "verifying",
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
}

function createCpsWorkspace(
  transport: RadioTransport,
  options: CpsWorkspaceOptions = {}
) {
  const { radioWriteStore, ...radioOptions } = options
  return new CpsWorkspaceImplementation(
    createUvl15wRadio(transport, radioOptions),
    radioWriteStore
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
  candidate: SourceRadio
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
}

async function validatePersistedOperation(
  operation: PersistedRadioWriteOperation
) {
  try {
    const preparedWrite = operation.recovery.preparedWrite
    const layout = preparedWrite.layout
    if (
      operation.schemaVersion !== 1 ||
      operation.recovery.schemaVersion !== 1 ||
      preparedWrite.schemaVersion !== 1 ||
      layout.id !== CODEPLUG_LAYOUT_3_07_23.id ||
      layout.firmwareVersion !== CODEPLUG_LAYOUT_3_07_23.firmwareVersion ||
      layout.startAddress !== CODEPLUG_LAYOUT_3_07_23.startAddress ||
      layout.endAddress !== CODEPLUG_LAYOUT_3_07_23.endAddress ||
      layout.byteLength !== CODEPLUG_LAYOUT_3_07_23.byteLength ||
      layout.writeBlockSize !== CODEPLUG_LAYOUT_3_07_23.writeBlockSize ||
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
  return Object.freeze({
    id: artifact.reference.id,
    sha256: artifact.reference.sha256,
    sourceRadio,
    codeplug: createCodeplug(artifact.bytes),
    createdAt,
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Radio Write could not be verified"
}

export { CpsWorkspaceRadioWriteError, createCpsWorkspace }
export type {
  CodeplugBackup,
  CompletedRadioWrite,
  CompletedRadioRead,
  CpsWorkspaceOptions,
  CpsWorkspaceRadioWriteErrorCode,
  CpsWorkspace,
  CpsWorkspaceSnapshot,
  PrepareRadioWriteInput,
  RadioWriteRecoveryResolution,
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
