import type {
  FunctionSettings,
  FunctionSettingsPatch,
} from "@/modules/codeplug/index"

type EditFunctionSetting = <Field extends keyof FunctionSettingsPatch>(
  field: Field,
  value: NonNullable<FunctionSettingsPatch[Field]>
) => void

type FunctionSettingsSectionProps = {
  settings: FunctionSettings
  edit: EditFunctionSetting
}

export type { EditFunctionSetting, FunctionSettingsSectionProps }
