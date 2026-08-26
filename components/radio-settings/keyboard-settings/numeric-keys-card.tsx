import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { KEYBOARD_SETTING_OPTIONS } from "@/modules/codeplug/index"

import { KeyAssignmentField } from "./key-assignment-field"
import type { KeyboardSettingsSectionProps } from "./types"

const numericKeys = [
  [0, "digit-0-long-press", "digit0LongPress"],
  [1, "digit-1-long-press", "digit1LongPress"],
  [2, "digit-2-long-press", "digit2LongPress"],
  [3, "digit-3-long-press", "digit3LongPress"],
  [4, "digit-4-long-press", "digit4LongPress"],
  [5, "digit-5-long-press", "digit5LongPress"],
  [6, "digit-6-long-press", "digit6LongPress"],
  [7, "digit-7-long-press", "digit7LongPress"],
  [8, "digit-8-long-press", "digit8LongPress"],
  [9, "digit-9-long-press", "digit9LongPress"],
] as const

function NumericKeysCard({ settings, edit }: KeyboardSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="numeric-keys" title={t("keyboardSectionNumericKeys")}>
      <FieldGroup>
        {numericKeys.map(([digit, id, field]) => (
          <KeyAssignmentField
            key={field}
            id={id}
            label={t("settingDigitKeyLongPress", { digit })}
            value={settings[field]}
            actions={KEYBOARD_SETTING_OPTIONS.longPressActions}
            onChange={(value) => edit(field, value)}
          />
        ))}
      </FieldGroup>
    </SettingsCard>
  )
}

export { NumericKeysCard }
