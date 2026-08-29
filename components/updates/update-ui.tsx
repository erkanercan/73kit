"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import type {
  UpdateCoordinatorErrorCode,
  UpdateCoordinatorPhase,
} from "@/components/update-coordinator-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { UpdatePackageKind } from "@/modules/update-package/index"

function PackageKindLabel({ kind }: { readonly kind: UpdatePackageKind }) {
  const t = useTranslations()
  return <span>{packageKindLabel(kind, t)}</span>
}

function packageKindLabel(
  kind: UpdatePackageKind,
  t: ReturnType<typeof useTranslations>
) {
  switch (kind) {
    case "firmware":
      return t("updatesKindFirmware")
    case "language":
      return t("updatesKindLanguage")
    case "image":
      return t("updatesKindImage")
    case "combined":
      return t("updatesKindCombined")
  }
}

function phaseLabel(
  phase: UpdateCoordinatorPhase,
  t: ReturnType<typeof useTranslations>
) {
  switch (phase) {
    case "connecting":
      return t("updatesPhaseConnecting")
    case "handshake":
      return t("updatesPhaseHandshake")
    case "transferring":
      return t("updatesPhaseTransfer")
    case "verifying":
      return t("updatesPhaseVerify")
    case "finalizing":
      return t("updatesPhaseFinalize")
    default:
      return t("updatesTitle")
  }
}

function UpdateErrorAlert({
  code,
}: {
  readonly code: UpdateCoordinatorErrorCode
}) {
  const t = useTranslations()
  return (
    <Alert variant="destructive" className="mt-4">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>{t("updatesStoppedTitle")}</AlertTitle>
      <AlertDescription>{errorMessage(code, t)}</AlertDescription>
    </Alert>
  )
}

function errorMessage(
  code: UpdateCoordinatorErrorCode,
  t: ReturnType<typeof useTranslations>
) {
  switch (code) {
    case "empty":
      return t("updatesErrorEmpty")
    case "extension":
      return t("updatesErrorExtension")
    case "unknown-package":
      return t("updatesErrorUnknownPackage")
    case "package-not-released":
      return t("updatesErrorPackageNotReleased")
    case "firmware-integrity":
      return t("updatesErrorFirmwareIntegrity")
    case "dat-encoding":
    case "dat-record":
    case "dat-address":
      return t("updatesErrorDatInvalid")
    case "operation-busy":
      return t("updatesErrorBusy")
    case "confirmation-required":
      return t("updatesErrorConfirmation")
    case "serial-permission":
      return t("updatesErrorPermission")
    case "serial-unavailable":
      return t("updatesErrorSerial")
    case "connection-closed":
      return t("updatesErrorConnection")
    case "response-timeout":
      return t("updatesErrorTimeout")
    case "incompatible-radio":
      return t("updatesErrorIncompatible")
    case "radio-frame-head":
      return t("updatesErrorFrameHead")
    case "radio-frame-tail":
      return t("updatesErrorFrameTail")
    case "radio-frame-length":
      return t("updatesErrorFrameLength")
    case "radio-frame-lrc":
      return t("updatesErrorFrameLrc")
    case "radio-option-value":
      return t("updatesErrorOptionValue")
    case "unsupported-recovery":
      return t("updatesErrorUnsupportedRecovery")
    case "verification-mismatch":
      return t("updatesErrorVerification")
    case "language-verification-required":
      return t("updatesErrorLanguageVerification")
    case "recovery-package-mismatch":
      return t("updatesErrorRecoveryPackageMismatch")
    case "protocol":
    case "unexpected-response":
      return t("updatesErrorProtocol")
    default:
      return t("updatesErrorUnknown")
  }
}

export { PackageKindLabel, UpdateErrorAlert, packageKindLabel, phaseLabel }
