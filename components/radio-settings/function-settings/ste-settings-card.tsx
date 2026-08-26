import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"
import { FUNCTION_SETTING_OPTIONS } from "@/modules/codeplug/index"

import {
  SelectSettingField,
  numberOptions,
  textOptions,
} from "../setting-fields"
import { SettingsCard } from "../settings-card"
import type { FunctionSettingsSectionProps } from "./types"

const noSignalingTailLabel = {
  off: "off",
  "55.2-hz": "value55Point2Hz",
  "259.2-hz": "value259Point2Hz",
} as const
const ctcssTailLabel = {
  off: "off",
  "55-hz": "value55Hz",
  "phase-shift-120": "valuePhaseShift120",
  "phase-shift-180": "valuePhaseShift180",
  "phase-shift-240": "valuePhaseShift240",
} as const
const dcsTailLabel = {
  off: "off",
  "134.4-hz": "value134Point4Hz",
} as const

function SteSettingsCard({ settings, edit }: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="ste"
      title={t("functionSectionSte")}
      description={t("functionSectionSteDescription")}
    >
      <FieldGroup>
        <SelectSettingField
          id="no-signaling-tail-tone"
          label={t("settingNoSignalingTailTone")}
          value={settings.noSignalingTailTone}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.noSignalingTailTones,
            (value) => t(noSignalingTailLabel[value])
          )}
          onChange={(value) => edit("noSignalingTailTone", value)}
        />
        <SelectSettingField
          id="ctcss-tail-behavior"
          label={t("settingCtcssTailBehavior")}
          value={settings.ctcssTailBehavior}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.ctcssTailBehaviors,
            (value) => t(ctcssTailLabel[value])
          )}
          onChange={(value) => edit("ctcssTailBehavior", value)}
        />
        <SelectSettingField
          id="dcs-tail-behavior"
          label={t("settingDcsTailBehavior")}
          value={settings.dcsTailBehavior}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.dcsTailBehaviors,
            (value) => t(dcsTailLabel[value])
          )}
          onChange={(value) => edit("dcsTailBehavior", value)}
        />
        <SelectSettingField
          id="tail-signaling-duration"
          label={t("settingTailSignalingDuration")}
          value={settings.tailSignalingDurationMs}
          options={numberOptions(
            FUNCTION_SETTING_OPTIONS.tailSignalingDurationsMs,
            (value) => t("valueMilliseconds", { value })
          )}
          onChange={(value) => edit("tailSignalingDurationMs", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { SteSettingsCard }
