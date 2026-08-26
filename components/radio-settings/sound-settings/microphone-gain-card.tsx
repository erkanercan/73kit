import { useTranslations } from "next-intl"

import { SelectSettingField } from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { SOUND_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { SoundSettingsSectionProps } from "./types"

function MicrophoneGainCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()
  const options = SOUND_SETTING_OPTIONS.microphoneGains.map((value) => ({
    value: String(value),
    label:
      typeof value === "number"
        ? t("valueNumber", { value })
        : t(
            value === "low"
              ? "valueLow"
              : value === "medium"
                ? "valueMedium"
                : "valueHigh"
          ),
    original: value,
  }))

  return (
    <SettingsCard id="microphone-gain" title={t("soundSectionMicrophoneGain")}>
      <FieldGroup>
        <SelectSettingField
          id="microphone-gain"
          label={t("settingMicrophoneGain")}
          value={settings.microphoneGain}
          options={options}
          onChange={(value) => edit("microphoneGain", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { MicrophoneGainCard }
