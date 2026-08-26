"use client"

import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FieldGroup } from "@/components/ui/field"
import {
  APRS_SETTING_OPTIONS,
  APRS_SYMBOL_CODES,
  aprsSymbolLabel,
  isUnknownSettingValue,
  type AprsDigipeaterEntry,
} from "@/modules/codeplug/index"

import {
  AprsNumberField,
  AprsSelectField,
  AprsSwitchField,
  AprsTextField,
  type AprsSelectOption,
} from "./aprs-fields"
import type { AprsSectionProps } from "./types"

function AprsStationTab({ settings, edit }: AprsSectionProps) {
  const t = useTranslations()
  const unknownLabel = t("valueUnknownStored")
  const symbolTable = isUnknownSettingValue(settings.symbolTable)
    ? "primary"
    : settings.symbolTable
  const fixedPositionEnabled = settings.beaconType === "fixed"
  const manualBeaconEnabled = settings.manualBeaconMode !== "off"
  const altitudeUnit = isUnknownSettingValue(
    settings.fixedPosition.altitudeUnit
  )
    ? "meters"
    : settings.fixedPosition.altitudeUnit
  const altitudeValue =
    settings.fixedPosition.altitudeMeters === null
      ? null
      : altitudeUnit === "feet"
        ? settings.fixedPosition.altitudeMeters / 0.3048
        : settings.fixedPosition.altitudeMeters

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        <SettingsCard id="aprs-identity" title={t("aprsIdentityTitle")}>
          <FieldGroup>
            <AprsTextField
              id="aprs-local-callsign"
              label={t("aprsLocalCallsign")}
              hint={t("aprsCallsignHint")}
              value={settings.localCallsign}
              maxLength={6}
              normalize={(value) => value.trim().toUpperCase()}
              validate={(value) =>
                /^[A-Za-z0-9]{1,6}$/.test(value)
                  ? null
                  : t("aprsCallsignInvalid")
              }
              onChange={(value) => edit("localCallsign", value)}
            />
            <AprsSelectField
              id="aprs-local-ssid"
              label={t("aprsLocalSsid")}
              hint={t("aprsLocalSsidHint")}
              value={settings.localSsid}
              options={integerOptions(0, 15)}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("localSsid", value)}
            />
            <AprsSelectField
              id="aprs-symbol-table"
              label={t("aprsSymbolTable")}
              hint={t("aprsSymbolTableHint")}
              value={settings.symbolTable}
              options={APRS_SETTING_OPTIONS.symbolTables.map((value) => ({
                value,
                original: value,
                label:
                  value === "primary"
                    ? t("aprsSymbolPrimary")
                    : t("aprsSymbolSecondary"),
              }))}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("symbolTable", value)}
            />
            <AprsSelectField
              id="aprs-symbol"
              label={t("aprsSymbol")}
              hint={t("aprsSymbolHint")}
              value={settings.symbolIndex}
              options={APRS_SYMBOL_CODES.map((code, index) => ({
                value: String(index),
                original: index,
                label: aprsSymbolLabel(symbolTable, index),
              }))}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("symbolIndex", value)}
            />
            <AprsTextField
              id="aprs-destination-callsign"
              label={t("aprsDestinationCallsign")}
              hint={t("aprsDestinationCallsignHint")}
              value={settings.destinationCallsign}
              maxLength={6}
              normalize={(value) => value.trim().toUpperCase()}
              validate={(value) =>
                /^[A-Za-z0-9]{1,6}$/.test(value)
                  ? null
                  : t("aprsCallsignInvalid")
              }
              onChange={(value) => edit("destinationCallsign", value)}
            />
            <AprsSelectField
              id="aprs-destination-ssid"
              label={t("aprsDestinationSsid")}
              hint={t("aprsDestinationSsidHint")}
              value={settings.destinationSsid}
              options={integerOptions(0, 15)}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("destinationSsid", value)}
            />
          </FieldGroup>
        </SettingsCard>

        <SettingsCard id="aprs-beacon" title={t("aprsBeaconTitle")}>
          <FieldGroup>
            <AprsSelectField
              id="aprs-beacon-type"
              label={t("aprsBeaconType")}
              hint={t("aprsBeaconTypeHint")}
              value={settings.beaconType}
              options={APRS_SETTING_OPTIONS.beaconTypes.map((value) => ({
                value,
                original: value,
                label:
                  value === "fixed" ? t("aprsBeaconFixed") : t("aprsBeaconGps"),
              }))}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("beaconType", value)}
            />
            <AprsSelectField
              id="aprs-auto-interval"
              label={t("aprsAutomaticBeaconInterval")}
              hint={t("aprsAutomaticBeaconIntervalHint")}
              value={settings.automaticBeaconIntervalIndex}
              options={intervalIndexOptions(
                APRS_SETTING_OPTIONS.automaticBeaconIntervals,
                t
              )}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("automaticBeaconIntervalIndex", value)}
            />
            <AprsSwitchField
              id="aprs-rf-beacon"
              label={t("aprsRfBeaconTransmission")}
              hint={t("aprsRfBeaconWarning")}
              value={settings.rfBeaconTransmission}
              unknownLabel={unknownLabel}
              offLabel={t("off")}
              onLabel={t("on")}
              onChange={(value) => edit("rfBeaconTransmission", value)}
            />
            <AprsSelectField
              id="aprs-beacon-channel"
              label={t("aprsBeaconTxChannel")}
              hint={t("aprsBeaconTxChannelHint")}
              value={settings.beaconTransmitChannel}
              options={integerOptions(0, 7, (value) => `CH${value}`)}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("beaconTransmitChannel", value)}
            />
            <AprsSelectField
              id="aprs-pre-carrier"
              label={t("aprsPreCarrier")}
              hint={t("aprsPreCarrierHint")}
              value={settings.preCarrierIndex}
              options={APRS_SETTING_OPTIONS.carrierDelaysMs.map(
                (value, index) => ({
                  value: String(index),
                  original: index,
                  label: t("valueMilliseconds", { value }),
                })
              )}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("preCarrierIndex", value)}
            />
            <AprsSelectField
              id="aprs-post-delay"
              label={t("aprsPostTransmitDelay")}
              hint={t("aprsPostTransmitDelayHint")}
              value={settings.postTransmitDelayIndex}
              options={APRS_SETTING_OPTIONS.carrierDelaysMs.map(
                (value, index) => ({
                  value: String(index),
                  original: index,
                  label: t("valueMilliseconds", { value }),
                })
              )}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("postTransmitDelayIndex", value)}
            />
            <AprsSwitchField
              id="aprs-tx-sidetone"
              label={t("aprsTransmitSidetone")}
              hint={t("aprsTransmitSidetoneHint")}
              value={settings.transmitSidetone}
              unknownLabel={unknownLabel}
              offLabel={t("off")}
              onLabel={t("on")}
              onChange={(value) => edit("transmitSidetone", value)}
            />
          </FieldGroup>
        </SettingsCard>
      </div>

      <div className="flex flex-col gap-4">
        <SettingsCard
          id="aprs-fixed-position"
          title={t("aprsFixedPositionTitle")}
        >
          <FieldGroup>
            {!fixedPositionEnabled && (
              <Alert>
                <AlertTitle>{t("aprsFixedPositionInactiveTitle")}</AlertTitle>
                <AlertDescription>
                  {t("aprsFixedPositionInactiveDescription")}
                </AlertDescription>
              </Alert>
            )}
            <AprsNumberField
              id="aprs-latitude"
              label={t("aprsLatitude")}
              hint={t("aprsLatitudeHint")}
              value={settings.fixedPosition.latitude}
              min={-90}
              max={90}
              step={0.000001}
              decimals={6}
              unit="°"
              disabled={!fixedPositionEnabled}
              invalidMessage={t("aprsLatitudeInvalid")}
              onChange={(value) =>
                edit("fixedPosition", {
                  ...settings.fixedPosition,
                  latitude: value,
                })
              }
            />
            <AprsNumberField
              id="aprs-longitude"
              label={t("aprsLongitude")}
              hint={t("aprsLongitudeHint")}
              value={settings.fixedPosition.longitude}
              min={-180}
              max={180}
              step={0.000001}
              decimals={6}
              unit="°"
              disabled={!fixedPositionEnabled}
              invalidMessage={t("aprsLongitudeInvalid")}
              onChange={(value) =>
                edit("fixedPosition", {
                  ...settings.fixedPosition,
                  longitude: value,
                })
              }
            />
            <AprsNumberField
              id="aprs-altitude"
              label={t("aprsAltitude")}
              hint={t("aprsAltitudeHint")}
              value={altitudeValue}
              min={-1000}
              max={20000}
              step={0.1}
              decimals={1}
              unit={altitudeUnit === "feet" ? "ft" : "m"}
              disabled={!fixedPositionEnabled}
              invalidMessage={t("aprsAltitudeInvalid")}
              onChange={(value) =>
                edit("fixedPosition", {
                  ...settings.fixedPosition,
                  altitudeMeters:
                    altitudeUnit === "feet" ? value * 0.3048 : value,
                })
              }
            />
            <AprsSelectField
              id="aprs-altitude-unit"
              label={t("aprsAltitudeUnit")}
              hint={t("aprsAltitudeUnitHint")}
              value={settings.fixedPosition.altitudeUnit}
              options={APRS_SETTING_OPTIONS.altitudeUnits.map((value) => ({
                value,
                original: value,
                label: value === "meters" ? t("valueMeters") : t("valueFeet"),
              }))}
              disabled={!fixedPositionEnabled}
              unknownLabel={unknownLabel}
              onChange={(value) =>
                edit("fixedPosition", {
                  ...settings.fixedPosition,
                  altitudeUnit: value,
                })
              }
            />
          </FieldGroup>
        </SettingsCard>

        <SettingsCard
          id="aprs-manual-beacon"
          title={t("aprsManualBeaconTitle")}
        >
          <FieldGroup>
            <AprsSelectField
              id="aprs-manual-mode"
              label={t("aprsManualBeaconMode")}
              hint={t("aprsManualBeaconModeHint")}
              value={settings.manualBeaconMode}
              options={APRS_SETTING_OPTIONS.manualBeaconModes.map((value) => ({
                value,
                original: value,
                label:
                  value === "off"
                    ? t("off")
                    : value === "ptt-start"
                      ? t("aprsPttStart")
                      : t("aprsPttEnd"),
              }))}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("manualBeaconMode", value)}
            />
            <AprsSelectField
              id="aprs-manual-band"
              label={t("aprsManualBeaconBand")}
              hint={t("aprsManualBeaconBandHint")}
              value={settings.manualBeaconBand}
              options={APRS_SETTING_OPTIONS.manualBeaconBands.map((value) => ({
                value,
                original: value,
                label:
                  value === "band-a"
                    ? t("valueBandA")
                    : value === "band-b"
                      ? t("valueBandB")
                      : t("valueBandAB"),
              }))}
              disabled={!manualBeaconEnabled}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("manualBeaconBand", value)}
            />
            <AprsSelectField
              id="aprs-manual-interval"
              label={t("aprsManualBeaconInterval")}
              hint={t("aprsManualBeaconIntervalHint")}
              value={settings.manualBeaconIntervalIndex}
              options={intervalIndexOptions(
                APRS_SETTING_OPTIONS.manualBeaconIntervals,
                t
              )}
              disabled={!manualBeaconEnabled}
              unknownLabel={unknownLabel}
              onChange={(value) => edit("manualBeaconIntervalIndex", value)}
            />
          </FieldGroup>
        </SettingsCard>

        <SettingsCard id="aprs-path-comment" title={t("aprsPathCommentTitle")}>
          <FieldGroup>
            <AprsTextField
              id="aprs-digipeater-path"
              label={t("aprsDigipeaterPath")}
              hint={t("aprsDigipeaterPathHint")}
              value={formatPath(settings.digipeaterPath)}
              maxLength={63}
              normalize={(value) => value.trim().toUpperCase()}
              validate={(value) =>
                validatePath(value, t("aprsDigipeaterPathInvalid"))
              }
              onChange={(value) => edit("digipeaterPath", parsePath(value))}
            />
            <AprsTextField
              id="aprs-comment"
              label={t("aprsComment")}
              hint={t("aprsCommentHint", {
                count: settings.comment.length,
              })}
              value={settings.comment}
              maxLength={64}
              multiline
              validate={(value) =>
                value.length <= 64 &&
                Array.from(value).every((character) => {
                  const code = character.charCodeAt(0)
                  return code >= 0x20 && code <= 0x7e
                })
                  ? null
                  : t("aprsCommentInvalid")
              }
              onChange={(value) => edit("comment", value)}
            />
          </FieldGroup>
        </SettingsCard>
      </div>
    </div>
  )
}

function integerOptions(
  min: number,
  max: number,
  label: (value: number) => string = String
): readonly AprsSelectOption<number>[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = min + index
    return { value: String(value), original: value, label: label(value) }
  })
}

function intervalIndexOptions(
  intervals: readonly (number | null | "always")[],
  t: ReturnType<typeof useTranslations>
): readonly AprsSelectOption<number>[] {
  return intervals.map((value, index) => ({
    value: String(index),
    original: index,
    label:
      value === null
        ? t("off")
        : value === "always"
          ? t("valueAlways")
          : value < 60
            ? t("valueSeconds", { value })
            : t("valueMinutes", { value: value / 60 }),
  }))
}

function formatPath(path: readonly AprsDigipeaterEntry[]) {
  return path.map((entry) => `${entry.callsign}-${entry.ssid}`).join(",")
}

function parsePath(value: string): readonly AprsDigipeaterEntry[] {
  if (!value.trim()) return []
  return value.split(",").map((segment) => {
    const [callsign, ssid = "0"] = segment.trim().toUpperCase().split("-")
    return Object.freeze({ callsign, ssid: Number(ssid) })
  })
}

function validatePath(value: string, message: string) {
  if (!value.trim()) return null
  const entries = value.split(",").map((entry) => entry.trim())
  return entries.length <= 8 &&
    entries.every((entry) =>
      /^[A-Za-z0-9]{1,6}(?:-(?:[0-9]|1[0-5]))?$/.test(entry)
    )
    ? null
    : message
}

export { AprsStationTab }
