"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import {
  APRS_RECEIVE_OPTIONS,
  BCLO_OPTIONS,
  COMPANDER_OPTIONS,
  DCS_POLARITY_OPTIONS,
  DUPLEX_OPTIONS,
  MODULATION_OPTIONS,
  OPTIONAL_SIGNALING_OPTIONS,
  POWER_OPTIONS,
  PTT_ID_OPTIONS,
  REVERSE_OPTIONS,
  SCAN_OPTIONS,
  SCRAMBLER_OPTIONS,
  SQUELCH_OPTIONS,
  STEP_OPTIONS,
  type EditMemoryChannel,
} from "@/components/channels/channel-editing"
import { ChannelToneEditor } from "@/components/channels/channel-tone-editor"
import {
  channelValue,
  formatOptionalSignaling,
} from "@/components/channels/channel-format"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Channel } from "@/modules/codeplug/index"

function ChannelEditorFields({
  channel,
  onEdit,
}: {
  channel: Channel
  onEdit: EditMemoryChannel
}) {
  const t = useTranslations()
  const fieldId = (field: string) => `channel-${channel.number}-${field}`

  return (
    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <DrawerSelectField
        id={fieldId("used")}
        label={t("used")}
        value={channel.valid ? "used" : "unused"}
        options={[
          { value: "used", label: t("used"), original: true },
          { value: "unused", label: t("unused"), original: false },
        ]}
        onCommit={(valid) => onEdit(channel.number, { valid })}
      />
      <DrawerTextField
        key={`${channel.number}-name-${channel.name}`}
        id={fieldId("name")}
        label={t("channelName")}
        value={channel.name}
        invalidMessage={t("channelNameTooLong")}
        validate={(value) =>
          !value.includes("\0") &&
          new TextEncoder().encode(value).byteLength <= 24
        }
        onCommit={(name) => onEdit(channel.number, { name })}
      />
      <DrawerFrequencyField
        key={`${channel.number}-rx-${channel.receiveFrequencyHz}`}
        id={fieldId("rx-frequency")}
        label={t("rxFrequency")}
        value={channel.receiveFrequencyHz}
        onCommit={(receiveFrequencyHz) =>
          onEdit(channel.number, { receiveFrequencyHz })
        }
      />
      <DrawerFrequencyField
        key={`${channel.number}-tx-${channel.transmitFrequencyHz}`}
        id={fieldId("tx-frequency")}
        label={t("txFrequency")}
        value={channel.transmitFrequencyHz}
        disabled={channel.duplex !== "split"}
        onCommit={(transmitFrequencyHz) =>
          onEdit(channel.number, { transmitFrequencyHz })
        }
      />
      <DrawerSelectField
        id={fieldId("duplex")}
        label={t("duplex")}
        value={channel.duplex}
        options={drawerValueOptions(DUPLEX_OPTIONS, t)}
        onCommit={(duplex) => onEdit(channel.number, { duplex })}
      />
      <DrawerFrequencyField
        key={`${channel.number}-offset-${channel.offsetFrequencyHz}`}
        id={fieldId("offset")}
        label={t("offset")}
        value={channel.offsetFrequencyHz}
        disabled={
          channel.duplex !== "positive" && channel.duplex !== "negative"
        }
        onCommit={(offsetFrequencyHz) =>
          onEdit(channel.number, { offsetFrequencyHz })
        }
      />
      <DrawerSelectField
        id={fieldId("reverse")}
        label={t("talkAroundReverse")}
        value={channel.reverse}
        options={drawerValueOptions(REVERSE_OPTIONS, t)}
        onCommit={(reverse) => onEdit(channel.number, { reverse })}
      />
      <DrawerSelectField
        id={fieldId("step")}
        label={t("frequencyStep")}
        value={channel.stepKHz === "unknown" ? null : String(channel.stepKHz)}
        placeholder={channelValue(channel.stepKHz, t)}
        options={drawerValueOptions(STEP_OPTIONS, t, " kHz")}
        onCommit={(stepKHz) => onEdit(channel.number, { stepKHz })}
      />
      <DrawerSelectField
        id={fieldId("mode")}
        label={t("channelMode")}
        value={channel.modulation === "unknown" ? null : channel.modulation}
        placeholder={channelValue(channel.modulation, t)}
        options={drawerValueOptions(MODULATION_OPTIONS, t)}
        onCommit={(modulation) => onEdit(channel.number, { modulation })}
      />
      <DrawerSelectField
        id={fieldId("power")}
        label={t("txPower")}
        value={
          POWER_OPTIONS.includes(
            channel.transmitPower as (typeof POWER_OPTIONS)[number]
          )
            ? channel.transmitPower
            : null
        }
        placeholder={channelValue(channel.transmitPower, t)}
        options={drawerValueOptions(POWER_OPTIONS, t)}
        onCommit={(transmitPower) => onEdit(channel.number, { transmitPower })}
      />
      <DrawerSelectField
        id={fieldId("rx-only")}
        label={t("rxOnly")}
        value={channel.receiveOnly ? "on" : "off"}
        options={[
          { value: "off", label: t("valueOff"), original: false },
          { value: "on", label: t("valueOn"), original: true },
        ]}
        onCommit={(receiveOnly) => onEdit(channel.number, { receiveOnly })}
      />
      <DrawerSelectField
        id={fieldId("bclo")}
        label={t("busyChannelLockout")}
        value={channel.busyChannelLockout}
        options={drawerValueOptions(BCLO_OPTIONS, t)}
        onCommit={(busyChannelLockout) =>
          onEdit(channel.number, { busyChannelLockout })
        }
      />
      <DrawerSelectField
        id={fieldId("scan")}
        label={t("scanFlag")}
        value={channel.scan === "reserved" ? null : channel.scan}
        placeholder={channelValue(channel.scan, t)}
        options={drawerValueOptions(SCAN_OPTIONS, t)}
        onCommit={(scan) => onEdit(channel.number, { scan })}
      />
      <DrawerSelectField
        id={fieldId("squelch")}
        label={t("squelch")}
        value={channel.squelch === "unknown" ? null : channel.squelch}
        placeholder={channelValue(channel.squelch, t)}
        options={drawerValueOptions(SQUELCH_OPTIONS, t)}
        onCommit={(squelch) => onEdit(channel.number, { squelch })}
      />
      <DrawerToneField
        id={fieldId("tx-tone")}
        label={t("txTone")}
        tone={channel.transmitTone}
        direction="transmit"
        onCommit={(transmitTone) =>
          onEdit(channel.number, { transmitTone })
        }
      />
      <DrawerToneField
        id={fieldId("rx-tone")}
        label={t("rxTone")}
        tone={channel.receiveTone}
        direction="receive"
        onCommit={(receiveTone) => onEdit(channel.number, { receiveTone })}
      />
      <DrawerSelectField
        id={fieldId("dcs-polarity")}
        label={t("dcsPolarity")}
        value={channel.dcsPolarity}
        options={drawerValueOptions(DCS_POLARITY_OPTIONS, t)}
        onCommit={(dcsPolarity) => onEdit(channel.number, { dcsPolarity })}
      />
      <DrawerSelectField
        id={fieldId("compander")}
        label={t("compander")}
        value={channel.compander}
        options={drawerValueOptions(COMPANDER_OPTIONS, t)}
        onCommit={(compander) => onEdit(channel.number, { compander })}
      />
      <DrawerSelectField
        id={fieldId("optional-signaling")}
        label={t("optionalSignaling")}
        value={
          channel.optionalSignaling.kind === "unknown"
            ? null
            : channel.optionalSignaling.kind
        }
        placeholder={formatOptionalSignaling(channel.optionalSignaling, t)}
        options={drawerValueOptions(OPTIONAL_SIGNALING_OPTIONS, t)}
        onCommit={(kind) =>
          onEdit(channel.number, {
            optionalSignaling: {
              ...channel.optionalSignaling,
              kind,
              index:
                channel.optionalSignaling.index <= 15
                  ? channel.optionalSignaling.index
                  : 0,
            },
          })
        }
      />
      <DrawerSelectField
        id={fieldId("scrambler")}
        label={t("scrambler")}
        value={
          channel.scrambler === "unknown" ? null : String(channel.scrambler)
        }
        placeholder={channelValue(channel.scrambler, t)}
        options={drawerValueOptions(SCRAMBLER_OPTIONS, t)}
        onCommit={(scrambler) => onEdit(channel.number, { scrambler })}
      />
      <DrawerSelectField
        id={fieldId("ptt-id")}
        label={t("pttId")}
        value={channel.pttId === "unknown" ? null : String(channel.pttId)}
        placeholder={channelValue(channel.pttId, t)}
        options={drawerValueOptions(PTT_ID_OPTIONS, t)}
        onCommit={(pttId) => onEdit(channel.number, { pttId })}
      />
      <DrawerSelectField
        id={fieldId("aprs-rx")}
        label={t("aprsReceive")}
        value={channel.aprsReceive === "unknown" ? null : channel.aprsReceive}
        placeholder={channelValue(channel.aprsReceive, t)}
        options={drawerValueOptions(APRS_RECEIVE_OPTIONS, t)}
        onCommit={(aprsReceive) => onEdit(channel.number, { aprsReceive })}
      />
      <DrawerReadOnlyField
        id={fieldId("zones")}
        label={t("channelZones")}
        value={channel.zoneNames.join(", ") || t("noMembership")}
      />
      <DrawerReadOnlyField
        id={fieldId("scan-lists")}
        label={t("channelScanLists")}
        value={channel.scanListNames.join(", ") || t("noMembership")}
      />
    </FieldGroup>
  )
}

interface DrawerSelectOption<Value> {
  readonly value: string
  readonly label: string
  readonly original: Value
}

function drawerValueOptions<const Values extends readonly (string | number)[]>(
  values: Values,
  t: ReturnType<typeof useTranslations>,
  suffix = ""
): readonly DrawerSelectOption<Values[number]>[] {
  return values.map((value) => ({
    value: String(value),
    label: `${channelValue(value, t)}${suffix}`,
    original: value,
  }))
}

function DrawerSelectField<Value>({
  id,
  label,
  value,
  placeholder,
  options,
  onCommit,
}: {
  id: string
  label: string
  value: string | null
  placeholder?: string
  options: readonly DrawerSelectOption<Value>[]
  onCommit(value: Value): void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue === null || nextValue === value) {
            return
          }
          const option = options.find(
            (candidate) => candidate.value === nextValue
          )
          if (option) {
            onCommit(option.original)
          }
        }}
      >
        <SelectTrigger id={id} aria-label={label} className="w-full">
          <SelectValue>
            {(selectedValue) =>
              options.find((option) => option.value === selectedValue)?.label ??
              placeholder
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
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

function DrawerFrequencyField({
  id,
  label,
  value,
  disabled = false,
  onCommit,
}: {
  id: string
  label: string
  value: number
  disabled?: boolean
  onCommit(value: number): void
}) {
  const t = useTranslations()

  return (
    <DrawerTextField
      id={id}
      label={label}
      value={(value / 1_000_000).toFixed(6)}
      inputMode="decimal"
      suffix="MHz"
      disabled={disabled}
      invalidMessage={t("invalidChannelFrequency")}
      validate={(draft) => {
        const normalized = draft.trim().replace(",", ".")
        const mhz = Number(normalized)
        const frequencyHz = Math.round(mhz * 1_000_000)
        return (
          normalized.length > 0 &&
          Number.isFinite(mhz) &&
          frequencyHz >= 0 &&
          frequencyHz <= 0xffff_ffff
        )
      }}
      onCommit={(draft) => {
        const mhz = Number(draft.trim().replace(",", "."))
        onCommit(Math.round(mhz * 1_000_000))
      }}
    />
  )
}

function DrawerTextField({
  id,
  label,
  value,
  inputMode,
  suffix,
  disabled = false,
  invalidMessage,
  validate,
  onCommit,
}: {
  id: string
  label: string
  value: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  suffix?: string
  disabled?: boolean
  invalidMessage: string
  validate(value: string): boolean
  onCommit(value: string): void
}) {
  const [draft, setDraft] = React.useState(value)
  const [invalid, setInvalid] = React.useState(false)

  function commit() {
    if (disabled) {
      return
    }
    if (!validate(draft)) {
      setInvalid(true)
      return
    }
    if (draft !== value) {
      onCommit(draft)
    }
  }

  const inputProps = {
    id,
    value: draft,
    inputMode,
    disabled,
    "aria-invalid": invalid || undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(event.currentTarget.value)
      setInvalid(false)
    },
    onBlur: commit,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.currentTarget.blur()
      }
      if (event.key === "Escape") {
        setDraft(value)
        setInvalid(false)
      }
    },
  }

  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {suffix ? (
        <InputGroup data-disabled={disabled || undefined}>
          <InputGroupInput {...inputProps} />
          <InputGroupAddon align="inline-end">{suffix}</InputGroupAddon>
        </InputGroup>
      ) : (
        <Input {...inputProps} />
      )}
      {invalid && <FieldError>{invalidMessage}</FieldError>}
    </Field>
  )
}

function DrawerReadOnlyField({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} readOnly aria-readonly="true" />
    </Field>
  )
}

function DrawerToneField({
  id,
  label,
  tone,
  direction,
  onCommit,
}: {
  id: string
  label: string
  tone: Channel["transmitTone"]
  direction: "transmit" | "receive"
  onCommit(tone: Exclude<Channel["transmitTone"], { kind: "unknown" }>): void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`${id}-trigger`}>{label}</FieldLabel>
      <ChannelToneEditor
        id={id}
        label={label}
        tone={tone}
        direction={direction}
        onCommit={onCommit}
      />
    </Field>
  )
}

export { ChannelEditorFields }
