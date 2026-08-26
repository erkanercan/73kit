import * as React from "react"
import { useTranslations } from "next-intl"

import {
  BooleanSettingField,
  SettingHelp,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  POWER_ON_MESSAGE_BYTES,
  POWER_ON_MESSAGE_CHARACTERS,
} from "@/modules/codeplug/index"

import type { DisplaySettingsSectionProps } from "./types"

function PowerOnDisplayCard({ settings, edit }: DisplaySettingsSectionProps) {
  const t = useTranslations()

  return (
    <SettingsCard id="power-on-display" title={t("displaySectionPowerOn")}>
      <FieldGroup>
        <BooleanSettingField
          id="show-boot-image"
          label={t("settingShowBootImage")}
          value={settings.showBootImage}
          onChange={(value) => edit("showBootImage", value)}
        />
        <BooleanSettingField
          id="show-firmware-version"
          label={t("settingShowFirmwareVersion")}
          value={settings.showFirmwareVersion}
          onChange={(value) => edit("showFirmwareVersion", value)}
        />
        <BooleanSettingField
          id="show-power-on-message"
          label={t("settingShowPowerOnMessage")}
          value={settings.showPowerOnMessage}
          onChange={(value) => edit("showPowerOnMessage", value)}
        />
        <PowerOnMessageField
          key={settings.powerOnMessage}
          value={settings.powerOnMessage}
          disabled={settings.showPowerOnMessage !== true}
          onChange={(value) => edit("powerOnMessage", value)}
        />
        <BooleanSettingField
          id="show-battery-voltage"
          label={t("settingShowBatteryVoltage")}
          value={settings.showBatteryVoltage}
          onChange={(value) => edit("showBatteryVoltage", value)}
        />
      </FieldGroup>
    </SettingsCard>
  )
}

function PowerOnMessageField({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange(value: string): void
}) {
  const t = useTranslations()
  const [draft, setDraft] = React.useState(value)
  const characterCount = Array.from(draft).length
  const byteCount = new TextEncoder().encode(draft).byteLength
  const invalid =
    characterCount > POWER_ON_MESSAGE_CHARACTERS ||
    byteCount > POWER_ON_MESSAGE_BYTES

  function commit() {
    if (invalid) {
      setDraft(value)
      return
    }
    if (draft !== value) onChange(draft)
  }

  return (
    <Field
      orientation="responsive"
      data-disabled={disabled}
      data-invalid={invalid}
    >
      <FieldContent>
        <div className="flex min-w-0 items-center gap-1">
          <FieldLabel htmlFor="power-on-message">
            {t("settingPowerOnMessage")}
          </FieldLabel>
          <SettingHelp
            id="power-on-message"
            label={t("settingPowerOnMessage")}
          />
        </div>
        <FieldDescription>
          {t("powerOnMessageCharacterCount", {
            count: characterCount,
            max: POWER_ON_MESSAGE_CHARACTERS,
          })}
        </FieldDescription>
        <FieldError>
          {invalid ? t("powerOnMessageTooLong") : undefined}
        </FieldError>
      </FieldContent>
      <Input
        id="power-on-message"
        className="w-full sm:w-64"
        value={draft}
        maxLength={POWER_ON_MESSAGE_CHARACTERS}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            setDraft(value)
            event.currentTarget.blur()
          }
        }}
      />
    </Field>
  )
}

export { PowerOnDisplayCard }
