import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"
import { FUNCTION_SETTING_OPTIONS } from "@/modules/codeplug/index"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
  textOptions,
} from "../setting-fields"
import { SettingsCard } from "../settings-card"
import type { FunctionSettingsSectionProps } from "./types"

const toneBurstDurationLabel = {
  "one-second": "valueOneSecond",
  continuous: "valueContinuous",
} as const

function ToneBurstSettingsCard({
  settings,
  edit,
}: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="tone-burst"
      title={t("functionSectionToneBurst")}
      description={t("functionSectionToneBurstDescription")}
    >
      <FieldGroup>
        <SelectSettingField
          id="tone-burst-frequency"
          label={t("settingToneBurstFrequency")}
          value={settings.toneBurstFrequencyHz}
          options={numberOptions(
            FUNCTION_SETTING_OPTIONS.toneBurstFrequenciesHz,
            (value) => t("valueHertz", { value })
          )}
          onChange={(value) => edit("toneBurstFrequencyHz", value)}
        />
        <SelectSettingField
          id="tone-burst-duration"
          label={t("settingToneBurstDuration")}
          value={settings.toneBurstDuration}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.toneBurstDurations,
            (value) => t(toneBurstDurationLabel[value])
          )}
          onChange={(value) => edit("toneBurstDuration", value)}
        />
        <BooleanSettingField
          id="tone-burst-sidetone"
          label={t("settingToneBurstSidetone")}
          value={settings.toneBurstSidetone}
          onChange={(value) => edit("toneBurstSidetone", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { ToneBurstSettingsCard }
