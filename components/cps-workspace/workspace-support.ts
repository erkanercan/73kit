import {
  WebSerialTransportError,
  detectRadioCapability,
  type RadioCapability,
} from "@/adapters/web-serial/index"
import type {
  WorkspaceError,
  WorkspaceErrorKey,
} from "@/components/cps-workspace/workspace-context"
import {
  UnsupportedFirmwareError,
  Uvl15wRadioError,
  type Uvl15wRadioErrorCode,
} from "@/modules/uvl15w-radio/index"

function workspaceError(error: unknown): WorkspaceError {
  if (error instanceof DOMException) {
    const domErrorKeys: Partial<Record<string, WorkspaceErrorKey>> = {
      NotFoundError: "noRadioSelected",
      SecurityError: "serialPermissionDenied",
      NetworkError: "serialPortUnavailable",
      InvalidStateError: "serialPortUnavailable",
    }

    return { key: domErrorKeys[error.name] ?? "unknownRadioError" }
  }

  if (error instanceof WebSerialTransportError) {
    const serialErrorKeys: Record<
      WebSerialTransportError["code"],
      WorkspaceErrorKey
    > = {
      "connection-closed": "serialConnectionClosed",
      "port-selection-required": "serialPortSelectionRequired",
      unavailable: "webSerialUnavailable",
      "streams-unavailable": "serialStreamsUnavailable",
    }

    return { key: serialErrorKeys[error.code] }
  }

  if (error instanceof UnsupportedFirmwareError) {
    return {
      kind: "unsupportedFirmware",
      reason: error.reason,
      detectedVersion: error.detectedVersion,
      validatedVersion: error.validatedVersion,
    }
  }

  if (error instanceof Uvl15wRadioError) {
    if (error.code === "unsupported-firmware") {
      return { message: error.message }
    }

    const radioErrorKeys: Record<
      Exclude<Uvl15wRadioErrorCode, "unsupported-firmware">,
      WorkspaceErrorKey
    > = {
      "already-connected": "radioAlreadyConnected",
      "not-connected": "radioNotConnected",
      "operation-in-progress": "radioOperationInProgress",
      "connection-closed": "radioConnectionClosed",
      "response-timeout": "radioResponseTimeout",
      protocol: "radioProtocolError",
      "incompatible-radio": "incompatibleRadio",
      "read-password-required": "readPasswordRequired",
      "write-password-required": "writePasswordRequired",
      "unexpected-response": "unexpectedRadioResponse",
    }

    return { key: radioErrorKeys[error.code] }
  }

  return error instanceof Error
    ? { message: error.message }
    : { key: "unknownRadioError" }
}

function safeFilename(value: string) {
  const safeValue = value.trim().replace(/[^a-z0-9._-]+/gi, "-")
  return safeValue || "uvl15w"
}

function editedRawFilename(fileName: string) {
  const stem = fileName.replace(/\.bin$/i, "")
  return `${safeFilename(stem)}-edited.bin`
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function downloadBytes(filename: string, bytes: Uint8Array, type: string) {
  const blob = new Blob([bytes.slice().buffer], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function countChangedBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) {
    return Math.max(left.byteLength, right.byteLength)
  }
  let count = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) count += 1
  }
  return count
}

function getRadioCapability(): RadioCapability {
  const serial = (navigator as Navigator & { readonly serial?: unknown }).serial
  return detectRadioCapability(window.isSecureContext, serial)
}

export {
  countChangedBytes,
  downloadBytes,
  downloadText,
  editedRawFilename,
  getRadioCapability,
  safeFilename,
  workspaceError,
}
