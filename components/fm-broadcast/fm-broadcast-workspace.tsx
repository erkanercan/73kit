"use client"

import * as React from "react"
import { DownloadIcon, RadioTowerIcon, SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  EditableSelectCell,
  EditableTextCell,
} from "@/components/channels/editable-channel-cells"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import {
  BooleanSettingField,
  SettingLabel,
} from "@/components/radio-settings/setting-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  FM_BROADCAST_CHANNEL_NAME_SIZE,
  FM_BROADCAST_DEFAULT_FREQUENCY_HZ,
  FM_BROADCAST_FREQUENCY_STEP_HZ,
  FM_BROADCAST_MAX_FREQUENCY_HZ,
  FM_BROADCAST_MIN_FREQUENCY_HZ,
  isUnknownSettingValue,
  type FmBroadcastChannel,
  type FmBroadcastChannelPatch,
  type FmBroadcastMode,
  type FmBroadcastSettings,
  type FmBroadcastSettingsPatch,
} from "@/modules/codeplug/index"

function FmBroadcastWorkspace() {
  const {
    busy,
    capability,
    completedRead,
    editFmBroadcastChannel,
    editFmBroadcastSettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("fmBroadcastTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RadioTowerIcon />
            </EmptyMedia>
            <EmptyTitle>{t("fmBroadcastReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              disabled={busy || capability !== "available"}
              onClick={() => void readRadio()}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("readRadio")}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const channels = codeplug.getFmBroadcastChannels()
  const settings = codeplug.getFmBroadcastSettings()

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("fmBroadcastTitle")} />

      <FmBroadcastSettingsCard
        settings={settings}
        onChange={editFmBroadcastSettings}
      />
      <FmBroadcastChannelsTable
        channels={channels}
        onEdit={editFmBroadcastChannel}
      />
    </main>
  )
}

function FmBroadcastSettingsCard({
  settings,
  onChange,
}: {
  settings: FmBroadcastSettings
  onChange(patch: FmBroadcastSettingsPatch): void
}) {
  const t = useTranslations()

  return (
    <Card>
      <CardHeader className="sr-only">
        <CardTitle>{t("fmBroadcastSettingsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 lg:grid-cols-3">
          <BooleanSettingField
            id="fm-broadcast-switch"
            label={t("fmBroadcastEnabled")}
            value={settings.enabled}
            onChange={(enabled) => onChange({ enabled })}
          />
          <FmBroadcastModeField
            value={settings.mode}
            onChange={(mode) => onChange({ mode })}
          />
          <FmFrequencySettingField
            key={
              isUnknownSettingValue(settings.vfoFrequencyHz)
                ? `unknown-${settings.vfoFrequencyHz.raw}`
                : settings.vfoFrequencyHz
            }
            value={settings.vfoFrequencyHz}
            onChange={(vfoFrequencyHz) => onChange({ vfoFrequencyHz })}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function FmBroadcastModeField({
  value,
  onChange,
}: {
  value: FmBroadcastSettings["mode"]
  onChange(value: FmBroadcastMode): void
}) {
  const t = useTranslations()
  const selected = isUnknownSettingValue(value) ? [] : [value]

  return (
    <Field orientation="responsive">
      <FieldContent>
        <SettingLabel id="fm-broadcast-mode" label={t("fmBroadcastMode")} />
        {isUnknownSettingValue(value) && (
          <FieldDescription>
            {t("fmBroadcastUnknownValue", {
              value: `0x${value.raw.toString(16).padStart(2, "0")}`,
            })}
          </FieldDescription>
        )}
      </FieldContent>
      <ToggleGroup
        aria-label={t("fmBroadcastMode")}
        value={selected}
        variant="outline"
        spacing={0}
        onValueChange={(next) => {
          const mode = next[0]
          if (mode === "vfo" || mode === "memory") onChange(mode)
        }}
      >
        <ToggleGroupItem value="vfo">{t("fmBroadcastModeVfo")}</ToggleGroupItem>
        <ToggleGroupItem value="memory">
          {t("fmBroadcastModeMemory")}
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  )
}

function FmFrequencySettingField({
  value,
  onChange,
}: {
  value: FmBroadcastSettings["vfoFrequencyHz"]
  onChange(value: number): void
}) {
  const t = useTranslations()
  const initialValue = isUnknownSettingValue(value)
    ? ""
    : formatFmFrequencyInput(value)
  const [draft, setDraft] = React.useState(initialValue)
  const [invalid, setInvalid] = React.useState(false)

  function commit() {
    const frequencyHz = parseFmFrequency(draft)
    if (frequencyHz === null) {
      setInvalid(true)
      return
    }
    if (isUnknownSettingValue(value) || frequencyHz !== value) {
      onChange(frequencyHz)
    }
  }

  return (
    <Field orientation="responsive" data-invalid={invalid || undefined}>
      <FieldContent>
        <SettingLabel
          id="fm-broadcast-vfo-frequency"
          label={t("fmBroadcastVfoFrequency")}
        />
        {isUnknownSettingValue(value) && (
          <FieldDescription>
            {t("fmBroadcastUnknownFrequency", { value: value.raw })}
          </FieldDescription>
        )}
        {invalid && (
          <FieldDescription>
            {t("fmBroadcastFrequencyInvalid")}
          </FieldDescription>
        )}
      </FieldContent>
      <Input
        id="fm-broadcast-vfo-frequency"
        value={draft}
        inputMode="decimal"
        aria-invalid={invalid}
        className="w-40 font-mono"
        onChange={(event) => {
          setDraft(event.currentTarget.value)
          setInvalid(false)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            setDraft(initialValue)
            setInvalid(false)
            event.currentTarget.blur()
          }
        }}
      />
    </Field>
  )
}

function FmBroadcastChannelsTable({
  channels,
  onEdit,
}: {
  channels: readonly FmBroadcastChannel[]
  onEdit(number: number, patch: FmBroadcastChannelPatch): void
}) {
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleChannels = channels.filter((channel) => {
    if (!normalizedSearch) return true
    return [
      fmChannelLabel(channel.number),
      channel.name,
      formatFmFrequency(channel.frequencyHz),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })

  function changeUsed(channel: FmBroadcastChannel, valid: boolean) {
    if (
      valid &&
      (channel.frequencyHz < FM_BROADCAST_MIN_FREQUENCY_HZ ||
        channel.frequencyHz > FM_BROADCAST_MAX_FREQUENCY_HZ ||
        channel.frequencyHz % FM_BROADCAST_FREQUENCY_STEP_HZ !== 0)
    ) {
      onEdit(channel.number, {
        valid,
        frequencyHz: FM_BROADCAST_DEFAULT_FREQUENCY_HZ,
      })
      return
    }
    onEdit(channel.number, { valid })
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="min-w-0 flex-1">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            aria-label={t("fmBroadcastSearch")}
            placeholder={t("fmBroadcastSearchPlaceholder")}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </InputGroup>
      </div>

      {visibleChannels.length === 0 ? (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>{t("fmBroadcastNoMatchingChannels")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table containerClassName="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-28">{t("fmBroadcastChannel")}</TableHead>
              <TableHead className="w-32">{t("used")}</TableHead>
              <TableHead>{t("channelName")}</TableHead>
              <TableHead className="w-64">
                {t("fmBroadcastFrequency")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleChannels.map((channel) => (
              <TableRow key={channel.number}>
                <TableCell className="font-mono font-medium">
                  {fmChannelLabel(channel.number)}
                </TableCell>
                <TableCell>
                  <EditableSelectCell
                    value={channel.valid ? "used" : "unused"}
                    ariaLabel={`${t("used")} ${fmChannelLabel(channel.number)}`}
                    options={[
                      { value: "used", label: t("used") },
                      { value: "unused", label: t("unused") },
                    ]}
                    onCommit={(value) => changeUsed(channel, value === "used")}
                  />
                </TableCell>
                <TableCell>
                  <FmNameCell channel={channel} onEdit={onEdit} />
                </TableCell>
                <TableCell>
                  <FmFrequencyCell channel={channel} onEdit={onEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function FmNameCell({
  channel,
  onEdit,
}: {
  channel: FmBroadcastChannel
  onEdit(number: number, patch: FmBroadcastChannelPatch): void
}) {
  const t = useTranslations()
  if (!channel.valid) {
    return <span className="text-muted-foreground">{t("unused")}</span>
  }

  return (
    <EditableTextCell
      value={channel.name}
      displayValue={channel.name || t("fmBroadcastUnnamedChannel")}
      ariaLabel={`${t("channelName")} ${fmChannelLabel(channel.number)}`}
      invalidMessage={t("channelNameTooLong")}
      validate={(value) =>
        !value.includes("\0") &&
        new TextEncoder().encode(value).byteLength <=
          FM_BROADCAST_CHANNEL_NAME_SIZE
      }
      onCommit={(name) => onEdit(channel.number, { name })}
    />
  )
}

function FmFrequencyCell({
  channel,
  onEdit,
}: {
  channel: FmBroadcastChannel
  onEdit(number: number, patch: FmBroadcastChannelPatch): void
}) {
  const t = useTranslations()
  if (!channel.valid) {
    return <span className="text-muted-foreground">{t("unused")}</span>
  }

  return (
    <EditableTextCell
      value={formatFmFrequencyInput(channel.frequencyHz)}
      displayValue={formatFmFrequency(channel.frequencyHz)}
      ariaLabel={`${t("fmBroadcastFrequency")} ${fmChannelLabel(channel.number)}`}
      inputMode="decimal"
      invalidMessage={t("fmBroadcastFrequencyInvalid")}
      validate={(value) => parseFmFrequency(value) !== null}
      onCommit={(value) => {
        const frequencyHz = parseFmFrequency(value)
        if (frequencyHz !== null) onEdit(channel.number, { frequencyHz })
      }}
    />
  )
}

function parseFmFrequency(value: string) {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) return null
  const mhz = Number(normalized)
  const frequencyHz = Math.round(mhz * 1_000_000)
  return Number.isFinite(mhz) &&
    frequencyHz >= FM_BROADCAST_MIN_FREQUENCY_HZ &&
    frequencyHz <= FM_BROADCAST_MAX_FREQUENCY_HZ &&
    frequencyHz % FM_BROADCAST_FREQUENCY_STEP_HZ === 0
    ? frequencyHz
    : null
}

function formatFmFrequencyInput(frequencyHz: number) {
  return (frequencyHz / 1_000_000).toFixed(1)
}

function formatFmFrequency(frequencyHz: number) {
  return `${formatFmFrequencyInput(frequencyHz)} MHz`
}

function fmChannelLabel(number: number) {
  return `FM-${String(number).padStart(2, "0")}`
}

export { FmBroadcastWorkspace }
