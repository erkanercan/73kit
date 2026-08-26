import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"

import { BooleanSettingField } from "./setting-fields"
import { SettingsCard } from "./settings-card"
import type { FunctionSettingsSectionProps } from "./types"

function CitSettingsCard({ settings, edit }: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="cit"
      title={t("functionSectionCit")}
      description={t("functionSectionCitDescription")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="cit-usb-cdc"
          label={t("settingCitUsbCdc")}
          value={settings.citUsbCdc}
          onChange={(value) => edit("citUsbCdc", value)}
        />
        <BooleanSettingField
          id="cit-bluetooth-spp"
          label={t("settingCitBluetoothSpp")}
          value={settings.citBluetoothSpp}
          onChange={(value) => edit("citBluetoothSpp", value)}
        />
        <BooleanSettingField
          id="cit-bluetooth-ble"
          label={t("settingCitBluetoothBle")}
          value={settings.citBluetoothBle}
          onChange={(value) => edit("citBluetoothBle", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { CitSettingsCard }
