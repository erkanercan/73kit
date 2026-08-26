import { useTranslations } from "next-intl"

import { FieldGroup } from "@/components/ui/field"
import { FUNCTION_SETTING_OPTIONS } from "@/modules/codeplug/index"

import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
  textOptions,
} from "./setting-fields"
import { SettingsCard } from "./settings-card"
import type { FunctionSettingsSectionProps } from "./types"

const rxTxModeLabel = {
  "single-rx-tx": "valueSingleRxTx",
  "dual-watch-single-tx": "valueDualWatchSingleTx",
  "dual-receive-single-tx": "valueDualReceiveSingleTx",
  "cross-band-repeater": "valueCrossBandRepeater",
} as const
const crossBandModeLabel = {
  "one-way": "valueOneWay",
  "two-way": "valueTwoWay",
} as const
const transmitChannelLabel = {
  main: "valueMainChannel",
  "last-called": "valueLastCalledChannel",
} as const
const operatingModeLabel = {
  memory: "valueMemoryMode",
  vfo: "valueVfoMode",
  call: "valueCallMode",
  weather: "valueWeatherMode",
} as const
const autoAmModeLabel = {
  off: "off",
  "108-136": "valueAutoAm108136",
  "108-137": "valueAutoAm108137",
} as const

function TrxSettingsCard({ settings, edit }: FunctionSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="trx"
      title={t("functionSectionTrx")}
      description={t("functionSectionTrxDescription")}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <FieldGroup>
          <SelectSettingField
            id="rx-tx-mode"
            label={t("settingRxTxMode")}
            value={settings.rxTxMode}
            options={textOptions(FUNCTION_SETTING_OPTIONS.rxTxModes, (value) =>
              t(rxTxModeLabel[value])
            )}
            onChange={(value) => edit("rxTxMode", value)}
          />
          <SelectSettingField
            id="cross-band-repeater-mode"
            label={t("settingCrossBandRepeaterMode")}
            value={settings.crossBandRepeaterMode}
            options={textOptions(
              FUNCTION_SETTING_OPTIONS.crossBandRepeaterModes,
              (value) => t(crossBandModeLabel[value])
            )}
            onChange={(value) => edit("crossBandRepeaterMode", value)}
          />
          <BooleanSettingField
            id="cross-band-repeater-monitoring"
            label={t("settingCrossBandRepeaterMonitoring")}
            value={settings.crossBandRepeaterMonitoring}
            onChange={(value) => edit("crossBandRepeaterMonitoring", value)}
          />
          <SelectSettingField
            id="squelch-level"
            label={t("settingSquelchLevel")}
            value={settings.squelchLevel}
            options={numberOptions(
              FUNCTION_SETTING_OPTIONS.squelchLevels,
              (value) => t("valueLevel", { value })
            )}
            onChange={(value) => edit("squelchLevel", value)}
          />
          <SelectSettingField
            id="transmit-timeout"
            label={t("settingTransmitTimeout")}
            value={settings.transmitTimeoutMinutes}
            options={numberOptions(
              FUNCTION_SETTING_OPTIONS.transmitTimeoutMinutes,
              (value) => (value === 0 ? t("off") : t("valueMinutes", { value }))
            )}
            onChange={(value) => edit("transmitTimeoutMinutes", value)}
          />
          <SelectSettingField
            id="transmit-channel-selection"
            label={t("settingTransmitChannelSelection")}
            value={settings.transmitChannelSelection}
            options={textOptions(
              FUNCTION_SETTING_OPTIONS.transmitChannelSelections,
              (value) => t(transmitChannelLabel[value])
            )}
            onChange={(value) => edit("transmitChannelSelection", value)}
          />
        </FieldGroup>

        <FieldGroup>
          <SelectSettingField
            id="call-hold-time"
            label={t("settingCallHoldTime")}
            value={settings.callHoldSeconds}
            options={numberOptions(
              FUNCTION_SETTING_OPTIONS.callHoldSeconds,
              (value) => t("valueSeconds", { value })
            )}
            onChange={(value) => edit("callHoldSeconds", value)}
          />
          <SelectSettingField
            id="band-a-operating-mode"
            label={t("settingBandAOperatingMode")}
            value={settings.bandAOperatingMode}
            options={textOptions(
              FUNCTION_SETTING_OPTIONS.operatingModes,
              (value) => t(operatingModeLabel[value])
            )}
            onChange={(value) => edit("bandAOperatingMode", value)}
          />
          <SelectSettingField
            id="band-b-operating-mode"
            label={t("settingBandBOperatingMode")}
            value={settings.bandBOperatingMode}
            options={textOptions(
              FUNCTION_SETTING_OPTIONS.operatingModes,
              (value) => t(operatingModeLabel[value])
            )}
            onChange={(value) => edit("bandBOperatingMode", value)}
          />
          <BooleanSettingField
            id="auto-repeater"
            label={t("settingAutoRepeater")}
            value={settings.autoRepeater}
            onChange={(value) => edit("autoRepeater", value)}
          />
          <SelectSettingField
            id="auto-am-mode"
            label={t("settingAutoAmMode")}
            value={settings.autoAmMode}
            options={textOptions(
              FUNCTION_SETTING_OPTIONS.autoAmModes,
              (value) => t(autoAmModeLabel[value])
            )}
            onChange={(value) => edit("autoAmMode", value)}
          />
        </FieldGroup>
      </div>
    </SettingsCard>
  )
}

export { TrxSettingsCard }
