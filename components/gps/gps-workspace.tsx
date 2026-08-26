"use client"

import { DownloadIcon, SatelliteIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import {
  BooleanSettingField,
  SelectSettingField,
  numberOptions,
} from "@/components/radio-settings/setting-fields"
import { Badge } from "@/components/ui/badge"
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
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  GPS_SETTING_OPTIONS,
  isUnknownSettingValue,
  type GpsConstellation,
} from "@/modules/codeplug/index"

const constellationLabel = {
  gps: "gpsConstellationGps",
  bds: "gpsConstellationBds",
  glonass: "gpsConstellationGlonass",
} as const

const constellationHint = {
  gps: "gpsConstellationGpsHint",
  bds: "gpsConstellationBdsHint",
  glonass: "gpsConstellationGlonassHint",
} as const

function GpsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editGpsSettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("gpsTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SatelliteIcon />
            </EmptyMedia>
            <EmptyTitle>{t("gpsReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getGpsSettings()
  const gpsChangeCount = changes.filter(
    (change) => change.kind === "edit-gps-setting"
  ).length
  const selectedConstellations = isUnknownSettingValue(settings.constellations)
    ? null
    : settings.constellations

  function setConstellation(constellation: GpsConstellation, enabled: boolean) {
    const current = selectedConstellations ?? []
    const next = enabled
      ? GPS_SETTING_OPTIONS.constellations.filter(
          (candidate) =>
            candidate === constellation || current.includes(candidate)
        )
      : current.filter((candidate) => candidate !== constellation)

    if (next.length > 0) editGpsSettings({ constellations: next })
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("gpsTitle")}>
        {gpsChangeCount > 0 && (
          <Badge>{t("pendingChangeCount", { count: gpsChangeCount })}</Badge>
        )}
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("gpsBasicTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <BooleanSettingField
                id="gps-switch"
                label={t("gpsReceiver")}
                value={settings.enabled}
                onChange={(enabled) => editGpsSettings({ enabled })}
              />
              <SelectSettingField
                id="gps-time-zone"
                label={t("gpsTimezone")}
                value={settings.timezoneOffsetMinutes}
                options={numberOptions(
                  GPS_SETTING_OPTIONS.timezoneOffsetsMinutes,
                  formatUtcOffset
                )}
                onChange={(timezoneOffsetMinutes) =>
                  editGpsSettings({ timezoneOffsetMinutes })
                }
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("gpsConstellationsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {GPS_SETTING_OPTIONS.constellations.map((constellation) => {
                const checked =
                  selectedConstellations?.includes(constellation) ?? false
                const lastEnabled =
                  checked && selectedConstellations?.length === 1

                return (
                  <Field
                    key={constellation}
                    orientation="horizontal"
                    data-disabled={lastEnabled || undefined}
                  >
                    <FieldContent>
                      <FieldLabel
                        htmlFor={`gps-constellation-${constellation}`}
                      >
                        {t(constellationLabel[constellation])}
                      </FieldLabel>
                      <FieldDescription>
                        {t(constellationHint[constellation])}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={`gps-constellation-${constellation}`}
                      checked={checked}
                      disabled={lastEnabled}
                      onCheckedChange={(enabled) =>
                        setConstellation(constellation, enabled)
                      }
                    />
                  </Field>
                )
              })}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function formatUtcOffset(offsetMinutes: number) {
  if (offsetMinutes === 0) return "UTC"

  const sign = offsetMinutes < 0 ? "−" : "+"
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export { GpsWorkspace }
