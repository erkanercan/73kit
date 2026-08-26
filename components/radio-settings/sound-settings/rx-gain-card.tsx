import { useTranslations } from "next-intl"

import {
  numberOptions,
  SelectSettingField,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { SOUND_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { SoundSettingsSectionProps } from "./types"

function RxGainCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()
  const analogOptions = numberOptions(
    SOUND_SETTING_OPTIONS.analogRxGains,
    (value) => t("valueNumber", { value })
  )
  const digitalOptions = numberOptions(
    SOUND_SETTING_OPTIONS.digitalRxGainsDb,
    (value) => t("valueDecibels", { value })
  )

  return (
    <SettingsCard id="rx-gain" title={t("soundSectionRxGain")}>
      <FieldGroup>
        <SelectSettingField
          id="am-analog-gain"
          label={t("settingAmAnalogGain")}
          value={settings.amAnalogGain}
          options={analogOptions}
          onChange={(value) => edit("amAnalogGain", value)}
        />
        <SelectSettingField
          id="am-digital-gain"
          label={t("settingAmDigitalGain")}
          value={settings.amDigitalGain}
          options={digitalOptions}
          onChange={(value) => edit("amDigitalGain", value)}
        />
        <SelectSettingField
          id="am-n-analog-gain"
          label={t("settingAmNAnalogGain")}
          value={settings.amNAnalogGain}
          options={analogOptions}
          onChange={(value) => edit("amNAnalogGain", value)}
        />
        <SelectSettingField
          id="am-n-digital-gain"
          label={t("settingAmNDigitalGain")}
          value={settings.amNDigitalGain}
          options={digitalOptions}
          onChange={(value) => edit("amNDigitalGain", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { RxGainCard }
