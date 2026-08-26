"use client"

import { useTranslations } from "next-intl"

import { formatFrequency } from "@/components/channels/channel-format"
import {
  EditableSelectCell,
  EditableTextCell,
} from "@/components/channels/editable-channel-cells"
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
    <Table
      containerClassName="rounded-lg border"
      className="min-w-[64rem] table-fixed"
    >
      <TableHeader className="bg-background">
        <TableRow>
          <TableSettingHead
            className="w-20"
            label={t("aprsTxChannel")}
            hint={t("aprsTxChannelHint")}
          />
          <TableSettingHead
            className="w-20"
            label={t("aprsTxChannelUsed")}
            hint={t("aprsTxChannelUsedHint")}
          />
          <TableSettingHead
            className="w-44"
            label={t("aprsTxFrequency")}
            hint={t("aprsTxFrequencyHint")}
          />
          <TableSettingHead
            className="w-32"
            label={t("aprsBandwidth")}
            hint={t("aprsBandwidthHint")}
          />
          <TableSettingHead
            className="w-28"
            label={t("aprsTxPower")}
            hint={t("aprsTxPowerHint")}
          />
          <TableSettingHead
            className="w-28"
            label={t("aprsToneType")}
            hint={t("aprsToneTypeHint")}
          />
          <TableSettingHead
            className="w-32"
            label={t("aprsToneValue")}
            hint={t("aprsToneValueHint")}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {settings.transmitChannels.map((channel) => {
          const channelLabel = `CH${channel.number}`

          return (
            <TableRow key={channel.number}>
              <TableCell className="font-mono font-medium">
                {channelLabel}
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
                <AprsFrequencyCell
                  channel={channel}
                  ariaLabel={t("aprsTxFrequencyLabel", {
                    channel: channel.number,
                  })}
                  invalidMessage={t("aprsTxFrequencyInvalid")}
                  onCommit={(frequencyHz) =>
                    updateChannel(channel.number, { frequencyHz })
                  }
                />
              </TableCell>
              <TableCell>
                <AprsSelectCell
                  ariaLabel={`${t("aprsBandwidth")} ${channelLabel}`}
                  value={channel.bandwidth}
                  disabled={!channel.used}
                  options={APRS_SETTING_OPTIONS.bandwidths.map((value) => ({
                    value,
                    label: value === "wide" ? t("valueWide") : t("valueNarrow"),
                  }))}
                  onCommit={(bandwidth) =>
                    updateChannel(channel.number, { bandwidth })
                  }
                />
              </TableCell>
              <TableCell>
                <AprsSelectCell
                  ariaLabel={`${t("aprsTxPower")} ${channelLabel}`}
                  value={channel.power}
                  disabled={!channel.used}
                  options={APRS_SETTING_OPTIONS.transmitPowers.map((value) => ({
                    value,
                    label:
                      value === "low"
                        ? t("valueLow")
                        : value === "medium"
                          ? t("valueMedium")
                          : t("valueHigh"),
                  }))}
                  onCommit={(power) => updateChannel(channel.number, { power })}
                />
              </TableCell>
              <TableCell>
                <AprsSelectCell
                  ariaLabel={`${t("aprsToneType")} ${channelLabel}`}
                  value={channel.toneType}
                  disabled={!channel.used}
                  options={APRS_SETTING_OPTIONS.toneTypes.map((value) => ({
                    value,
                    label:
                      value === "none" ? t("valueNone") : value.toUpperCase(),
                  }))}
                  onCommit={(toneType) =>
                    updateChannel(channel.number, { toneType })
                  }
                />
              </TableCell>
              <TableCell>
                {channel.used && channel.toneType === "ctcss" ? (
                  <AprsSelectCell
                    ariaLabel={`${t("aprsToneValue")} ${channelLabel}`}
                    value={channel.ctcssIndex}
                    options={CTCSS_FREQUENCIES_HZ.map((value, index) => ({
                      value: index,
                      label: `${value.toFixed(1)} Hz`,
                    }))}
                    onCommit={(ctcssIndex) =>
                      updateChannel(channel.number, { ctcssIndex })
                    }
                  />
                ) : channel.used && channel.toneType === "dcs" ? (
                  <AprsSelectCell
                    ariaLabel={`${t("aprsToneValue")} ${channelLabel}`}
                    value={channel.dcsIndex}
                    options={DCS_CODES.map((value, index) => ({
                      value: index,
                      label: `D${value}`,
                    }))}
                    onCommit={(dcsIndex) =>
                      updateChannel(channel.number, { dcsIndex })
                    }
                  />
                ) : (
                  <UnavailableValue />
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function TableSettingHead({
  className,
  label,
  hint,
}: {
  className?: string
  label: string
  hint: string
}) {
  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <AprsHelp label={label} hint={hint} />
      </div>
    </TableHead>
  )
}

function AprsFrequencyCell({
  channel,
  ariaLabel,
  invalidMessage,
  onCommit,
}: {
  channel: AprsTransmitChannel
  ariaLabel: string
  invalidMessage: string
  onCommit(frequencyHz: number): void
}) {
  if (!channel.used || channel.frequencyHz === null) {
    return <UnavailableValue />
  }

  return (
    <EditableTextCell
      value={(channel.frequencyHz / 1_000_000).toFixed(6)}
      displayValue={formatFrequency(channel.frequencyHz)}
      ariaLabel={ariaLabel}
      inputMode="decimal"
      invalidMessage={invalidMessage}
      validate={(draft) => {
        const mhz = Number(draft.trim().replace(",", "."))
        return Number.isFinite(mhz) && mhz >= 108 && mhz <= 660
      }}
      onCommit={(draft) => {
        const mhz = Number(draft.trim().replace(",", "."))
        onCommit(Math.round(mhz * 1_000_000))
      }}
    />
  )
}

function AprsSelectCell<Value extends string | number>({
  ariaLabel,
  value,
  options,
  disabled = false,
  onCommit,
}: {
  ariaLabel: string
  value: Value | UnknownSettingValue
  options: readonly { readonly value: Value; readonly label: string }[]
  disabled?: boolean
  onCommit(value: Value): void
}) {
  if (disabled) return <UnavailableValue />

  const selected = isUnknownSettingValue(value) ? "" : String(value)
  const placeholder = isUnknownSettingValue(value)
    ? `0x${value.raw.toString(16).padStart(2, "0")}`
    : undefined

  return (
    <EditableSelectCell
      value={selected}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      options={options.map((option) => ({
        value: String(option.value),
        label: option.label,
        original: option.value,
      }))}
      onCommit={(_, option) => onCommit(option.original)}
    />
  )
}

function UnavailableValue() {
  return <span className="px-2 text-muted-foreground">—</span>
}

export { AprsTransmitChannelsTab }
