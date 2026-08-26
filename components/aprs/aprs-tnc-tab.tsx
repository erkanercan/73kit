"use client"

import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import {
  APRS_SETTING_OPTIONS,
  type AprsTncInterfaceSettings,
} from "@/modules/codeplug/index"

import { AprsSelectField } from "./aprs-fields"
import type { AprsSectionProps } from "./types"

function AprsTncTab({ settings, edit }: AprsSectionProps) {
  const t = useTranslations()
  const unknownLabel = t("valueUnknownStored")
  const interfaces = [
    {
      id: "usb",
      title: t("aprsTncUsb"),
      settings: settings.tncUsb,
      field: "tncUsb" as const,
    },
    {
      id: "bluetooth-spp",
      title: t("aprsTncBluetoothSpp"),
      settings: settings.tncBluetoothSpp,
      field: "tncBluetoothSpp" as const,
    },
    {
      id: "bluetooth-ble",
      title: t("aprsTncBluetoothBle"),
      settings: settings.tncBluetoothBle,
      field: "tncBluetoothBle" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {interfaces.map((item) => (
          <SettingsCard
            key={item.id}
            id={`aprs-tnc-${item.id}`}
            title={item.title}
          >
            <TncFields
              id={item.id}
              settings={item.settings}
              unknownLabel={unknownLabel}
              onChange={(value) => edit(item.field, value)}
            />
          </SettingsCard>
        ))}
      </div>
    </div>
  )
}

function TncFields({
  id,
  settings,
  unknownLabel,
  onChange,
}: {
  id: string
  settings: AprsTncInterfaceSettings
  unknownLabel: string
  onChange(value: AprsTncInterfaceSettings): void
}) {
  const t = useTranslations()
  return (
    <FieldGroup>
      <AprsSelectField
        id={`aprs-tnc-${id}-output`}
        label={t("aprsTncOutput")}
        hint={t("aprsTncOutputHint")}
        value={settings.output}
        options={APRS_SETTING_OPTIONS.tncOutputs.map((value) => ({
          value,
          original: value,
          label:
            value === "off"
              ? t("off")
              : value === "rx"
                ? t("aprsTncReceivedBeacons")
                : value === "tx"
                  ? t("aprsTncTransmittedBeacons")
                  : t("aprsTncRxTxBeacons"),
        }))}
        unknownLabel={unknownLabel}
        onChange={(output) => onChange({ ...settings, output })}
      />
      <AprsSelectField
        id={`aprs-tnc-${id}-format`}
        label={t("aprsTncFormat")}
        hint={t("aprsTncFormatHint")}
        value={settings.format}
        options={APRS_SETTING_OPTIONS.tncFormats.map((value) => ({
          value,
          original: value,
          label:
            value === "kiss"
              ? "KISS"
              : value === "gpwpl"
                ? "GPWPL"
                : t("aprsTncUiText"),
        }))}
        unknownLabel={unknownLabel}
        onChange={(format) => onChange({ ...settings, format })}
      />
    </FieldGroup>
  )
}

export { AprsTncTab }
