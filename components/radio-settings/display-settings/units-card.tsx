import { useTranslations } from "next-intl"

import {
  SelectSettingField,
  textOptions,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import { DISPLAY_SETTING_OPTIONS } from "@/modules/codeplug/index"

import type { DisplaySettingsSectionProps } from "./types"

const coordinateFormatLabel = {
  "decimal-degrees": "valueDecimalDegrees",
  "degrees-decimal-minutes": "valueDegreesDecimalMinutes",
  "degrees-minutes-seconds": "valueDegreesMinutesSeconds",
} as const
const speedUnitLabel = {
  metric: "valueMetricSpeed",
  mph: "valueMph",
  knots: "valueKnots",
} as const
const altitudeUnitLabel = {
  meters: "valueMeters",
  feet: "valueFeet",
} as const
const distanceUnitLabel = {
  metric: "valueMetricDistance",
  miles: "valueMiles",
  "nautical-miles": "valueNauticalMiles",
} as const
const rainfallUnitLabel = {
  millimeters: "valueMillimeters",
  inches: "valueInches",
} as const
const temperatureUnitLabel = {
  celsius: "valueCelsius",
  fahrenheit: "valueFahrenheit",
} as const

function UnitsCard({ settings, edit }: DisplaySettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="display-units" title={t("displaySectionUnits")}>
      <FieldGroup>
        <SelectSettingField
          id="coordinate-format"
          label={t("settingCoordinateFormat")}
          value={settings.coordinateFormat}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.coordinateFormats,
            (value) => t(coordinateFormatLabel[value])
          )}
          onChange={(value) => edit("coordinateFormat", value)}
        />
        <SelectSettingField
          id="speed-unit"
          label={t("settingSpeedUnit")}
          value={settings.speedUnit}
          options={textOptions(DISPLAY_SETTING_OPTIONS.speedUnits, (value) =>
            t(speedUnitLabel[value])
          )}
          onChange={(value) => edit("speedUnit", value)}
        />
        <SelectSettingField
          id="altitude-unit"
          label={t("settingAltitudeUnit")}
          value={settings.altitudeUnit}
          options={textOptions(DISPLAY_SETTING_OPTIONS.altitudeUnits, (value) =>
            t(altitudeUnitLabel[value])
          )}
          onChange={(value) => edit("altitudeUnit", value)}
        />
        <SelectSettingField
          id="distance-unit"
          label={t("settingDistanceUnit")}
          value={settings.distanceUnit}
          options={textOptions(DISPLAY_SETTING_OPTIONS.distanceUnits, (value) =>
            t(distanceUnitLabel[value])
          )}
          onChange={(value) => edit("distanceUnit", value)}
        />
        <SelectSettingField
          id="rainfall-unit"
          label={t("settingRainfallUnit")}
          value={settings.rainfallUnit}
          options={textOptions(DISPLAY_SETTING_OPTIONS.rainfallUnits, (value) =>
            t(rainfallUnitLabel[value])
          )}
          onChange={(value) => edit("rainfallUnit", value)}
        />
        <SelectSettingField
          id="wind-speed-unit"
          label={t("settingWindSpeedUnit")}
          value={settings.windSpeedUnit}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.windSpeedUnits,
            (value) => t(speedUnitLabel[value])
          )}
          onChange={(value) => edit("windSpeedUnit", value)}
        />
        <SelectSettingField
          id="temperature-unit"
          label={t("settingTemperatureUnit")}
          value={settings.temperatureUnit}
          options={textOptions(
            DISPLAY_SETTING_OPTIONS.temperatureUnits,
            (value) => t(temperatureUnitLabel[value])
          )}
          onChange={(value) => edit("temperatureUnit", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { UnitsCard }
