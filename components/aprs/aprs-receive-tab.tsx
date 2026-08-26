"use client"

import { useTranslations } from "next-intl"

import { SettingsCard } from "@/components/radio-settings/settings-card"
import { FieldGroup } from "@/components/ui/field"
import {
  APRS_REPORT_KINDS,
  APRS_SETTING_OPTIONS,
  type AprsReportKind,
} from "@/modules/codeplug/index"

import {
  AprsSelectField,
  AprsSwitchField,
  type AprsSelectOption,
} from "./aprs-fields"
import type { AprsSectionProps } from "./types"

const reportLabelKey = {
  "mic-e": "aprsReportMicE",
  position: "aprsReportPosition",
  weather: "aprsReportWeather",
  object: "aprsReportObject",
  item: "aprsReportItem",
  status: "aprsReportStatus",
  other: "aprsReportOther",
} as const

function AprsReceiveTab({ settings, edit }: AprsSectionProps) {
  const t = useTranslations()
  const unknownLabel = t("valueUnknownStored")
  const popupOptions: readonly AprsSelectOption<number>[] =
    APRS_SETTING_OPTIONS.popupDurations.map((value, index) => ({
      value: String(index),
      original: index,
      label:
        value === null
          ? t("off")
          : value === "always"
            ? t("valueAlways")
            : t("valueSeconds", { value }),
    }))

  function updateReport(
    kind: AprsReportKind,
    patch: Partial<(typeof settings.reports)[AprsReportKind]>
  ) {
    edit("reports", {
      ...settings.reports,
      [kind]: Object.freeze({ ...settings.reports[kind], ...patch }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard id="aprs-decode-crc" title={t("aprsDecodeTitle")}>
        <FieldGroup>
          <AprsSwitchField
            id="aprs-decode-crc-switch"
            label={t("aprsDecodeCrc")}
            hint={t("aprsDecodeCrcHint")}
            value={settings.decodeCrc}
            unknownLabel={unknownLabel}
            offLabel={t("off")}
            onLabel={t("on")}
            onChange={(value) => edit("decodeCrc", value)}
          />
        </FieldGroup>
      </SettingsCard>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {APRS_REPORT_KINDS.map((kind) => {
          const report = settings.reports[kind]
          const title = t(reportLabelKey[kind])
          return (
            <SettingsCard key={kind} id={`aprs-report-${kind}`} title={title}>
              <FieldGroup>
                <AprsSwitchField
                  id={`aprs-report-${kind}-decode`}
                  label={t("aprsReportDecode")}
                  hint={t("aprsReportDecodeHint")}
                  value={report.decode}
                  unknownLabel={unknownLabel}
                  offLabel={t("off")}
                  onLabel={t("on")}
                  onChange={(value) => updateReport(kind, { decode: value })}
                />
                <AprsSwitchField
                  id={`aprs-report-${kind}-alert`}
                  label={t("aprsReportAlert")}
                  hint={t("aprsReportAlertHint")}
                  value={report.alert}
                  unknownLabel={unknownLabel}
                  offLabel={t("off")}
                  onLabel={t("on")}
                  onChange={(value) => updateReport(kind, { alert: value })}
                />
                <AprsSelectField
                  id={`aprs-report-${kind}-popup`}
                  label={t("aprsReportPopup")}
                  hint={t("aprsReportPopupHint")}
                  value={report.popupIndex}
                  options={popupOptions}
                  unknownLabel={unknownLabel}
                  onChange={(value) =>
                    updateReport(kind, { popupIndex: value })
                  }
                />
              </FieldGroup>
            </SettingsCard>
          )
        })}
      </div>
    </div>
  )
}

export { AprsReceiveTab }
