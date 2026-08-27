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
} from "@/components/channels/channel-editing"
import { ChannelMembershipPicker } from "@/components/channels/channel-membership-picker"
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
import type {
  Channel,
  ChannelMembershipPatch,
  MemoryChannelPatch,
  ScanList,
  SpecialChannel,
  Zone,
} from "@/modules/codeplug/index"

function ChannelEditorFields({
  channel,
  showName = true,
  zones,
  scanLists,
  onEdit,
  onEditMemberships,
}: {
  channel: Channel | SpecialChannel
  showName?: boolean
  zones?: readonly Zone[]
  scanLists?: readonly ScanList[]
  onEdit(patch: MemoryChannelPatch): void
  onEditMemberships?(patch: ChannelMembershipPatch): void
}) {
  const t = useTranslations()
  const identifier = "number" in channel ? channel.number : channel.slot
  const fieldId = (field: string) => `channel-${identifier}-${field}`

  return (
    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {"number" in channel && (
        <DrawerSelectField
          id={fieldId("used")}
          label={t("used")}
          value={channel.valid ? "used" : "unused"}
          options={[
            { value: "used", label: t("used"), original: true },
            { value: "unused", label: t("unused"), original: false },
          ]}
          onCommit={(valid) => onEdit({ valid })}
        />
      )}
      {showName && (
        <DrawerTextField
          key={`${identifier}-name-${channel.name}`}
          id={fieldId("name")}
          label={t("channelName")}
          value={channel.name}
          invalidMessage={t("channelNameTooLong")}
          validate={(value) =>
            !value.includes("\0") &&
            new TextEncoder().encode(value).byteLength <= 24
          }
          onCommit={(name) => onEdit({ name })}
        />
      )}
      <DrawerFrequencyField
        key={`${identifier}-rx-${channel.receiveFrequencyHz}`}
        id={fieldId("rx-frequency")}
        label={t("rxFrequency")}
        value={channel.receiveFrequencyHz}
        onCommit={(receiveFrequencyHz) => onEdit({ receiveFrequencyHz })}
      />
      <DrawerFrequencyField
        key={`${identifier}-tx-${channel.transmitFrequencyHz}`}
        id={fieldId("tx-frequency")}
        label={t("txFrequency")}
        value={channel.transmitFrequencyHz}
        disabled={channel.duplex !== "split"}
        onCommit={(transmitFrequencyHz) => onEdit({ transmitFrequencyHz })}
      />
      <DrawerSelectField
        id={fieldId("duplex")}
        label={t("duplex")}
        value={channel.duplex}
        options={drawerValueOptions(DUPLEX_OPTIONS, t)}
        onCommit={(duplex) => onEdit({ duplex })}
      />
      <DrawerFrequencyField
        key={`${identifier}-offset-${channel.offsetFrequencyHz}`}
        id={fieldId("offset")}
        label={t("offset")}
        value={channel.offsetFrequencyHz}
        disabled={
          channel.duplex !== "positive" && channel.duplex !== "negative"
        }
        onCommit={(offsetFrequencyHz) => onEdit({ offsetFrequencyHz })}
      />
      <DrawerSelectField
        id={fieldId("reverse")}
        label={t("talkAroundReverse")}
        value={channel.reverse}
        options={drawerValueOptions(REVERSE_OPTIONS, t)}
        onCommit={(reverse) => onEdit({ reverse })}
      />
      <DrawerSelectField
        id={fieldId("step")}
        label={t("frequencyStep")}
        value={channel.stepKHz === "unknown" ? null : String(channel.stepKHz)}
        placeholder={channelValue(channel.stepKHz, t)}
        options={drawerValueOptions(STEP_OPTIONS, t, " kHz")}
        onCommit={(stepKHz) => onEdit({ stepKHz })}
      />
      <DrawerSelectField
        id={fieldId("mode")}
        label={t("channelMode")}
        value={channel.modulation === "unknown" ? null : channel.modulation}
        placeholder={channelValue(channel.modulation, t)}
        options={drawerValueOptions(MODULATION_OPTIONS, t)}
        onCommit={(modulation) => onEdit({ modulation })}
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
        onCommit={(transmitPower) => onEdit({ transmitPower })}
      />
      <DrawerSelectField
        id={fieldId("rx-only")}
        label={t("rxOnly")}
        value={channel.receiveOnly ? "on" : "off"}
        options={[
          { value: "off", label: t("valueOff"), original: false },
          { value: "on", label: t("valueOn"), original: true },
        ]}
        onCommit={(receiveOnly) => onEdit({ receiveOnly })}
      />
      <DrawerSelectField
        id={fieldId("bclo")}
        label={t("busyChannelLockout")}
        value={channel.busyChannelLockout}
        options={drawerValueOptions(BCLO_OPTIONS, t)}
        onCommit={(busyChannelLockout) => onEdit({ busyChannelLockout })}
      />
      {"number" in channel && (
        <DrawerSelectField
          id={fieldId("scan")}
          label={t("scanFlag")}
          value={channel.scan === "reserved" ? null : channel.scan}
          placeholder={channelValue(channel.scan, t)}
          options={drawerValueOptions(SCAN_OPTIONS, t)}
          onCommit={(scan) => onEdit({ scan })}
        />
      )}
      <DrawerSelectField
        id={fieldId("squelch")}
        label={t("squelch")}
        value={channel.squelch === "unknown" ? null : channel.squelch}
        placeholder={channelValue(channel.squelch, t)}
        options={drawerValueOptions(SQUELCH_OPTIONS, t)}
        onCommit={(squelch) => onEdit({ squelch })}
      />
      <DrawerToneField
        id={fieldId("tx-tone")}
        label={t("txTone")}
        tone={channel.transmitTone}
        direction="transmit"
        onCommit={(transmitTone) => onEdit({ transmitTone })}
      />
      <DrawerToneField
        id={fieldId("rx-tone")}
        label={t("rxTone")}
        tone={channel.receiveTone}
        direction="receive"
        onCommit={(receiveTone) => onEdit({ receiveTone })}
      />
      <DrawerSelectField
        id={fieldId("dcs-polarity")}
        label={t("dcsPolarity")}
        value={channel.dcsPolarity}
        options={drawerValueOptions(DCS_POLARITY_OPTIONS, t)}
        onCommit={(dcsPolarity) => onEdit({ dcsPolarity })}
      />
      <DrawerSelectField
        id={fieldId("compander")}
        label={t("compander")}
        value={channel.compander}
        options={drawerValueOptions(COMPANDER_OPTIONS, t)}
        onCommit={(compander) => onEdit({ compander })}
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
          onEdit({
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
      {channel.optionalSignaling.kind !== "off" &&
        channel.optionalSignaling.kind !== "unknown" && (
          <DrawerSelectField
            id={fieldId("optional-signaling-entry")}
            label={t("optionalSignalingEntry")}
            value={String(channel.optionalSignaling.index)}
            options={Array.from({ length: 16 }, (_, index) => ({
              value: String(index),
              label: formatSignalingEntry(
                channel.optionalSignaling.kind,
                index
              ),
              original: index,
            }))}
            onCommit={(index) =>
              onEdit({
                optionalSignaling: {
                  kind: channel.optionalSignaling.kind,
                  index,
                },
              })
            }
          />
        )}
      <DrawerSelectField
        id={fieldId("scrambler")}
        label={t("scrambler")}
        value={
          channel.scrambler === "unknown" ? null : String(channel.scrambler)
        }
        placeholder={channelValue(channel.scrambler, t)}
        options={drawerValueOptions(SCRAMBLER_OPTIONS, t)}
        onCommit={(scrambler) => onEdit({ scrambler })}
      />
      <DrawerSelectField
        id={fieldId("ptt-id")}
        label={t("pttId")}
        value={channel.pttId === "unknown" ? null : String(channel.pttId)}
        placeholder={channelValue(channel.pttId, t)}
        options={drawerValueOptions(PTT_ID_OPTIONS, t)}
        onCommit={(pttId) => onEdit({ pttId })}
      />
      <DrawerSelectField
        id={fieldId("aprs-rx")}
        label={t("aprsReceive")}
        value={channel.aprsReceive === "unknown" ? null : channel.aprsReceive}
        placeholder={channelValue(channel.aprsReceive, t)}
        options={drawerValueOptions(APRS_RECEIVE_OPTIONS, t)}
        onCommit={(aprsReceive) => onEdit({ aprsReceive })}
      />
      {"number" in channel && zones && scanLists && onEditMemberships && (
        <>
          <Field>
            <FieldLabel htmlFor={fieldId("zones")}>
              {t("channelZones")}
            </FieldLabel>
            <ChannelMembershipPicker
              id={fieldId("zones")}
              kind="zone"
              channelNumber={channel.number}
              collections={zones}
              onChange={(zoneNumbers) => onEditMemberships({ zoneNumbers })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={fieldId("scan-lists")}>
              {t("channelScanLists")}
            </FieldLabel>
            <ChannelMembershipPicker
              id={fieldId("scan-lists")}
              kind="scan-list"
              channelNumber={channel.number}
              collections={scanLists}
              onChange={(scanListNumbers) =>
                onEditMemberships({ scanListNumbers })
              }
            />
          </Field>
        </>
      )}
    </FieldGroup>
  )
}

interface DrawerSelectOption<Value> {
  readonly value: string
  readonly label: string
  readonly original: Value
}

function formatSignalingEntry(kind: string, index: number) {
  const labels =
    kind === "two-tone"
      ? [
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "A",
          "B",
          "C",
          "D",
          "E",
          "F",
        ]
      : [
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "A",
          "B",
          "C",
          "D",
          "*",
          "#",
        ]
  return `${index} · ${labels[index]}`
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
