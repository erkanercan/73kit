import { useTranslations } from "next-intl"

import {
  BooleanSettingField,
  DisabledSettingField,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"

import type { SoundSettingsSectionProps } from "./types"

function AlertTonesCard({ settings, edit }: SoundSettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard
      id="alert-tones"
      title={t("soundSectionAlertTones")}
      description={t("soundSectionAlertTonesDescription")}
    >
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
        <DisabledSettingField
          id="scan-start-beep"
          label={t("settingScanStartBeep")}
          control="switch"
        />
        <DisabledSettingField
          id="scan-pause-beep"
          label={t("settingScanPauseBeep")}
          control="switch"
        />
        <DisabledSettingField
          id="scan-stop-beep"
          label={t("settingScanStopBeep")}
          control="switch"
        />
      </FieldGroup>
    </SettingsCard>
  )
}

export { AlertTonesCard }
