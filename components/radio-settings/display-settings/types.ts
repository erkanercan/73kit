import type {
  DisplaySettings,
  DisplaySettingsPatch,
} from "@/modules/codeplug/index"

type EditDisplaySetting = <Field extends keyof DisplaySettingsPatch>(
  field: Field,
  value: NonNullable<DisplaySettingsPatch[Field]>
) => void

type DisplaySettingsSectionProps = {
  settings: DisplaySettings
  edit: EditDisplaySetting
}

export type { DisplaySettingsSectionProps, EditDisplaySetting }
