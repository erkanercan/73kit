import type { AprsSettings, AprsSettingsPatch } from "@/modules/codeplug/index"

type EditAprsSetting = <Field extends keyof AprsSettingsPatch>(
  field: Field,
  value: NonNullable<AprsSettingsPatch[Field]>
) => void

interface AprsSectionProps {
  readonly settings: AprsSettings
  readonly edit: EditAprsSetting
}

export type { AprsSectionProps, EditAprsSetting }
