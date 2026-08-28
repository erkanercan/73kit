"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FlaskConicalIcon,
  RadioTowerIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { PageHeader } from "@/components/page-header"
import { RadioWriteWorkflow } from "@/components/radio-write/radio-write-workflow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  PreparedRadioWrite,
  RadioWriteOperationSnapshot,
  RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import { CODEPLUG_LAYOUT_3_07_23 } from "@/modules/codeplug/index"
import type { FirmwareCompatibility } from "@/modules/uvl15w-radio/index"
import type { Messages } from "@/dictionaries/en"

type MessageKey = keyof Messages
type ReadStage = "idle" | "handshake" | "reading" | "completed" | "failed"

interface OperationScenario {
  readonly id: string
  readonly label: MessageKey
  readonly group: "success" | "browser" | "connection" | "radio" | "storage"
  readonly error?: MessageKey
  readonly timing?: "start" | "handshake" | "transfer" | "after-transfer"
}

const READ_SCENARIOS = Object.freeze([
  {
    id: "success",
    label: "firmwareDemoScenarioReadSuccess",
    group: "success",
  },
  {
    id: "backup-save-warning",
    label: "firmwareDemoScenarioBackupSave",
    group: "storage",
    error: "backupHistorySaveFailed",
    timing: "after-transfer",
  },
  {
    id: "web-serial-unavailable",
    label: "firmwareDemoScenarioWebSerial",
    group: "browser",
    error: "webSerialUnavailable",
    timing: "start",
  },
  {
    id: "secure-context-required",
    label: "firmwareDemoScenarioSecureContext",
    group: "browser",
    error: "secureContextRequired",
    timing: "start",
  },
  {
    id: "no-radio-selected",
    label: "firmwareDemoScenarioNoRadio",
    group: "browser",
    error: "noRadioSelected",
    timing: "start",
  },
  {
    id: "permission-denied",
    label: "firmwareDemoScenarioPermission",
    group: "browser",
    error: "serialPermissionDenied",
    timing: "start",
  },
  {
    id: "port-selection-required",
    label: "firmwareDemoScenarioPortSelection",
    group: "browser",
    error: "serialPortSelectionRequired",
    timing: "start",
  },
  {
    id: "port-unavailable",
    label: "firmwareDemoScenarioPortUnavailable",
    group: "browser",
    error: "serialPortUnavailable",
    timing: "start",
  },
  {
    id: "streams-unavailable",
    label: "firmwareDemoScenarioStreams",
    group: "browser",
    error: "serialStreamsUnavailable",
    timing: "start",
  },
  {
    id: "serial-connection-closed",
    label: "firmwareDemoScenarioSerialClosed",
    group: "connection",
    error: "serialConnectionClosed",
    timing: "handshake",
  },
  {
    id: "already-connected",
    label: "firmwareDemoScenarioAlreadyConnected",
    group: "connection",
    error: "radioAlreadyConnected",
    timing: "start",
  },
  {
    id: "not-connected",
    label: "firmwareDemoScenarioNotConnected",
    group: "connection",
    error: "radioNotConnected",
    timing: "start",
  },
  {
    id: "operation-in-progress",
    label: "firmwareDemoScenarioBusy",
    group: "connection",
    error: "radioOperationInProgress",
    timing: "start",
  },
  {
    id: "radio-connection-closed",
    label: "firmwareDemoScenarioRadioClosed",
    group: "connection",
    error: "radioConnectionClosed",
    timing: "transfer",
  },
  {
    id: "response-timeout-handshake",
    label: "firmwareDemoScenarioTimeoutHandshake",
    group: "connection",
    error: "radioResponseTimeout",
    timing: "handshake",
  },
  {
    id: "response-timeout-reading",
    label: "firmwareDemoScenarioTimeoutTransfer",
    group: "connection",
    error: "radioResponseTimeout",
    timing: "transfer",
  },
  {
    id: "protocol-error",
    label: "firmwareDemoScenarioProtocol",
    group: "radio",
    error: "radioProtocolError",
    timing: "transfer",
  },
  {
    id: "incompatible-radio",
    label: "firmwareDemoScenarioWrongModel",
    group: "radio",
    error: "incompatibleRadio",
    timing: "handshake",
  },
  {
    id: "unsupported-firmware",
    label: "firmwareDemoScenarioFirmware",
    group: "radio",
    error: "firmwareCompatibilityStopped",
    timing: "handshake",
  },
  {
    id: "read-password-required",
    label: "firmwareDemoScenarioReadPassword",
    group: "radio",
    error: "readPasswordRequired",
    timing: "handshake",
  },
  {
    id: "unexpected-response",
    label: "firmwareDemoScenarioUnexpected",
    group: "radio",
    error: "unexpectedRadioResponse",
    timing: "transfer",
  },
  {
    id: "unknown-error",
    label: "firmwareDemoScenarioUnknown",
    group: "radio",
    error: "unknownRadioError",
    timing: "handshake",
  },
] satisfies readonly OperationScenario[])

const WRITE_SCENARIOS = Object.freeze([
  {
    id: "success",
    label: "firmwareDemoScenarioWriteSuccess",
    group: "success",
  },
  {
    id: "backup-save-warning",
    label: "firmwareDemoScenarioBackupSave",
    group: "storage",
    error: "backupHistorySaveFailed",
    timing: "after-transfer",
  },
  ...READ_SCENARIOS.filter((scenario) =>
    ["browser", "connection"].includes(scenario.group)
  ),
  {
    id: "incompatible-radio",
    label: "firmwareDemoScenarioWrongModel",
    group: "radio",
    error: "incompatibleRadio",
    timing: "handshake",
  },
  {
    id: "unsupported-firmware",
    label: "firmwareDemoScenarioFirmware",
    group: "radio",
    error: "firmwareCompatibilityStopped",
    timing: "handshake",
  },
  {
    id: "source-radio-mismatch",
    label: "firmwareDemoScenarioSourceMismatch",
    group: "radio",
    error: "firmwareDemoSourceMismatch",
    timing: "handshake",
  },
  {
    id: "source-identity-incomplete",
    label: "firmwareDemoScenarioIdentityIncomplete",
    group: "radio",
    error: "firmwareDemoIdentityIncomplete",
    timing: "handshake",
  },
  {
    id: "write-password-required",
    label: "firmwareDemoScenarioWritePassword",
    group: "radio",
    error: "writePasswordRequired",
    timing: "handshake",
  },
  {
    id: "protocol-before-write",
    label: "firmwareDemoScenarioProtocolBeforeWrite",
    group: "radio",
    error: "radioProtocolError",
    timing: "handshake",
  },
  {
    id: "unexpected-before-write",
    label: "firmwareDemoScenarioUnexpectedBeforeWrite",
    group: "radio",
    error: "unexpectedRadioResponse",
    timing: "handshake",
  },
  {
    id: "disconnect-writing",
    label: "firmwareDemoScenarioDisconnectWriting",
    group: "radio",
    error: "radioConnectionClosed",
    timing: "transfer",
  },
  {
    id: "timeout-writing",
    label: "firmwareDemoScenarioTimeoutWriting",
    group: "radio",
    error: "radioResponseTimeout",
    timing: "transfer",
  },
  {
    id: "protocol-writing",
    label: "firmwareDemoScenarioProtocolWriting",
    group: "radio",
    error: "radioProtocolError",
    timing: "transfer",
  },
  {
    id: "unexpected-writing",
    label: "firmwareDemoScenarioUnexpectedWriting",
    group: "radio",
    error: "unexpectedRadioResponse",
    timing: "transfer",
  },
  {
    id: "reboot-timeout",
    label: "firmwareDemoScenarioRebootTimeout",
    group: "radio",
    error: "radioResponseTimeout",
    timing: "after-transfer",
  },
  {
    id: "reboot-invalid",
    label: "firmwareDemoScenarioRebootInvalid",
    group: "radio",
    error: "unexpectedRadioResponse",
    timing: "after-transfer",
  },
  {
    id: "unknown-error-writing",
    label: "firmwareDemoScenarioUnknownWriting",
    group: "radio",
    error: "unknownRadioError",
    timing: "transfer",
  },
] satisfies readonly OperationScenario[])

const GROUP_LABELS = {
  success: "firmwareDemoScenarioGroupSuccess",
  browser: "firmwareDemoScenarioGroupBrowser",
  connection: "firmwareDemoScenarioGroupConnection",
  radio: "firmwareDemoScenarioGroupRadio",
  storage: "firmwareDemoScenarioGroupStorage",
} as const satisfies Record<OperationScenario["group"], MessageKey>

interface RadioOperationSimulatorProps {
  readonly firmwareVersion: string
  readonly compatibility: FirmwareCompatibility
  onFirmwareVersionChange(version: string): void
}

function RadioOperationSimulator({
  firmwareVersion,
  compatibility,
  onFirmwareVersionChange,
}: RadioOperationSimulatorProps) {
  const t = useTranslations()
  const message = React.useCallback(
    (key: MessageKey) => String(t.raw(key)),
    [t]
  )
  const timers = React.useRef<number[]>([])
  const [readScenarioId, setReadScenarioId] = React.useState("success")
  const [writeScenarioId, setWriteScenarioId] = React.useState("success")
  const [readStage, setReadStage] = React.useState<ReadStage>("idle")
  const [readProgress, setReadProgress] = React.useState(0)
  const [readError, setReadError] = React.useState<MessageKey | null>(null)
  const [readWarning, setReadWarning] = React.useState<MessageKey | null>(null)
  const [hasWorkingCodeplug, setHasWorkingCodeplug] = React.useState(false)
  const [writeSnapshot, setWriteSnapshot] =
    React.useState<RadioWriteOperationSnapshot | null>(null)
  const [writeError, setWriteError] = React.useState<MessageKey | null>(null)
  const [writeWarning, setWriteWarning] = React.useState<MessageKey | null>(
    null
  )
  const [writeBusy, setWriteBusy] = React.useState(false)

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])

  const later = React.useCallback((delay: number, action: () => void) => {
    const timer = window.setTimeout(action, delay)
    timers.current.push(timer)
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const selectedReadScenario =
    READ_SCENARIOS.find((scenario) => scenario.id === readScenarioId) ??
    READ_SCENARIOS[0]
  const selectedWriteScenario =
    WRITE_SCENARIOS.find((scenario) => scenario.id === writeScenarioId) ??
    WRITE_SCENARIOS[0]

  const runRead = () => {
    clearTimers()
    setReadError(null)
    setReadWarning(null)
    setHasWorkingCodeplug(false)
    setWriteSnapshot(null)
    setWriteError(null)
    setWriteWarning(null)
    setReadProgress(0)

    if (selectedReadScenario.timing === "start") {
      setReadStage("failed")
      setReadError(selectedReadScenario.error ?? "unknownRadioError")
      return
    }

    setReadStage("handshake")
    later(500, () => {
      if (
        selectedReadScenario.timing === "handshake" ||
        compatibility.status !== "supported"
      ) {
        setReadStage("failed")
        setReadError(
          compatibility.status !== "supported"
            ? "firmwareCompatibilityStopped"
            : (selectedReadScenario.error ?? "unknownRadioError")
        )
        return
      }

      setReadStage("reading")
      for (const [index, progress] of [20, 40, 60, 80, 100].entries()) {
        later(350 * (index + 1), () => {
          setReadProgress(progress)
          if (progress === 40 && selectedReadScenario.timing === "transfer") {
            clearTimers()
            setReadStage("failed")
            setReadError(selectedReadScenario.error ?? "unknownRadioError")
          } else if (progress === 100) {
            setReadStage("completed")
            setHasWorkingCodeplug(true)
            if (selectedReadScenario.timing === "after-transfer") {
              setReadWarning(
                selectedReadScenario.error ?? "backupHistorySaveFailed"
              )
            }
          }
        })
      }
    })
  }

  const prepareWrite = () => {
    clearTimers()
    setWriteError(null)
    setWriteWarning(null)
    if (selectedWriteScenario.timing === "start") {
      setWriteSnapshot(null)
      setWriteError(selectedWriteScenario.error ?? "unknownRadioError")
      return
    }
    setWriteSnapshot({ phase: "review-required", preparedWrite })
  }

  const confirmWrite = () => {
    clearTimers()
    setWriteBusy(true)
    setWriteError(null)
    setWriteWarning(null)
    setWriteSnapshot({ phase: "checking-radio", preparedWrite })

    later(600, () => {
      if (selectedWriteScenario.timing === "handshake") {
        setWriteBusy(false)
        setWriteSnapshot({ phase: "review-required", preparedWrite })
        setWriteError(selectedWriteScenario.error ?? "unknownRadioError")
        return
      }

      setWriteSnapshot({
        phase: "writing-before-first-block",
        preparedWrite,
        bytesAcknowledged: 0,
      })
      later(450, () => {
        const checkpoints = [20_480, 40_960, 61_440, 81_920, 102_400]
        checkpoints.forEach((bytesAcknowledged, index) => {
          later(350 * (index + 1), () => {
            setWriteSnapshot({
              phase: "writing",
              preparedWrite,
              bytesAcknowledged,
            })

            if (
              bytesAcknowledged === 40_960 &&
              selectedWriteScenario.timing === "transfer"
            ) {
              clearTimers()
              setWriteBusy(false)
              setWriteSnapshot(unknownSnapshot(selectedWriteScenario.id))
            } else if (bytesAcknowledged === 102_400) {
              later(500, () => {
                setWriteBusy(false)
                if (
                  selectedWriteScenario.timing === "after-transfer" &&
                  selectedWriteScenario.group !== "storage"
                ) {
                  setWriteSnapshot(unknownSnapshot(selectedWriteScenario.id))
                  return
                }
                setWriteSnapshot(completedSnapshot)
                if (selectedWriteScenario.group === "storage") {
                  setWriteWarning(
                    selectedWriteScenario.error ?? "backupHistorySaveFailed"
                  )
                }
              })
            }
          })
        })
      })
    })
  }

  const review = React.useMemo<readonly RadioWriteReviewItem[]>(
    () => [
      {
        id: "display-theme",
        subject: t("firmwareDemoReviewDisplay"),
        field: t("firmwareDemoReviewTheme"),
        before: t("valueLight"),
        after: t("valueDark"),
      },
      {
        id: "channel-name",
        subject: t("firmwareDemoReviewChannel"),
        field: t("channelName"),
        before: "Local",
        after: t("firmwareDemoReviewChannelAfter"),
      },
    ],
    [t]
  )

  const stateSnapshot = JSON.stringify(
    {
      read: {
        scenario: readScenarioId,
        stage: readStage,
        progress: readProgress,
      },
      workingCodeplug: hasWorkingCodeplug ? "ready-with-2-changes" : "none",
      write: {
        scenario: writeScenarioId,
        phase: writeSnapshot?.phase ?? "idle",
      },
    },
    null,
    2
  )

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-8 pb-24">
      <PageHeader title={t("firmwareDemoOperationsTitle")}>
        <Badge variant="secondary">
          <FlaskConicalIcon data-icon="inline-start" />
          {t("firmwareDemoLocalOnly")}
        </Badge>
        <Badge variant="outline">D · {t("firmwareDemoVariantD")}</Badge>
      </PageHeader>

      <Alert>
        <FlaskConicalIcon aria-hidden="true" />
        <AlertTitle>{t("firmwareDemoOperationsNoticeTitle")}</AlertTitle>
        <AlertDescription>{t("firmwareDemoOperationsNotice")}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-[minmax(20rem,0.7fr)_minmax(0,1.3fr)] items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("firmwareDemoInputTitle")}</CardTitle>
            <CardDescription>
              {t("firmwareDemoOperationsFirmware")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="operation-firmware-version">
                {t("firmwareDemoDetectedVersion")}
              </FieldLabel>
              <Input
                id="operation-firmware-version"
                value={firmwareVersion}
                onChange={(event) =>
                  onFirmwareVersionChange(event.target.value)
                }
              />
              <FieldDescription>
                {compatibility.status === "supported"
                  ? t("firmwareDemoSupported")
                  : t("firmwareCompatibilityStopped")}
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("firmwareDemoOperationState")}</CardTitle>
            <CardDescription>
              {t("firmwareDemoOperationStateDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-52 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
              {stateSnapshot}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("firmwareDemoReadTitle")}</CardTitle>
          <CardDescription>{t("firmwareDemoReadDescription")}</CardDescription>
          <CardAction>
            <Badge variant={hasWorkingCodeplug ? "secondary" : "outline"}>
              {hasWorkingCodeplug
                ? t("workingCodeplugReady")
                : t("noWorkingCodeplug")}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ScenarioSelect
            id="read-scenario"
            label={t("firmwareDemoReadScenario")}
            description={t("firmwareDemoScenarioDescription")}
            scenarios={READ_SCENARIOS}
            value={readScenarioId}
            onChange={setReadScenarioId}
          />

          <Progress value={readProgress}>
            <ProgressLabel>{readStageLabel(readStage, t)}</ProgressLabel>
            <ProgressValue />
          </Progress>

          {readError && (
            <OperationAlert
              title={t("radioReadStopped")}
              message={message(readError)}
              destructive
            />
          )}
          {readStage === "completed" && (
            <OperationAlert
              title={t("codeplugBackupReady")}
              message={t("codeplugBackupValidated")}
            />
          )}
          {readWarning && (
            <OperationAlert
              title={t("firmwareDemoStorageWarningTitle")}
              message={message(readWarning)}
              destructive
            />
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={runRead}
            disabled={readStage === "handshake" || readStage === "reading"}
          >
            <RadioTowerIcon data-icon="inline-start" />
            {readStage === "idle" ? t("readRadio") : t("firmwareDemoRunAgain")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("firmwareDemoWriteScenarioTitle")}</CardTitle>
          <CardDescription>
            {t("firmwareDemoWriteScenarioDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ScenarioSelect
            id="write-scenario"
            label={t("firmwareDemoWriteScenario")}
            description={t("firmwareDemoScenarioDescription")}
            scenarios={WRITE_SCENARIOS}
            value={writeScenarioId}
            onChange={(scenario) => {
              clearTimers()
              setWriteScenarioId(scenario)
              setWriteSnapshot(null)
              setWriteError(null)
              setWriteWarning(null)
              setWriteBusy(false)
            }}
          />
          {writeError && (
            <OperationAlert
              title={t("firmwareDemoWriteStopped")}
              message={message(writeError)}
              destructive
            />
          )}
          {writeWarning && (
            <OperationAlert
              title={t("firmwareDemoStorageWarningTitle")}
              message={message(writeWarning)}
              destructive
            />
          )}
        </CardContent>
      </Card>

      <RadioWriteWorkflow
        released
        hasWorkingCodeplug={hasWorkingCodeplug}
        changeCount={2}
        snapshot={writeSnapshot}
        review={review}
        busy={writeBusy}
        onPrepare={prepareWrite}
        onConfirm={confirmWrite}
        onDiscardStatus={() => {
          clearTimers()
          setWriteSnapshot(null)
          setWriteError(null)
          setWriteWarning(null)
          setWriteBusy(false)
        }}
        onDownloadReport={() => undefined}
      />
    </div>
  )
}

function ScenarioSelect({
  id,
  label,
  description,
  scenarios,
  value,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly scenarios: readonly OperationScenario[]
  readonly value: string
  onChange(value: string): void
}) {
  const t = useTranslations()
  const message = (key: MessageKey) => String(t.raw(key))

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger id={id} className="w-full max-w-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(GROUP_LABELS) as OperationScenario["group"][]).map(
            (group) => {
              const choices = scenarios.filter(
                (scenario) => scenario.group === group
              )
              if (choices.length === 0) return null
              return (
                <SelectGroup key={group}>
                  <SelectLabel>{message(GROUP_LABELS[group])}</SelectLabel>
                  {choices.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {message(scenario.label)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            }
          )}
        </SelectContent>
      </Select>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}

function OperationAlert({
  title,
  message,
  destructive = false,
}: {
  readonly title: string
  readonly message: string
  readonly destructive?: boolean
}) {
  return (
    <Alert variant={destructive ? "destructive" : "default"}>
      {destructive ? (
        <AlertTriangleIcon aria-hidden="true" />
      ) : (
        <CheckCircle2Icon aria-hidden="true" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function readStageLabel(
  stage: ReadStage,
  t: ReturnType<typeof useTranslations>
) {
  switch (stage) {
    case "idle":
      return t("idle")
    case "handshake":
      return t("firmwareDemoReadStageHandshake")
    case "reading":
      return t("readingCodeplug")
    case "completed":
      return t("firmwareDemoStageComplete")
    case "failed":
      return t("firmwareDemoStageBlocked")
  }
}

function unknownSnapshot(reason: string): RadioWriteOperationSnapshot {
  return {
    phase: "write-outcome-unknown",
    recovery: {
      schemaVersion: 1,
      preparedWrite,
      phase: "write-outcome-unknown",
      updatedAt: new Date().toISOString(),
      reason,
    },
  }
}

const artifact = Object.freeze({
  id: "operation-simulator",
  sha256: "0".repeat(64),
  byteLength: 102_400,
})
const preparedWrite: PreparedRadioWrite = Object.freeze({
  schemaVersion: 1,
  sourceRadioIdentity: {
    model: "UVL-15W" as const,
    subModel: 0,
    cpuId: "SIMULATED-CPU",
    serialNumber: "SIMULATED-RADIO",
  },
  layout: CODEPLUG_LAYOUT_3_07_23,
  baselineBackup: artifact,
  recoveryBackup: artifact,
  intendedWriteImage: artifact,
  changeSetSha256: "0".repeat(64),
  preparedAt: "2026-08-29T00:00:00.000Z",
})
const completedSnapshot: RadioWriteOperationSnapshot = Object.freeze({
  phase: "completed",
  preparedWrite,
  completedBackup: artifact,
  completedAt: "2026-08-29T00:00:00.000Z",
})

export { READ_SCENARIOS, RadioOperationSimulator, WRITE_SCENARIOS }
