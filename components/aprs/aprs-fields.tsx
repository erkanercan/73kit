"use client"

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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  isUnknownSettingValue,
  type UnknownSettingValue,
} from "@/modules/codeplug/index"

interface AprsSelectOption<Value> {
  readonly value: string
  readonly label: string
  readonly original: Value
}

function AprsFieldLabel({
  id,
  label,
  hint,
}: {
  id: string
  label: string
  hint: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <AprsHelp label={label} hint={hint} />
    </div>
  )
}

function AprsHelp({ label, hint }: { label: string; hint: string }) {
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
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

function AprsSelectField<Value>({
  id,
  label,
  hint,
  value,
  options,
  disabled,
  unknownLabel,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: Value | UnknownSettingValue
  options: readonly AprsSelectOption<Value>[]
  disabled?: boolean
  unknownLabel: string
  onChange(value: Value): void
}) {
  const selected = isUnknownSettingValue(value)
    ? null
    : (options.find((option) => Object.is(option.original, value))?.value ??
      null)
  const items = options.map((option) => ({
    value: option.value,
    label: option.label,
  }))

  return (
    <Field orientation="responsive" data-disabled={disabled}>
      <FieldContent>
        <AprsFieldLabel id={id} label={label} hint={hint} />
      </FieldContent>
      <Select
        items={items}
        value={selected}
        disabled={disabled}
        onValueChange={(next) => {
          if (next === null || next === selected) return
          const option = options.find((candidate) => candidate.value === next)
          if (option) onChange(option.original)
        }}
      >
        <SelectTrigger id={id} className="w-full! sm:w-64!">
          <SelectValue>
            {(next) =>
              options.find((option) => option.value === next)?.label ??
              unknownSettingLabel(value, unknownLabel)
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

function AprsSwitchField({
  id,
  label,
  hint,
  value,
  disabled,
  unknownLabel,
  offLabel,
  onLabel,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: boolean | UnknownSettingValue
  disabled?: boolean
  unknownLabel: string
  offLabel: string
  onLabel: string
  onChange(value: boolean): void
}) {
  if (isUnknownSettingValue(value)) {
    return (
      <AprsSelectField
        id={id}
        label={label}
        hint={hint}
        value={value}
        options={[
          { value: "off", label: offLabel, original: false },
          { value: "on", label: onLabel, original: true },
        ]}
        disabled={disabled}
        unknownLabel={unknownLabel}
        onChange={onChange}
      />
    )
  }

  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldContent>
        <AprsFieldLabel id={id} label={label} hint={hint} />
      </FieldContent>
      <Switch
        id={id}
        checked={value}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </Field>
  )
}

function AprsTextField({
  id,
  label,
  hint,
  value,
  maxLength,
  disabled,
  multiline,
  normalize = (next) => next,
  validate,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  maxLength: number
  disabled?: boolean
  multiline?: boolean
  normalize?(value: string): string
  validate(value: string): string | null
  onChange(value: string): void
}) {
  const [draftState, setDraftState] = React.useState({
    source: value,
    draft: value,
  })
  const draft = draftState.source === value ? draftState.draft : value
  const setDraft = (next: string) =>
    setDraftState({ source: value, draft: next })
  const error = validate(draft)

  function commit() {
    const normalized = normalize(draft)
    const normalizedError = validate(normalized)
    if (normalizedError) {
      setDraft(value)
      return
    }
    setDraft(normalized)
    if (normalized !== value) onChange(normalized)
  }

  const controlProps = {
    id,
    value: draft,
    maxLength,
    disabled,
    "aria-invalid": Boolean(error),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (event.key === "Enter" && !multiline) event.currentTarget.blur()
      if (event.key === "Escape") {
        setDraft(value)
        event.currentTarget.blur()
      }
    },
  }

  return (
    <Field
      orientation="responsive"
      data-disabled={disabled}
      data-invalid={Boolean(error)}
    >
      <FieldContent>
        <AprsFieldLabel id={id} label={label} hint={hint} />
        <FieldError>{error ?? undefined}</FieldError>
      </FieldContent>
      {multiline ? (
        <Textarea className="w-full! sm:w-64!" {...controlProps} />
      ) : (
        <Input className="w-full! sm:w-64!" {...controlProps} />
      )}
    </Field>
  )
}

function AprsNumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  decimals,
  unit,
  disabled,
  required = true,
  invalidMessage,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number | null
  min: number
  max: number
  step: number
  decimals: number
  unit?: string
  disabled?: boolean
  required?: boolean
  invalidMessage: string
  onChange(value: number): void
}) {
  const source = value === null ? "" : value.toFixed(decimals)
  const [draftState, setDraftState] = React.useState({
    source,
    draft: source,
  })
  const draft = draftState.source === source ? draftState.draft : source
  const setDraft = (next: string) => setDraftState({ source, draft: next })
  const parsed = Number(draft)
  const invalid =
    (required && draft === "") ||
    (draft !== "" && (!Number.isFinite(parsed) || parsed < min || parsed > max))

  function commit() {
    if (invalid || draft === "") {
      setDraft(value === null ? "" : value.toFixed(decimals))
      return
    }
    if (parsed !== value) onChange(parsed)
  }

  return (
    <Field
      orientation="responsive"
      data-disabled={disabled}
      data-invalid={invalid && draft !== ""}
    >
      <FieldContent>
        <AprsFieldLabel id={id} label={label} hint={hint} />
        <FieldError>
          {invalid && draft !== "" ? invalidMessage : undefined}
        </FieldError>
      </FieldContent>
      <InputGroup className="w-full! sm:w-64!">
        <InputGroupInput
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={invalid && draft !== ""}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setDraft(value === null ? "" : value.toFixed(decimals))
              event.currentTarget.blur()
            }
          }}
        />
        {unit && <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>}
      </InputGroup>
    </Field>
  )
}

function unknownSettingLabel(value: unknown, label: string) {
  return isUnknownSettingValue(value)
    ? `${label}: 0x${value.raw.toString(16).padStart(2, "0")}`
    : label
}

export {
  AprsHelp,
  AprsNumberField,
  AprsSelectField,
  AprsSwitchField,
  AprsTextField,
}
export type { AprsSelectOption }
