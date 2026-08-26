import { useTranslations } from "next-intl"

import { BooleanSettingField } from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"

import type { SoundSettingsSectionProps } from "./types"

function AlertTonesCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="alert-tones" title={t("soundSectionAlertTones")}>
      <FieldGroup>
        <BooleanSettingField
          id="key-beep"
          label={t("settingKeyBeep")}
          value={settings.keyBeep}
          onChange={(value) => edit("keyBeep", value)}
        />
        <BooleanSettingField
          id="low-battery-beep"
          label={t("settingLowBatteryBeep")}
          value={settings.lowBatteryBeep}
          onChange={(value) => edit("lowBatteryBeep", value)}
        />
        <BooleanSettingField
          id="power-on-beep"
          label={t("settingPowerOnBeep")}
          value={settings.powerOnBeep}
          onChange={(value) => edit("powerOnBeep", value)}
        />
        <BooleanSettingField
          id="tx-timeout-beep"
          label={t("settingTxTimeoutBeep")}
          value={settings.txTimeoutBeep}
          onChange={(value) => edit("txTimeoutBeep", value)}
        />
        <BooleanSettingField
          id="call-start-beep"
          label={t("settingCallStartBeep")}
          value={settings.callStartBeep}
          onChange={(value) => edit("callStartBeep", value)}
        />
        <BooleanSettingField
          id="call-end-beep"
          label={t("settingCallEndBeep")}
          value={settings.callEndBeep}
          onChange={(value) => edit("callEndBeep", value)}
        />
        <BooleanSettingField
          id="scan-start-beep"
          label={t("settingScanStartBeep")}
          value={settings.scanStartBeep}
          onChange={(value) => edit("scanStartBeep", value)}
        />
        <BooleanSettingField
          id="scan-pause-beep"
          label={t("settingScanPauseBeep")}
          value={settings.scanPauseBeep}
          onChange={(value) => edit("scanPauseBeep", value)}
        />
        <BooleanSettingField
          id="scan-stop-beep"
          label={t("settingScanStopBeep")}
          value={settings.scanStopBeep}
          onChange={(value) => edit("scanStopBeep", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { AlertTonesCard }
