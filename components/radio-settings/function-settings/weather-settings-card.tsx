import { useTranslations } from "next-intl"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  FUNCTION_SETTING_OPTIONS,
  type FunctionSettings,
} from "@/modules/codeplug/index"

import {
  SelectSettingField,
  SettingHelp,
  numberOptions,
  textOptions,
} from "../setting-fields"
import { SettingsCard } from "../settings-card"
import type { FunctionSettingsSectionProps } from "./types"

const weatherSquelchLabel = {
  normal: "valueNormal",
  "1050-hz-signaling": "value1050HzSignaling",
} as const
const weatherReceiveModeLabel = {
  "single-channel-watch": "valueSingleChannelWatch",
  "multi-channel-scan": "valueMultiChannelScan",
} as const

function WeatherSettingsCard({ settings, edit }: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="weather-channels" title={t("functionSectionWeather")}>
      <FieldGroup>
        <SelectSettingField
          id="weather-squelch-control"
          label={t("settingWeatherSquelchControl")}
          value={settings.weatherSquelchControl}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.weatherSquelchControls,
            (value) => t(weatherSquelchLabel[value])
          )}
          onChange={(value) => edit("weatherSquelchControl", value)}
        />
        <SelectSettingField
          id="weather-receive-mode"
          label={t("settingWeatherReceiveMode")}
          value={settings.weatherReceiveMode}
          options={textOptions(
            FUNCTION_SETTING_OPTIONS.weatherReceiveModes,
            (value) => t(weatherReceiveModeLabel[value])
          )}
          onChange={(value) => edit("weatherReceiveMode", value)}
        />
        <WeatherChannelField
          selected={settings.weatherScanChannels}
          onChange={(value) => edit("weatherScanChannels", value)}
        />
        <SelectSettingField
          id="weather-decode-reset"
          label={t("settingWeatherDecodeReset")}
          value={settings.weatherDecodeResetSeconds}
          options={numberOptions(
            FUNCTION_SETTING_OPTIONS.weatherDecodeResetSeconds,
            (value) => t("valueSeconds", { value })
          )}
          onChange={(value) => edit("weatherDecodeResetSeconds", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

function WeatherChannelField({
  selected,
  onChange,
}: {
  selected: FunctionSettings["weatherScanChannels"]
  onChange(value: FunctionSettings["weatherScanChannels"]): void
}) {
  const t = useTranslations()

  return (
    <FieldSet>
      <FieldLegend variant="label">
        <span className="flex items-center gap-1">
          {t("settingWeatherScanChannels")}
          <SettingHelp
            id="weather-scan-channels"
            label={t("settingWeatherScanChannels")}
          />
        </span>
      </FieldLegend>
      <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FUNCTION_SETTING_OPTIONS.weatherChannels.map((channel) => {
          const id = `weather-channel-${channel}`
          return (
            <Field key={channel} orientation="horizontal">
              <Checkbox
                id={id}
                checked={selected.includes(channel)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, channel].sort(
                          (left, right) => left - right
                        )
                      : selected.filter((candidate) => candidate !== channel)
                  )
                }
              />
              <FieldLabel htmlFor={id} className="font-normal">
                {t("weatherChannel", { channel })}
              </FieldLabel>
            </Field>
          )
        })}
      </FieldGroup>
    </FieldSet>
  )
}

export { WeatherSettingsCard }
