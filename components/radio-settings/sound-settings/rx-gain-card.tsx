import { useTranslations } from "next-intl"

import { DisabledSettingField } from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"

function RxGainCard() {
  const t = useTranslations()

  return (
    <SettingsCard
      id="rx-gain"
      title={t("soundSectionRxGain")}
      description={t("soundSectionRxGainDescription")}
    >
      <FieldGroup>
        <DisabledSettingField
          id="am-analog-gain"
          label={t("settingAmAnalogGain")}
          control="select"
        />
        <DisabledSettingField
          id="am-digital-gain"
          label={t("settingAmDigitalGain")}
          control="select"
        />
        <DisabledSettingField
          id="am-n-analog-gain"
          label={t("settingAmNAnalogGain")}
          control="select"
        />
        <DisabledSettingField
          id="am-n-digital-gain"
          label={t("settingAmNDigitalGain")}
          control="select"
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { RxGainCard }
