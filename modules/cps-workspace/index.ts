import { type Codeplug, createCodeplug } from "../codeplug/index.ts"
import {
  createUvl15wRadio,
  type RadioReadOptions,
  type SourceRadio,
  type Uvl15wRadio,
  type Uvl15wRadioOptions,
} from "../uvl15w-radio/index.ts"
import type { RadioTransport } from "../uvl15w-radio/transport.ts"

interface CodeplugBackup {
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
    }

interface CpsWorkspace {
  getSnapshot(): CpsWorkspaceSnapshot
  connect(): Promise<SourceRadio>
  read(options?: RadioReadOptions): Promise<CompletedRadioRead>
  disconnect(): Promise<void>
}

class CpsWorkspaceImplementation implements CpsWorkspace {
  readonly #radio: Uvl15wRadio
  #snapshot: CpsWorkspaceSnapshot = { status: "disconnected" }

  constructor(radio: Uvl15wRadio) {
    this.#radio = radio
  }

  getSnapshot() {
    return this.#snapshot
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
      const baselineBackup = Object.freeze({
        sourceRadio,
        codeplug,
        createdAt: new Date(),
      })
      const workingCodeplug = Object.freeze({
        sourceRadio,
        baselineBackup,
        codeplug: createCodeplug(codeplug.toBytes()),
      })
      const completedRead = Object.freeze({
        sourceRadio,
        baselineBackup,
        workingCodeplug,
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

  async disconnect() {
    await this.#radio.disconnect()
    this.#snapshot = { status: "disconnected" }
  }
}

function createCpsWorkspace(
  transport: RadioTransport,
  radioOptions: Uvl15wRadioOptions = {}
) {
  return new CpsWorkspaceImplementation(
    createUvl15wRadio(transport, radioOptions)
  )
}

export { createCpsWorkspace }
export type {
  CodeplugBackup,
  CompletedRadioRead,
  CpsWorkspace,
  CpsWorkspaceSnapshot,
  WorkingCodeplug,
}
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
