import type {
  KeyboardSettings,
  KeyboardSettingsPatch,
} from "@/modules/codeplug/index"

type EditKeyboardSetting = <Field extends keyof KeyboardSettingsPatch>(
  field: Field,
  value: NonNullable<KeyboardSettingsPatch[Field]>
) => void

type KeyboardSettingsSectionProps = {
  settings: KeyboardSettings
  edit: EditKeyboardSetting
}

export type { EditKeyboardSetting, KeyboardSettingsSectionProps }
