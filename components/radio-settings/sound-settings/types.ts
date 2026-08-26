import type {
  SoundSettings,
  SoundSettingsPatch,
} from "@/modules/codeplug/index"

type EditSoundSetting = <Field extends keyof SoundSettingsPatch>(
  field: Field,
  value: NonNullable<SoundSettingsPatch[Field]>
) => void

type SoundSettingsSectionProps = {
  readonly settings: SoundSettings
  readonly edit: EditSoundSetting
}

export type { EditSoundSetting, SoundSettingsSectionProps }
