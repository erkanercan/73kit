import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { KEYBOARD_SETTING_OPTIONS } from "@/modules/codeplug/index"

import { KeyAssignmentField } from "./key-assignment-field"
import type { KeyboardSettingsSectionProps } from "./types"

function MenuAndBackKeysCard({ settings, edit }: KeyboardSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="menu-and-back-keys"
      title={t("keyboardSectionMenuAndBack")}
      description={t("keyboardSectionMenuAndBackDescription")}
    >
      <FieldGroup>
        <KeyAssignmentField
          id="menu-key-long-press"
          label={t("settingMenuKeyLongPress")}
          value={settings.menuKeyLongPress}
          actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
          onChange={(value) => edit("menuKeyLongPress", value)}
        />
        <KeyAssignmentField
          id="back-key-long-press"
          label={t("settingBackKeyLongPress")}
          value={settings.backKeyLongPress}
          actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
          onChange={(value) => edit("backKeyLongPress", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { MenuAndBackKeysCard }
