import { evaluateFirmwareCompatibility } from "../uvl15w-radio/index.ts"
import type { SourceRadio } from "../uvl15w-radio/index.ts"
import { CODEPLUG_LAYOUT_3_07_23 } from "../codeplug/index.ts"
import type { CodeplugLayout as RadioWriteLayout } from "../codeplug/index.ts"

interface SourceRadioIdentity {
  readonly model: SourceRadio["model"]
  readonly subModel: number
  readonly cpuId: string
  readonly serialNumber: string
}

type SourceRadioIdentityField = keyof SourceRadioIdentity

type RadioWriteSourceEvaluation =
  | {
      readonly status: "eligible"
      readonly identity: SourceRadioIdentity
      readonly layout: RadioWriteLayout
    }
  | {
      readonly status: "unsupported-firmware"
      readonly detectedVersion: string
    }
  | {
      readonly status: "identity-incomplete"
      readonly missingFields: readonly ("cpuId" | "serialNumber")[]
    }
  | { readonly status: "write-password-required" }

type SourceRadioComparison =
  | { readonly status: "same" }
  | {
      readonly status: "identity-incomplete"
      readonly expectedMissingFields: readonly ("cpuId" | "serialNumber")[]
      readonly candidateMissingFields: readonly ("cpuId" | "serialNumber")[]
    }
  | {
      readonly status: "different"
      readonly differingFields: readonly SourceRadioIdentityField[]
    }

type RadioWritePhase =
  | "preflight-reading"
  | "review-required"
  | "writing-before-first-block"
  | "writing"
  | "awaiting-reconnect"
  | "verifying"
  | "verified"
  | "write-outcome-unknown"

type RadioWriteFailureDisposition = "ordinary-failure" | "write-outcome-unknown"

interface RadioWriteArtifactReference {
  readonly id: string
  readonly sha256: string
  readonly byteLength: number
}

interface PreparedRadioWrite {
  readonly schemaVersion: 1
  readonly sourceRadioIdentity: SourceRadioIdentity
  readonly layout: RadioWriteLayout
  readonly baselineBackup: RadioWriteArtifactReference
  readonly recoveryBackup: RadioWriteArtifactReference
  readonly intendedWriteImage: RadioWriteArtifactReference
  readonly changeSetSha256: string
  readonly preparedAt: string
}

interface RadioWriteRecoveryRecord {
  readonly schemaVersion: 1
  readonly preparedWrite: PreparedRadioWrite
  readonly phase: Exclude<RadioWritePhase, "verified">
  readonly updatedAt: string
  readonly reason?: string
}

type RadioWriteOperationSnapshot =
  | { readonly phase: "preflight-reading" }
  | {
      readonly phase: "review-required"
      readonly preparedWrite: PreparedRadioWrite
    }
  | {
      readonly phase: "writing-before-first-block" | "writing"
      readonly preparedWrite: PreparedRadioWrite
      readonly bytesAcknowledged: number
    }
  | {
      readonly phase: "awaiting-reconnect" | "verifying"
      readonly preparedWrite: PreparedRadioWrite
    }
  | {
      readonly phase: "verified"
      readonly preparedWrite: PreparedRadioWrite
      readonly verifiedBackup: RadioWriteArtifactReference
      readonly verifiedAt: string
    }
  | {
      readonly phase: "write-outcome-unknown"
      readonly recovery: RadioWriteRecoveryRecord
    }

function evaluateRadioWriteSource(
  sourceRadio: SourceRadio
): RadioWriteSourceEvaluation {
  const compatibility = evaluateFirmwareCompatibility(
    sourceRadio.firmwareVersion
  )

  if (
    compatibility.status !== "supported" ||
    compatibility.normalizedVersion !== CODEPLUG_LAYOUT_3_07_23.firmwareVersion
  ) {
    return Object.freeze({
      status: "unsupported-firmware",
      detectedVersion: sourceRadio.firmwareVersion,
    })
  }

  const missingFields = missingIdentityFields(sourceRadio)

  if (missingFields.length > 0) {
    return Object.freeze({
      status: "identity-incomplete",
      missingFields: Object.freeze(missingFields),
    })
  }

  if (sourceRadio.writeProtected) {
    return Object.freeze({ status: "write-password-required" })
  }

  return Object.freeze({
    status: "eligible",
    identity: sourceRadioIdentity(sourceRadio),
    layout: CODEPLUG_LAYOUT_3_07_23,
  })
}

function compareSourceRadios(
  expected: SourceRadio,
  candidate: SourceRadio
): SourceRadioComparison {
  const expectedMissingFields = missingIdentityFields(expected)
  const candidateMissingFields = missingIdentityFields(candidate)

  if (expectedMissingFields.length > 0 || candidateMissingFields.length > 0) {
    return Object.freeze({
      status: "identity-incomplete",
      expectedMissingFields: Object.freeze(expectedMissingFields),
      candidateMissingFields: Object.freeze(candidateMissingFields),
    })
  }

  const expectedIdentity = sourceRadioIdentity(expected)
  const candidateIdentity = sourceRadioIdentity(candidate)
  const fields: readonly SourceRadioIdentityField[] = [
    "model",
    "subModel",
    "cpuId",
    "serialNumber",
  ]
  const differingFields = fields.filter(
    (field) => expectedIdentity[field] !== candidateIdentity[field]
  )

  return differingFields.length === 0
    ? Object.freeze({ status: "same" })
    : Object.freeze({
        status: "different",
        differingFields: Object.freeze(differingFields),
      })
}

function classifyRadioWriteFailure(
  phase: RadioWritePhase
): RadioWriteFailureDisposition {
  switch (phase) {
    case "preflight-reading":
    case "review-required":
    case "writing-before-first-block":
    case "verified":
      return "ordinary-failure"
    case "writing":
    case "awaiting-reconnect":
    case "verifying":
    case "write-outcome-unknown":
      return "write-outcome-unknown"
  }
}

function canCancelRadioWrite(phase: RadioWritePhase) {
  return phase === "preflight-reading" || phase === "review-required"
}

function sourceRadioIdentity(sourceRadio: SourceRadio): SourceRadioIdentity {
  return Object.freeze({
    model: sourceRadio.model,
    subModel: sourceRadio.subModel,
    cpuId: sourceRadio.cpuId,
    serialNumber: sourceRadio.serialNumber,
  })
}

function missingIdentityFields(sourceRadio: SourceRadio) {
  const missingFields: ("cpuId" | "serialNumber")[] = []
  if (sourceRadio.cpuId.length === 0) missingFields.push("cpuId")
  if (sourceRadio.serialNumber.length === 0) missingFields.push("serialNumber")
  return missingFields
}

export {
  canCancelRadioWrite,
  classifyRadioWriteFailure,
  compareSourceRadios,
  evaluateRadioWriteSource,
}
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
}
