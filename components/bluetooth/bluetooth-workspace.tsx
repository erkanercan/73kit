"use client"

import { BluetoothIcon, DownloadIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import {
  BooleanSettingField,
  SelectSettingField,
  SettingLabel,
  numberOptions,
} from "@/components/radio-settings/setting-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  BLUETOOTH_SETTING_OPTIONS,
  isUnknownSettingValue,
  type BluetoothRole,
  type BluetoothSettings,
} from "@/modules/codeplug/index"

function BluetoothWorkspace() {
  const { busy, capability, completedRead, editBluetoothSettings, readRadio } =
    useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("bluetoothTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BluetoothIcon />
            </EmptyMedia>
            <EmptyTitle>{t("bluetoothReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              disabled={busy || capability !== "available"}
              onClick={() => void readRadio()}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("readRadio")}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const settings = codeplug.getBluetoothSettings()
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("bluetoothTitle")} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("bluetoothBasicTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <BooleanSettingField
                id="bluetooth-switch"
                label={t("bluetoothEnabled")}
                value={settings.enabled}
                onChange={(enabled) => editBluetoothSettings({ enabled })}
              />
              <BluetoothRoleField
                value={settings.role}
                onChange={(role) => editBluetoothSettings({ role })}
              />
              <SelectSettingField
                id="bluetooth-hold-time"
                label={t("bluetoothHoldTime")}
                value={settings.holdTime}
                options={BLUETOOTH_SETTING_OPTIONS.holdTimes.map(
                  (holdTime) => ({
                    value: String(holdTime),
                    label:
                      holdTime === "infinite"
                        ? t("valueInfinite")
                        : t("valueSeconds", { value: holdTime }),
                    original: holdTime,
                  })
                )}
                onChange={(holdTime) => editBluetoothSettings({ holdTime })}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("bluetoothLocalAudioTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <BooleanSettingField
                  id="bluetooth-local-speaker"
                  label={t("bluetoothLocalSpeaker")}
                  value={settings.localSpeaker}
                  onChange={(localSpeaker) =>
                    editBluetoothSettings({ localSpeaker })
                  }
                />
                <BooleanSettingField
                  id="bluetooth-local-microphone"
                  label={t("bluetoothLocalMicrophone")}
                  value={settings.localMicrophone}
                  onChange={(localMicrophone) =>
                    editBluetoothSettings({ localMicrophone })
                  }
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("bluetoothGainTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SelectSettingField
                  id="bluetooth-speaker-gain"
                  label={t("bluetoothSpeakerGain")}
                  value={settings.speakerGainLevel}
                  options={numberOptions(
                    BLUETOOTH_SETTING_OPTIONS.gainLevels,
                    (level) => t("bluetoothGainLevel", { level })
                  )}
                  onChange={(speakerGainLevel) =>
                    editBluetoothSettings({ speakerGainLevel })
                  }
                />
                <SelectSettingField
                  id="bluetooth-microphone-gain"
                  label={t("bluetoothMicrophoneGain")}
                  value={settings.microphoneGainLevel}
                  options={numberOptions(
                    BLUETOOTH_SETTING_OPTIONS.gainLevels,
                    (level) => t("bluetoothGainLevel", { level })
                  )}
                  onChange={(microphoneGainLevel) =>
                    editBluetoothSettings({ microphoneGainLevel })
                  }
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function BluetoothRoleField({
  value,
  onChange,
}: {
  value: BluetoothSettings["role"]
  onChange(value: BluetoothRole): void
}) {
  const t = useTranslations()
  const selected = isUnknownSettingValue(value) ? [] : [value]

  return (
    <Field orientation="responsive">
      <FieldContent>
        <SettingLabel id="bluetooth-role" label={t("bluetoothRole")} />
        {isUnknownSettingValue(value) && (
          <FieldDescription>
            {t("bluetoothRoleUnknown", {
              value: `0x${value.raw.toString(16).padStart(2, "0")}`,
            })}
          </FieldDescription>
        )}
      </FieldContent>
      <ToggleGroup
        aria-label={t("bluetoothRole")}
        value={selected}
        variant="outline"
        spacing={0}
        onValueChange={(next) => {
          const role = next[0]
          if (role === "host" || role === "peripheral") onChange(role)
        }}
      >
        <ToggleGroupItem value="host">{t("bluetoothRoleHost")}</ToggleGroupItem>
        <ToggleGroupItem value="peripheral">
          {t("bluetoothRolePeripheral")}
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  )
}

export { BluetoothWorkspace }
