"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { formatTone } from "@/components/channels/channel-format"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  type Channel,
} from "@/modules/codeplug/index"

type Tone = Channel["transmitTone"]
type ToneType = "off" | "ctcss" | "dcs" | "ctcss-reverse" | "dcs-reverse"

function ChannelToneEditor({
  id,
  label,
  tone,
  direction,
  compact = false,
  onCommit,
}: {
  id: string
  label: string
  tone: Tone
  direction: "transmit" | "receive"
  compact?: boolean
  onCommit(tone: Exclude<Tone, { readonly kind: "unknown" }>): void
}) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const selectedType = toneType(tone)
  const typeOptions: readonly { value: ToneType; label: string }[] = [
    { value: "off", label: t("valueOff") },
    { value: "ctcss", label: "CTCSS" },
    { value: "dcs", label: "DCS" },
    ...(direction === "receive"
      ? ([
          { value: "ctcss-reverse", label: "CTCSS-R" },
          { value: "dcs-reverse", label: "DCS-R" },
        ] as const)
      : []),
  ]
  const valueOptions = toneValueOptions(selectedType)
  const selectedValue = toneValue(tone)

  function commitType(type: ToneType) {
    if (type === selectedType) {
      return
    }
    const nextTone = toneForType(type, tone)
    onCommit(nextTone)
    if (type === "off") {
      setOpen(false)
    }
  }

  function commitValue(value: string) {
    if (!selectedType || selectedType === "off") {
      return
    }
    onCommit(toneForValue(selectedType, value))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={`${id}-trigger`}
            variant={compact ? "ghost" : "outline"}
            size="sm"
            className="w-full min-w-0 justify-start"
            aria-label={t("editChannelTone", { tone: label })}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        }
      >
        <span className="truncate">{formatTone(tone, t)}</span>
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor={`${id}-type`}>{t("toneType")}</FieldLabel>
            <Select
              value={selectedType}
              onValueChange={(value) => value && commitType(value as ToneType)}
            >
              <SelectTrigger id={`${id}-type`} className="w-full">
                <SelectValue placeholder={t("valueUnknown")}>
                  {(value) =>
                    typeOptions.find((option) => option.value === value)
                      ?.label ?? t("valueUnknown")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field data-disabled={!selectedType || selectedType === "off"}>
            <FieldLabel htmlFor={`${id}-value`}>{t("toneValue")}</FieldLabel>
            <Select
              value={selectedValue}
              disabled={!selectedType || selectedType === "off"}
              onValueChange={(value) => value && commitValue(value)}
            >
              <SelectTrigger id={`${id}-value`} className="w-full">
                <SelectValue placeholder={t("valueUnknown")}>
                  {(value) =>
                    valueOptions.find((option) => option.value === value)
                      ?.label ?? t("valueUnknown")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  {valueOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  )
}

function toneType(tone: Tone): ToneType | null {
  if (tone.kind === "unknown") {
    return null
  }
  if (tone.kind === "off") {
    return "off"
  }
  return `${tone.kind}${tone.reverse ? "-reverse" : ""}` as ToneType
}

function toneValue(tone: Tone) {
  if (tone.kind === "ctcss") {
    return String(tone.frequencyHz)
  }
  if (tone.kind === "dcs") {
    return tone.code
  }
  return null
}

function toneValueOptions(type: ToneType | null) {
  if (type?.startsWith("ctcss")) {
    return CTCSS_FREQUENCIES_HZ.map((frequencyHz) => ({
      value: String(frequencyHz),
      label: `${frequencyHz.toFixed(1)} Hz`,
    }))
  }
  if (type?.startsWith("dcs")) {
    return DCS_CODES.map((code) => ({ value: code, label: `D${code}` }))
  }
  return []
}

function toneForType(
  type: ToneType,
  current: Tone
): Exclude<Tone, { readonly kind: "unknown" }> {
  if (type === "off") {
    return { kind: "off" }
  }

  const reverse = type.endsWith("-reverse")
  if (type.startsWith("ctcss")) {
    const frequencyHz =
      current.kind === "ctcss" ? current.frequencyHz : CTCSS_FREQUENCIES_HZ[0]
    return { kind: "ctcss", frequencyHz, ...(reverse && { reverse: true }) }
  }

  const code = current.kind === "dcs" ? current.code : DCS_CODES[0]
  return { kind: "dcs", code, ...(reverse && { reverse: true }) }
}

function toneForValue(
  type: Exclude<ToneType, "off">,
  value: string
): Exclude<Tone, { readonly kind: "off" | "unknown" }> {
  const reverse = type.endsWith("-reverse")
  return type.startsWith("ctcss")
    ? {
        kind: "ctcss",
        frequencyHz: Number(value),
        ...(reverse && { reverse: true }),
      }
    : { kind: "dcs", code: value, ...(reverse && { reverse: true }) }
}

export { ChannelToneEditor }
