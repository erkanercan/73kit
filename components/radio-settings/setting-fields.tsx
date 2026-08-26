import * as React from "react"
import { CircleHelpIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  isUnknownSettingValue,
  type UnknownSettingValue,
} from "@/modules/codeplug/index"

type SelectValueType = string | number
type SelectOption<Value extends SelectValueType> = {
  readonly value: string
  readonly label: string
  readonly original: Value
}

const settingHintKey = {
  "rx-tx-mode": "settingHintRxTxMode",
  "cross-band-repeater-mode": "settingHintCrossBandRepeaterMode",
  "cross-band-repeater-monitoring": "settingHintCrossBandRepeaterMonitoring",
  "squelch-level": "settingHintSquelchLevel",
  "transmit-timeout": "settingHintTransmitTimeout",
  "transmit-channel-selection": "settingHintTransmitChannelSelection",
  "call-hold-time": "settingHintCallHoldTime",
  "band-a-operating-mode": "settingHintBandAOperatingMode",
  "band-b-operating-mode": "settingHintBandBOperatingMode",
  "auto-repeater": "settingHintAutoRepeater",
  "auto-am-mode": "settingHintAutoAmMode",
  "cit-usb-cdc": "settingHintCitUsbCdc",
  "cit-bluetooth-spp": "settingHintCitBluetoothSpp",
  "cit-bluetooth-ble": "settingHintCitBluetoothBle",
  "no-signaling-tail-tone": "settingHintNoSignalingTailTone",
  "ctcss-tail-behavior": "settingHintCtcssTailBehavior",
  "dcs-tail-behavior": "settingHintDcsTailBehavior",
  "tail-signaling-duration": "settingHintTailSignalingDuration",
  "tone-burst-frequency": "settingHintToneBurstFrequency",
  "tone-burst-duration": "settingHintToneBurstDuration",
  "tone-burst-sidetone": "settingHintToneBurstSidetone",
  "scan-mode": "settingHintScanMode",
  "memory-scan-type": "settingHintMemoryScanType",
  "co-resume-delay": "settingHintCoResumeDelay",
  "to-hold-time": "settingHintToHoldTime",
  "scan-dwell-time": "settingHintScanDwellTime",
  "power-save-switch": "settingHintPowerSave",
  "power-save-delay": "settingHintPowerSaveDelay",
  "weather-squelch-control": "settingHintWeatherSquelchControl",
  "weather-receive-mode": "settingHintWeatherReceiveMode",
  "weather-scan-channels": "settingHintWeatherScanChannels",
  "weather-decode-reset": "settingHintWeatherDecodeReset",
  "backlight-level": "settingHintBacklightLevel",
  "auto-dimming-mode": "settingHintAutoDimmingMode",
  "auto-dim-delay": "settingHintAutoDimDelay",
  "exit-auto-dim-on-receive": "settingHintExitAutoDimOnReceive",
  "exit-auto-dim-on-transmit": "settingHintExitAutoDimOnTransmit",
  "show-boot-image": "settingHintShowBootImage",
  "show-firmware-version": "settingHintShowFirmwareVersion",
  "show-power-on-message": "settingHintShowPowerOnMessage",
  "show-battery-voltage": "settingHintShowBatteryVoltage",
  "power-on-message": "settingHintPowerOnMessage",
  "show-channel-frequency": "settingHintShowChannelFrequency",
  "show-channel-name": "settingHintShowChannelName",
  "show-zone-name": "settingHintShowZoneName",
  "coordinate-format": "settingHintCoordinateFormat",
  "speed-unit": "settingHintSpeedUnit",
  "altitude-unit": "settingHintAltitudeUnit",
  "distance-unit": "settingHintDistanceUnit",
  "rainfall-unit": "settingHintRainfallUnit",
  "wind-speed-unit": "settingHintWindSpeedUnit",
  "temperature-unit": "settingHintTemperatureUnit",
  "system-language": "settingHintSystemLanguage",
  "system-theme": "settingHintSystemTheme",
  "menu-auto-exit": "settingHintMenuAutoExit",
  "battery-display-style": "settingHintBatteryDisplayStyle",
  "rx-indicator-led": "settingHintRxIndicatorLed",
  "screen-off-indicator-led": "settingHintScreenOffIndicatorLed",
  "received-signal-strength": "settingHintReceivedSignalStrength",
} as const

type RadioSettingId = keyof typeof settingHintKey

function SettingLabel({ id, label }: { id: RadioSettingId; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SettingHelp id={id} label={label} />
    </div>
  )
}

function SettingHelp({ id, label }: { id: RadioSettingId; label: string }) {
  const t = useTranslations()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("settingHelpLabel", { setting: label })}
          />
        }
      >
        <CircleHelpIcon />
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        {t(settingHintKey[id])}
      </TooltipContent>
    </Tooltip>
  )
}

function SelectSettingField<Value extends SelectValueType>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: RadioSettingId
  label: string
  value: Value | UnknownSettingValue
  options: readonly SelectOption<Value>[]
  onChange(value: Value): void
}) {
  const t = useTranslations()
  const selected = isUnknownSettingValue(value) ? null : String(value)

  return (
    <Field orientation="responsive">
      <FieldContent>
        <SettingLabel id={id} label={label} />
      </FieldContent>
      <Select
        value={selected}
        onValueChange={(next) => {
          if (next === null || next === selected) return
          const option = options.find((candidate) => candidate.value === next)
          if (option) onChange(option.original)
        }}
      >
        <SelectTrigger id={id} className="w-full sm:w-64">
          <SelectValue>
            {(next) =>
              options.find((option) => option.value === next)?.label ??
              unknownLabel(value, t("valueUnknownStored"), t("valueUnknown"))
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function BooleanSettingField({
  id,
  label,
  value,
  onChange,
}: {
  id: RadioSettingId
  label: string
  value: boolean | UnknownSettingValue
  onChange(value: boolean): void
}) {
  const t = useTranslations()

  if (isUnknownSettingValue(value)) {
    return (
      <SelectSettingField
        id={id}
        label={label}
        value={value}
        options={[
          { value: "off", label: t("off"), original: "off" as const },
          { value: "on", label: t("on"), original: "on" as const },
        ]}
        onChange={(next) => onChange(next === "on")}
      />
    )
  }

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <SettingLabel id={id} label={label} />
      </FieldContent>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </Field>
  )
}

function NumberSettingField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: RadioSettingId
  label: string
  value: number | UnknownSettingValue
  min: number
  max: number
  onChange(value: number): void
}) {
  const t = useTranslations()
  const knownValue = isUnknownSettingValue(value) ? null : value
  const [draft, setDraft] = React.useState(
    knownValue === null ? "" : knownValue.toFixed(1)
  )
  const parsed = Number(draft)
  const invalid =
    draft === "" ||
    !Number.isFinite(parsed) ||
    parsed < min ||
    parsed > max ||
    !Number.isInteger(parsed * 10)

  function commit() {
    if (invalid) {
      setDraft(knownValue === null ? "" : knownValue.toFixed(1))
      return
    }
    if (parsed !== knownValue) onChange(parsed)
  }

  return (
    <Field orientation="responsive" data-invalid={invalid && draft !== ""}>
      <FieldContent>
        <SettingLabel id={id} label={label} />
        <FieldError>
          {invalid && draft !== ""
            ? t("settingTenthsRangeError", { min, max })
            : undefined}
        </FieldError>
      </FieldContent>
      <div className="flex w-full items-center gap-2 sm:w-64">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={0.1}
          value={draft}
          placeholder={
            isUnknownSettingValue(value)
              ? unknownLabel(value, t("valueUnknownStored"), t("valueUnknown"))
              : undefined
          }
          aria-invalid={invalid && draft !== ""}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setDraft(knownValue === null ? "" : knownValue.toFixed(1))
              event.currentTarget.blur()
            }
          }}
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {t("secondsUnit")}
        </span>
      </div>
    </Field>
  )
}

function textOptions<const Values extends readonly string[]>(
  values: Values,
  label: (value: Values[number]) => string
): readonly SelectOption<Values[number]>[] {
  return values.map((candidate) => {
    const value = candidate as Values[number]
    return { value, label: label(value), original: value }
  })
}

function numberOptions<const Values extends readonly number[]>(
  values: Values,
  label: (value: Values[number]) => string
): readonly SelectOption<Values[number]>[] {
  return values.map((candidate) => {
    const value = candidate as Values[number]
    return { value: String(value), label: label(value), original: value }
  })
}

function settingValueKey(value: number | UnknownSettingValue) {
  return isUnknownSettingValue(value) ? `unknown-${value.raw}` : String(value)
}

function unknownLabel(
  value: unknown,
  storedLabel: string,
  fallbackLabel: string
) {
  return isUnknownSettingValue(value)
    ? `${storedLabel}: 0x${value.raw.toString(16).padStart(2, "0")}`
    : fallbackLabel
}

export {
  BooleanSettingField,
  NumberSettingField,
  SelectSettingField,
  SettingHelp,
  numberOptions,
  settingValueKey,
  textOptions,
}
