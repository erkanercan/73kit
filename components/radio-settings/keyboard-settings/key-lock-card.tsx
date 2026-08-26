import { useTranslations } from "next-intl"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
  textOptions,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { KEYBOARD_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { KeyboardSettingsSectionProps } from "./types"

const lockTypeLabel = {
  keys: "lockTypeKeys",
  encoder: "lockTypeEncoder",
  "keys-and-encoder": "lockTypeKeysAndEncoder",
  ptt: "lockTypePtt",
  "ptt-and-keys": "lockTypePttAndKeys",
  "ptt-and-encoder": "lockTypePttAndEncoder",
  "ptt-encoder-and-keys": "lockTypePttEncoderAndKeys",
} as const

function KeyLockCard({ settings, edit }: KeyboardSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="key-and-encoder-lock"
      title={t("keyboardSectionLock")}
      description={t("keyboardSectionLockDescription")}
    >
      <FieldGroup>
        <BooleanSettingField
          id="auto-lock"
          label={t("settingAutoLock")}
          value={settings.autoLock}
          onChange={(value) => edit("autoLock", value)}
        />
        <SelectSettingField
          id="lock-type"
          label={t("settingLockType")}
          value={settings.lockType}
          options={textOptions(KEYBOARD_SETTING_OPTIONS.lockTypes, (value) =>
            t(lockTypeLabel[value])
          )}
          onChange={(value) => edit("lockType", value)}
        />
        <SelectSettingField
          id="lock-delay"
          label={t("settingLockDelay")}
          value={settings.lockDelaySeconds}
          options={numberOptions(
            KEYBOARD_SETTING_OPTIONS.lockDelaySeconds,
            (value) =>
              value < 60
                ? t("valueSeconds", { value })
                : t("valueMinutes", { value: value / 60 })
          )}
          onChange={(value) => edit("lockDelaySeconds", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { KeyLockCard }
