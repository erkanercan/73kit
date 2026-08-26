import { useTranslations } from "next-intl"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
  textOptions,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { DISPLAY_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { DisplaySettingsSectionProps } from "./types"

function LcdBacklightCard({ settings, edit }: DisplaySettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="lcd-backlight" title={t("displaySectionLcdBacklight")}>
      <FieldGroup>
        <SelectSettingField
          id="backlight-level"
          label={t("settingBacklightLevel")}
          value={settings.backlightLevel}
          options={numberOptions(
            DISPLAY_SETTING_OPTIONS.backlightLevels,
            (value) => t("valueLevel", { value })
          )}
          onChange={(value) => edit("backlightLevel", value)}
        />
        <SelectSettingField
          id="auto-dimming-mode"
          label={t("settingAutoDimmingMode")}
          value={settings.autoDimmingMode}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.autoDimmingModes,
            (value) =>
              value === "off"
                ? t("off")
                : value === "auto-off"
                  ? t("valueAutoOff")
                  : t("valueAutoDimLevel", {
                      value: Number(value.slice("level-".length)),
                    })
          )}
          onChange={(value) => edit("autoDimmingMode", value)}
        />
        <SelectSettingField
          id="auto-dim-delay"
          label={t("settingAutoDimDelay")}
          value={settings.autoDimDelaySeconds}
          options={numberOptions(
            DISPLAY_SETTING_OPTIONS.autoDimDelaySeconds,
            (value) => durationLabel(value, t)
          )}
          onChange={(value) => edit("autoDimDelaySeconds", value)}
        />
        <BooleanSettingField
          id="exit-auto-dim-on-receive"
          label={t("settingExitAutoDimOnReceive")}
          value={settings.exitAutoDimOnReceive}
          onChange={(value) => edit("exitAutoDimOnReceive", value)}
        />
        <BooleanSettingField
          id="exit-auto-dim-on-transmit"
          label={t("settingExitAutoDimOnTransmit")}
          value={settings.exitAutoDimOnTransmit}
          onChange={(value) => edit("exitAutoDimOnTransmit", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

function durationLabel(seconds: number, t: ReturnType<typeof useTranslations>) {
  if (seconds < 60) return t("valueSeconds", { value: seconds })
  if (seconds === 3600) return t("valueHours", { value: 1 })
  return t("valueMinutes", { value: seconds / 60 })
}

export { LcdBacklightCard }
