import { useTranslations } from "next-intl"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
  textOptions,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { SOUND_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { SoundSettingsSectionProps } from "./types"

const sensitivityLabel = {
  low: "valueLow",
  medium: "valueMedium",
  high: "valueHigh",
  "very-high": "valueVeryHigh",
} as const

function AiVoxCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="ai-vox"
      title={t("soundSectionAiVox")}
      description={t("soundSectionAiVoxDescription")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="ai-vox"
          label={t("settingAiVox")}
          value={settings.aiVox}
          onChange={(value) => edit("aiVox", value)}
        />
        <SelectSettingField
          id="ai-vox-sensitivity"
          label={t("settingAiVoxSensitivity")}
          value={settings.aiVoxSensitivity}
          options={textOptions(
            SOUND_SETTING_OPTIONS.aiVoxSensitivities,
            (value) => t(sensitivityLabel[value])
          )}
          onChange={(value) => edit("aiVoxSensitivity", value)}
        />
        <SelectSettingField
          id="ai-vox-delay"
          label={t("settingAiVoxDelay")}
          value={settings.aiVoxDelaySeconds}
          options={numberOptions(
            SOUND_SETTING_OPTIONS.aiVoxDelaySeconds,
            (value) => t("valueSeconds", { value })
          )}
          onChange={(value) => edit("aiVoxDelaySeconds", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { AiVoxCard }
