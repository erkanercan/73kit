import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"
import { FUNCTION_SETTING_OPTIONS } from "@/modules/codeplug/index"

import {
  NumberSettingField,
  SelectSettingField,
  numberOptions,
  settingValueKey,
  textOptions,
} from "../setting-fields"
import { SettingsCard } from "../settings-card"
import type { FunctionSettingsSectionProps } from "./types"

const scanModeLabel = {
  carrier: "valueCarrier",
  time: "valueTime",
  search: "valueSearch",
} as const
const memoryScanTypeLabel = {
  normal: "valueNormal",
  priority: "valuePriority",
} as const

function ScanSettingsCard({ settings, edit }: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="scan" title={t("functionSectionScan")}>
      <FieldGroup>
        <SelectSettingField
          id="scan-mode"
          label={t("settingScanMode")}
          value={settings.scanMode}
          options={textOptions(FUNCTION_SETTING_OPTIONS.scanModes, (value) =>
            t(scanModeLabel[value])
          )}
          onChange={(value) => edit("scanMode", value)}
        />
        <SelectSettingField
          id="memory-scan-type"
          label={t("settingMemoryScanType")}
          value={settings.memoryScanType}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.memoryScanTypes,
            (value) => t(memoryScanTypeLabel[value])
          )}
          onChange={(value) => edit("memoryScanType", value)}
        />
        <NumberSettingField
          key={settingValueKey(settings.coResumeDelaySeconds)}
          id="co-resume-delay"
          label={t("settingCoResumeDelay")}
          value={settings.coResumeDelaySeconds}
          min={0}
          max={10}
          onChange={(value) => edit("coResumeDelaySeconds", value)}
        />
        <NumberSettingField
          key={settingValueKey(settings.toHoldTimeSeconds)}
          id="to-hold-time"
          label={t("settingToHoldTime")}
          value={settings.toHoldTimeSeconds}
          min={1}
          max={10}
          onChange={(value) => edit("toHoldTimeSeconds", value)}
        />
        <SelectSettingField
          id="scan-dwell-time"
          label={t("settingScanDwellTime")}
          value={settings.scanDwellTimeMs}
          options={numberOptions(
            FUNCTION_SETTING_OPTIONS.scanDwellTimesMs,
            (value) => t("valueMilliseconds", { value })
          )}
          onChange={(value) => edit("scanDwellTimeMs", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { ScanSettingsCard }
