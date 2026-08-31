import type { SafeRadioMetadata } from "@/modules/diagnostics/index"
import type { SourceRadio } from "@/modules/uvl15w-radio/index"

function browserDiagnosticEnvironment() {
  return Object.freeze({
    secureContext: window.isSecureContext,
    online: window.navigator.onLine,
    webSerialSupported: "serial" in window.navigator,
    serviceWorkerSupported: "serviceWorker" in window.navigator,
    indexedDbSupported: "indexedDB" in window,
  })
}

function safeRadioMetadata(
  radio: SourceRadio | null | undefined
): SafeRadioMetadata | null {
  if (!radio) return null
  return Object.freeze({
    model: radio.model,
    firmwareVersion: radio.firmwareVersion,
    hardwareVersion: radio.hardwareVersion,
    resourceVersion: radio.imageResourceVersion,
  })
}

export { browserDiagnosticEnvironment, safeRadioMetadata }
