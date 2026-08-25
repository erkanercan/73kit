"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type { EditMemoryChannel } from "@/components/channels/channel-editing"
import {
  channelValue,
  formatFrequency,
} from "@/components/channels/channel-format"
import { Button } from "@/components/ui/button"
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

function EditableNameCell({
  channel,
  onEdit,
}: {
  channel: Channel
  onEdit: EditMemoryChannel
}) {
  const t = useTranslations()
  return (
    <EditableTextCell
      value={channel.name}
      displayValue={channel.name || t("unused")}
      ariaLabel={`${t("channelName")} ${channel.number}`}
      invalidMessage={t("channelNameTooLong")}
      validate={(value) =>
        !value.includes("\0") &&
        new TextEncoder().encode(value).byteLength <= 24
      }
      onCommit={(name) => onEdit(channel.number, { name })}
    />
  )
}

function FrequencyCell({
  value,
  ariaLabel,
  onCommit,
}: {
  value: number
  ariaLabel: string
  onCommit(value: number): void
}) {
  const t = useTranslations()
  return (
    <EditableTextCell
      value={(value / 1_000_000).toFixed(6)}
      displayValue={formatFrequency(value)}
      ariaLabel={ariaLabel}
      inputMode="decimal"
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

function EditableTextCell({
  value,
  displayValue,
  ariaLabel,
  inputMode,
  invalidMessage,
  validate,
  onCommit,
}: {
  value: string
  displayValue: string
  ariaLabel: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  invalidMessage: string
  validate(value: string): boolean
  onCommit(value: string): void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [invalid, setInvalid] = React.useState(false)

  function commit() {
    if (!validate(draft)) {
      setInvalid(true)
      return
    }
    if (draft !== value) {
      onCommit(draft)
    }
    setEditing(false)
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full min-w-0 justify-start px-2 font-mono"
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation()
          setDraft(value)
          setInvalid(false)
          setEditing(true)
        }}
      >
        <span className="truncate">{displayValue}</span>
      </Button>
    )
  }

  return (
    <Input
      autoFocus
      value={draft}
      inputMode={inputMode}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      title={invalid ? invalidMessage : undefined}
      className="h-7 font-mono"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        setDraft(event.currentTarget.value)
        setInvalid(false)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          setDraft(value)
          setInvalid(false)
          setEditing(false)
        }
      }}
    />
  )
}

function ChannelValueSelect<Value extends string | number>({
  value,
  options,
  suffix = "",
  t,
  ariaLabel,
  onCommit,
}: {
  value: Value | "unknown"
  options: readonly Value[]
  suffix?: string
  t: ReturnType<typeof useTranslations>
  ariaLabel: string
  onCommit(value: Value): void
}) {
  const selected = options.find((option) => option === value)
  return (
    <EditableSelectCell
      value={selected === undefined ? "" : String(selected)}
      ariaLabel={ariaLabel}
      options={options.map((option) => ({
        value: String(option),
        label: `${channelValue(option, t)}${suffix}`,
        original: option,
      }))}
      placeholder={channelValue(value, t)}
      onCommit={(_, option) => onCommit(option.original)}
    />
  )
}

function EditableSelectCell<Option extends { value: string; label: string }>({
  value,
  options,
  placeholder,
  ariaLabel,
  onCommit,
}: {
  value: string
  options: readonly Option[]
  placeholder?: string
  ariaLabel: string
  onCommit(value: string, option: Option): void
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(nextValue) => {
        if (nextValue === null) {
          return
        }
        const option = options.find(
          (candidate) => candidate.value === nextValue
        )
        if (option && nextValue !== value) {
          onCommit(nextValue, option)
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className="w-full min-w-0"
        onClick={(event) => event.stopPropagation()}
      >
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
  )
}

export {
  ChannelValueSelect,
  EditableNameCell,
  EditableSelectCell,
  FrequencyCell,
}
