import { useTranslations } from "next-intl"

import { BooleanSettingField } from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"

import type { DisplaySettingsSectionProps } from "./types"

function MemoryChannelDisplayCard({
  settings,
  edit,
}: DisplaySettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="memory-channel-display"
      title={t("displaySectionMemoryChannel")}
      description={t("displaySectionMemoryChannelDescription")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="show-channel-frequency"
          label={t("settingShowChannelFrequency")}
          value={settings.showChannelFrequency}
          onChange={(value) => edit("showChannelFrequency", value)}
        />
        <BooleanSettingField
          id="show-channel-name"
          label={t("settingShowChannelName")}
          value={settings.showChannelName}
          onChange={(value) => edit("showChannelName", value)}
        />
        <BooleanSettingField
          id="show-zone-name"
          label={t("settingShowZoneName")}
          value={settings.showZoneName}
          onChange={(value) => edit("showZoneName", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { MemoryChannelDisplayCard }
