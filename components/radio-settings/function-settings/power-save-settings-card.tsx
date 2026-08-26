import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"
import { FUNCTION_SETTING_OPTIONS } from "@/modules/codeplug/index"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
} from "./setting-fields"
import { SettingsCard } from "./settings-card"
import type { FunctionSettingsSectionProps } from "./types"

function PowerSaveSettingsCard({
  settings,
  edit,
}: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="power-save"
      title={t("functionSectionPowerSave")}
      description={t("functionSectionPowerSaveDescription")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="power-save-switch"
          label={t("settingPowerSave")}
          value={settings.powerSave}
          onChange={(value) => edit("powerSave", value)}
        />
        <SelectSettingField
          id="power-save-delay"
          label={t("settingPowerSaveDelay")}
          value={settings.powerSaveDelaySeconds}
          options={numberOptions(
            FUNCTION_SETTING_OPTIONS.powerSaveDelaySeconds,
            (value) => t("valueSeconds", { value })
          )}
          onChange={(value) => edit("powerSaveDelaySeconds", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { PowerSaveSettingsCard }
