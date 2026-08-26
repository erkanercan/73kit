import { useTranslations } from "next-intl"

import {
  SelectSettingField,
  textOptions,
  type RadioSettingId,
} from "@/components/radio-settings/setting-fields"
import type {
  LongPressAction,
  ShortPressAction,
  UnknownSettingValue,
} from "@/modules/codeplug/index"

const actionLabel = {
  none: "keyActionNone",
  "voice-control": "keyActionVoiceControl",
  "send-tone-burst": "keyActionSendToneBurst",
  "send-beacon": "keyActionSendBeacon",
  "squelch-off": "keyActionSquelchOff",
  scan: "keyActionScan",
  scrambler: "keyActionScrambler",
  "talk-around": "keyActionTalkAround",
  "noise-reduction": "keyActionNoiseReduction",
  "one-key-frequency-copy": "keyActionOneKeyFrequencyCopy",
  "power-level": "keyActionPowerLevel",
  reverse: "keyActionReverse",
  "fm-radio": "keyActionFmRadio",
  "channel-mode": "keyActionChannelMode",
  "emergency-alarm": "keyActionEmergencyAlarm",
  "aprs-stations": "keyActionAprsStations",
  "squelch-level": "keyActionSquelchLevel",
  "tone-scan": "keyActionToneScan",
  gps: "keyActionGps",
  "gps-position": "keyActionGpsPosition",
  "gps-satellites": "keyActionGpsSatellites",
  bluetooth: "keyActionBluetooth",
  "zone-selection": "keyActionZoneSelection",
  "scan-list-selection": "keyActionScanListSelection",
  spectrum: "keyActionSpectrum",
  "copy-to-mr": "keyActionCopyToMr",
  monitor: "keyActionMonitor",
  "debug-information": "keyActionDebugInformation",
} as const

type KeyAction = ShortPressAction | LongPressAction

function KeyAssignmentField<const Actions extends readonly KeyAction[]>({
  id,
  label,
  value,
  actions,
  onChange,
}: {
  id: RadioSettingId
  label: string
  value: Actions[number] | UnknownSettingValue
  actions: Actions
  onChange(value: Actions[number]): void
}) {
  const t = useTranslations()

  return (
    <SelectSettingField
      id={id}
      label={label}
      value={value}
      options={textOptions(actions, (action) => t.raw(actionLabel[action]))}
      onChange={onChange}
    />
  )
}

export { KeyAssignmentField }
