import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { KEYBOARD_SETTING_OPTIONS } from "@/modules/codeplug/index"

import { KeyAssignmentField } from "./key-assignment-field"
import type { KeyboardSettingsSectionProps } from "./types"

function SideAndTopKeysCard({ settings, edit }: KeyboardSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="side-and-top-keys" title={t("keyboardSectionSideAndTop")}>
      <FieldGroup>
        <KeyAssignmentField
          id="side-key-1-short-press"
          label={t("settingSideKeyShortPress", { key: 1 })}
          value={settings.sideKey1ShortPress}
          actions={KEYBOARD_SETTING_OPTIONS.shortPressActions}
          onChange={(value) => edit("sideKey1ShortPress", value)}
        />
        <KeyAssignmentField
          id="side-key-1-long-press"
          label={t("settingSideKeyLongPress", { key: 1 })}
          value={settings.sideKey1LongPress}
          actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
          onChange={(value) => edit("sideKey1LongPress", value)}
        />
        <KeyAssignmentField
          id="side-key-2-short-press"
          label={t("settingSideKeyShortPress", { key: 2 })}
          value={settings.sideKey2ShortPress}
          actions={KEYBOARD_SETTING_OPTIONS.shortPressActions}
          onChange={(value) => edit("sideKey2ShortPress", value)}
        />
        <KeyAssignmentField
          id="side-key-2-long-press"
          label={t("settingSideKeyLongPress", { key: 2 })}
          value={settings.sideKey2LongPress}
          actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
          onChange={(value) => edit("sideKey2LongPress", value)}
        />
        <KeyAssignmentField
          id="top-key-short-press"
          label={t("settingTopKeyShortPress")}
          value={settings.topKeyShortPress}
          actions={KEYBOARD_SETTING_OPTIONS.shortPressActions}
          onChange={(value) => edit("topKeyShortPress", value)}
        />
        <KeyAssignmentField
          id="top-key-long-press"
          label={t("settingTopKeyLongPress")}
          value={settings.topKeyLongPress}
          actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
          onChange={(value) => edit("topKeyLongPress", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { SideAndTopKeysCard }
