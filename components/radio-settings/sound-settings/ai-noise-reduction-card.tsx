import { useTranslations } from "next-intl"

import { BooleanSettingField } from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"

import type { SoundSettingsSectionProps } from "./types"

function AiNoiseReductionCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="ai-noise-reduction"
      title={t("soundSectionAiNoiseReduction")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="ai-noise-reduction"
          label={t("settingAiNoiseReduction")}
          value={settings.aiNoiseReduction}
          onChange={(value) => edit("aiNoiseReduction", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { AiNoiseReductionCard }
