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

const systemLanguageLabel = {
  "simplified-chinese": "valueSimplifiedChinese",
  "traditional-chinese": "valueTraditionalChinese",
  english: "valueEnglish",
  turkish: "valueTurkish",
} as const
const systemThemeLabel = {
  light: "valueLight",
  dark: "valueDark",
} as const
const batteryDisplayStyleLabel = {
  icon: "valueIcon",
  voltage: "valueVoltage",
  "icon-and-voltage": "valueIconAndVoltage",
} as const
const receivedSignalStrengthLabel = {
  off: "off",
  dbm: "valueDbm",
  "rssi-and-dbm": "valueRssiAndDbm",
} as const

function OtherDisplaySettingsCard({
  settings,
  edit,
}: DisplaySettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="other-display-settings" title={t("displaySectionOther")}>
      <FieldGroup>
        <SelectSettingField
          id="system-language"
          label={t("settingSystemLanguage")}
          value={settings.systemLanguage}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.systemLanguages,
            (value) => t(systemLanguageLabel[value])
          )}
          onChange={(value) => edit("systemLanguage", value)}
        />
        <SelectSettingField
          id="system-theme"
          label={t("settingSystemTheme")}
          value={settings.systemTheme}
          options={textOptions(DISPLAY_SETTING_OPTIONS.systemThemes, (value) =>
            t(systemThemeLabel[value])
          )}
          onChange={(value) => edit("systemTheme", value)}
        />
        <SelectSettingField
          id="menu-auto-exit"
          label={t("settingMenuAutoExit")}
          value={settings.menuAutoExitSeconds}
          options={numberOptions(
            DISPLAY_SETTING_OPTIONS.menuAutoExitSeconds,
            (value) =>
              value === 0
                ? t("off")
                : value < 60
                  ? t("valueSeconds", { value })
                  : t("valueMinutes", { value: value / 60 })
          )}
          onChange={(value) => edit("menuAutoExitSeconds", value)}
        />
        <SelectSettingField
          id="battery-display-style"
          label={t("settingBatteryDisplayStyle")}
          value={settings.batteryDisplayStyle}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.batteryDisplayStyles,
            (value) => t(batteryDisplayStyleLabel[value])
          )}
          onChange={(value) => edit("batteryDisplayStyle", value)}
        />
        <BooleanSettingField
          id="rx-indicator-led"
          label={t("settingRxIndicatorLed")}
          value={settings.rxIndicatorLed}
          onChange={(value) => edit("rxIndicatorLed", value)}
        />
        <BooleanSettingField
          id="screen-off-indicator-led"
          label={t("settingScreenOffIndicatorLed")}
          value={settings.screenOffIndicatorLed}
          onChange={(value) => edit("screenOffIndicatorLed", value)}
        />
        <SelectSettingField
          id="received-signal-strength"
          label={t("settingReceivedSignalStrength")}
          value={settings.receivedSignalStrength}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.receivedSignalStrengthModes,
            (value) => t(receivedSignalStrengthLabel[value])
          )}
          onChange={(value) => edit("receivedSignalStrength", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { OtherDisplaySettingsCard }
