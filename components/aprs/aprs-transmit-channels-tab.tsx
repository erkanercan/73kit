"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  APRS_SETTING_OPTIONS,
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  isUnknownSettingValue,
  type AprsTransmitChannel,
  type UnknownSettingValue,
} from "@/modules/codeplug/index"

import { AprsHelp } from "./aprs-fields"
import type { AprsSectionProps } from "./types"

function AprsTransmitChannelsTab({ settings, edit }: AprsSectionProps) {
  const t = useTranslations()

  function updateChannel(number: number, patch: Partial<AprsTransmitChannel>) {
    edit(
      "transmitChannels",
      settings.transmitChannels.map((channel) =>
        channel.number === number
          ? Object.freeze({ ...channel, ...patch })
          : channel
      )
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("aprsTxChannelsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableSettingHead
                label={t("aprsTxChannel")}
                hint={t("aprsTxChannelHint")}
              />
              <TableSettingHead
                label={t("aprsTxChannelUsed")}
                hint={t("aprsTxChannelUsedHint")}
              />
              <TableSettingHead
                label={t("aprsTxFrequency")}
                hint={t("aprsTxFrequencyHint")}
              />
              <TableSettingHead
                label={t("aprsBandwidth")}
                hint={t("aprsBandwidthHint")}
              />
              <TableSettingHead
                label={t("aprsTxPower")}
                hint={t("aprsTxPowerHint")}
              />
              <TableSettingHead
                label={t("aprsToneType")}
                hint={t("aprsToneTypeHint")}
              />
              <TableSettingHead
                label={t("aprsToneValue")}
                hint={t("aprsToneValueHint")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.transmitChannels.map((channel) => (
              <TableRow key={channel.number}>
                <TableCell className="font-medium">
                  CH{channel.number}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={channel.used}
                    aria-label={t("aprsTxChannelUsedLabel", {
                      channel: channel.number,
                    })}
                    onCheckedChange={(used) =>
                      updateChannel(channel.number, {
                        used,
                        frequencyHz: used
                          ? (channel.frequencyHz ?? 144_800_000)
                          : null,
                        bandwidth: used ? channel.bandwidth : "wide",
                        power: used ? channel.power : "low",
                        toneType: used ? channel.toneType : "none",
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <FrequencyInput
                    channel={channel}
                    label={t("aprsTxFrequencyLabel", {
                      channel: channel.number,
                    })}
                    onChange={(frequencyHz) =>
                      updateChannel(channel.number, { frequencyHz })
                    }
                  />
                </TableCell>
                <TableCell>
                  <CompactSelect
                    label={t("aprsBandwidth")}
                    value={channel.bandwidth}
                    options={APRS_SETTING_OPTIONS.bandwidths.map((value) => ({
                      value,
                      label:
                        value === "wide" ? t("valueWide") : t("valueNarrow"),
                    }))}
                    disabled={!channel.used}
                    onChange={(bandwidth) =>
                      updateChannel(channel.number, { bandwidth })
                    }
                  />
                </TableCell>
                <TableCell>
                  <CompactSelect
                    label={t("aprsTxPower")}
                    value={channel.power}
                    options={APRS_SETTING_OPTIONS.transmitPowers.map(
                      (value) => ({
                        value,
                        label:
                          value === "low"
                            ? t("valueLow")
                            : value === "medium"
                              ? t("valueMedium")
                              : t("valueHigh"),
                      })
                    )}
                    disabled={!channel.used}
                    onChange={(power) =>
                      updateChannel(channel.number, { power })
                    }
                  />
                </TableCell>
                <TableCell>
                  <CompactSelect
                    label={t("aprsToneType")}
                    value={channel.toneType}
                    options={APRS_SETTING_OPTIONS.toneTypes.map((value) => ({
                      value,
                      label:
                        value === "none" ? t("valueNone") : value.toUpperCase(),
                    }))}
                    disabled={!channel.used}
                    onChange={(toneType) =>
                      updateChannel(channel.number, { toneType })
                    }
                  />
                </TableCell>
                <TableCell>
                  {channel.toneType === "ctcss" ? (
                    <CompactSelect
                      label={t("aprsToneValue")}
                      value={channel.ctcssIndex}
                      options={CTCSS_FREQUENCIES_HZ.map((value, index) => ({
                        value: index,
                        label: `${value.toFixed(1)} Hz`,
                      }))}
                      disabled={!channel.used}
                      onChange={(ctcssIndex) =>
                        updateChannel(channel.number, { ctcssIndex })
                      }
                    />
                  ) : channel.toneType === "dcs" ? (
                    <CompactSelect
                      label={t("aprsToneValue")}
                      value={channel.dcsIndex}
                      options={DCS_CODES.map((value, index) => ({
                        value: index,
                        label: `D${value}`,
                      }))}
                      disabled={!channel.used}
                      onChange={(dcsIndex) =>
                        updateChannel(channel.number, { dcsIndex })
                      }
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TableSettingHead({ label, hint }: { label: string; hint: string }) {
  return (
    <TableHead>
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span>{label}</span>
        <AprsHelp label={label} hint={hint} />
      </div>
    </TableHead>
  )
}

function FrequencyInput({
  channel,
  label,
  onChange,
}: {
  channel: AprsTransmitChannel
  label: string
  onChange(frequencyHz: number): void
}) {
  const value = channel.frequencyHz === null ? "" : mhz(channel.frequencyHz)
  const [draftState, setDraftState] = React.useState({
    source: value,
    draft: value,
  })
  const draft = draftState.source === value ? draftState.draft : value
  const setDraft = (next: string) =>
    setDraftState({ source: value, draft: next })
  const parsed = Number(draft)
  const invalid =
    channel.used && (!Number.isFinite(parsed) || parsed < 108 || parsed > 660)

  function commit() {
    if (invalid || draft === "") {
      setDraft(value)
      return
    }
    const frequencyHz = Math.round(parsed * 1_000_000)
    if (frequencyHz !== channel.frequencyHz) onChange(frequencyHz)
  }

  return (
    <Input
      className="w-40"
      type="number"
      inputMode="decimal"
      min={108}
      max={660}
      step={0.000001}
      value={draft}
      disabled={!channel.used}
      aria-label={label}
      aria-invalid={invalid}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function CompactSelect<Value extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: Value | UnknownSettingValue
  options: readonly { readonly value: Value; readonly label: string }[]
  disabled?: boolean
  onChange(value: Value): void
}) {
  const selected = isUnknownSettingValue(value) ? null : String(value)
  const items = options.map((option) => ({
    value: String(option.value),
    label: option.label,
  }))
  return (
    <Select
      items={items}
      value={selected}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === null) return
        const option = options.find(
          (candidate) => String(candidate.value) === next
        )
        if (option) onChange(option.value)
      }}
    >
      <SelectTrigger className="w-40!" aria-label={label}>
        <SelectValue>
          {(next) =>
            options.find((option) => String(option.value) === next)?.label ??
            (isUnknownSettingValue(value)
              ? `0x${value.raw.toString(16).padStart(2, "0")}`
              : label)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function mhz(frequencyHz: number) {
  return (frequencyHz / 1_000_000)
    .toFixed(6)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
}

export { AprsTransmitChannelsTab }
