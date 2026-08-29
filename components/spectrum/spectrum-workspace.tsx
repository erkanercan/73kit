"use client"

import * as React from "react"
import {
  ChartNoAxesColumnIncreasingIcon,
  ChevronDownIcon,
  DownloadIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import {
  SelectSettingField,
  SettingLabel,
  numberOptions,
  textOptions,
} from "@/components/radio-settings/setting-fields"
import { SettingsCard } from "@/components/radio-settings/settings-card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  SPECTRUM_MAX_FREQUENCY_HZ,
  SPECTRUM_MIN_FREQUENCY_HZ,
  SPECTRUM_SETTING_OPTIONS,
  createSpectrumModeChangePatch,
  isUnknownSettingValue,
  type ScanList,
  type SpectrumMode,
  type SpectrumSettings,
  type SpectrumSettingsPatch,
  type Zone,
} from "@/modules/codeplug/index"

const spectrumModeLabel = {
  center: "spectrumModeCenter",
  edge: "spectrumModeEdge",
  zone: "spectrumModeZone",
  "scan-list": "spectrumModeScanList",
} as const
const scanSpeedLabel = {
  slow: "spectrumScanSpeedSlow",
  mid: "spectrumScanSpeedMid",
  high: "spectrumScanSpeedHigh",
  "very-high": "spectrumScanSpeedVeryHigh",
  turbo: "spectrumScanSpeedTurbo",
} as const
const modulationLabel = {
  fm: "valueFm",
  "fm-narrow": "valueFmNarrow",
  am: "valueAm",
  "am-narrow": "valueAmNarrow",
} as const

function SpectrumWorkspace() {
  const { busy, capability, completedRead, editSpectrumSettings, readRadio } =
    useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug || !completedRead) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("spectrumTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChartNoAxesColumnIncreasingIcon />
            </EmptyMedia>
            <EmptyTitle>{t("spectrumReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getSpectrumSettings()
  const baselineSettings =
    completedRead.baselineBackup.codeplug.getSpectrumSettings()
  function setMode(mode: SpectrumMode) {
    editSpectrumSettings(
      createSpectrumModeChangePatch(settings, baselineSettings, mode)
    )
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("spectrumTitle")} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SettingsCard id="spectrum-general" title={t("spectrumGeneralTitle")}>
          <FieldGroup>
            <SelectSettingField
              id="spectrum-mode"
              label={t("spectrumMode")}
              value={settings.mode}
              options={textOptions(SPECTRUM_SETTING_OPTIONS.modes, (mode) =>
                t(spectrumModeLabel[mode])
              )}
              onChange={setMode}
            />
            <SelectSettingField
              id="spectrum-scan-speed"
              label={t("spectrumScanSpeed")}
              value={settings.scanSpeed}
              options={textOptions(
                SPECTRUM_SETTING_OPTIONS.scanSpeeds,
                (speed) => t(scanSpeedLabel[speed])
              )}
              onChange={(scanSpeed) => editSpectrumSettings({ scanSpeed })}
            />
          </FieldGroup>
        </SettingsCard>

        {settings.mode === "edge" && (
          <SpectrumEdgeCard settings={settings} edit={editSpectrumSettings} />
        )}
        {settings.mode === "zone" && (
          <SpectrumCollectionCard
            kind="zone"
            items={codeplug.getZones()}
            selected={settings.zoneNumbers}
            onChange={(zoneNumbers) => editSpectrumSettings({ zoneNumbers })}
          />
        )}
        {settings.mode === "scan-list" && (
          <SpectrumCollectionCard
            kind="scan-list"
            items={codeplug.getScanLists()}
            selected={settings.scanListNumbers}
            onChange={(scanListNumbers) =>
              editSpectrumSettings({ scanListNumbers })
            }
          />
        )}
      </div>
    </main>
  )
}

function SpectrumEdgeCard({
  settings,
  edit,
}: {
  settings: SpectrumSettings
  edit(patch: SpectrumSettingsPatch): void
}) {
  const t = useTranslations()
  const [customOpen, setCustomOpen] = React.useState(false)
  const modulation = isUnknownSettingValue(settings.modulation)
    ? null
    : settings.modulation
  const step = isUnknownSettingValue(settings.stepKHz) ? null : settings.stepKHz

  return (
    <SettingsCard id="spectrum-edge" title={t("spectrumEdgeTitle")}>
      <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
        <FieldGroup>
          <SelectSettingField
            id="spectrum-step"
            label={t("frequencyStep")}
            value={settings.stepKHz}
            options={numberOptions(
              SPECTRUM_SETTING_OPTIONS.stepsKHz.filter(
                (candidate) =>
                  candidate !== 8.33 ||
                  modulation === "am" ||
                  modulation === "am-narrow"
              ),
              (candidate) => t("valueKilohertz", { value: candidate })
            )}
            onChange={(stepKHz) => edit({ stepKHz })}
          />
          <SelectSettingField
            id="spectrum-modulation"
            label={t("channelMode")}
            value={settings.modulation}
            options={textOptions(
              SPECTRUM_SETTING_OPTIONS.modulations.filter(
                (candidate) =>
                  step !== 8.33 ||
                  candidate === "am" ||
                  candidate === "am-narrow"
              ),
              (candidate) => t(modulationLabel[candidate])
            )}
            onChange={(nextModulation) => edit({ modulation: nextModulation })}
          />
          <Field orientation="horizontal">
            <FieldContent>
              <SettingLabel id="spectrum-custom" label={t("spectrumCustom")} />
              <FieldDescription>
                {t("spectrumCustomDescription")}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="spectrum-custom"
              checked={customOpen}
              onCheckedChange={setCustomOpen}
            />
          </Field>
          <CollapsibleContent>
            <FieldGroup>
              <SpectrumFrequencyField
                key={`lower-${settings.lowerFrequencyHz}`}
                id="spectrum-lower-frequency"
                label={t("spectrumLowerFrequency")}
                value={settings.lowerFrequencyHz}
                otherValue={settings.upperFrequencyHz}
                boundary="lower"
                onChange={(lowerFrequencyHz) => edit({ lowerFrequencyHz })}
              />
              <SpectrumFrequencyField
                key={`upper-${settings.upperFrequencyHz}`}
                id="spectrum-upper-frequency"
                label={t("spectrumUpperFrequency")}
                value={settings.upperFrequencyHz}
                otherValue={settings.lowerFrequencyHz}
                boundary="upper"
                onChange={(upperFrequencyHz) => edit({ upperFrequencyHz })}
              />
            </FieldGroup>
          </CollapsibleContent>
        </FieldGroup>
      </Collapsible>
    </SettingsCard>
  )
}

function SpectrumFrequencyField({
  id,
  label,
  value,
  otherValue,
  boundary,
  onChange,
}: {
  id: "spectrum-lower-frequency" | "spectrum-upper-frequency"
  label: string
  value: number
  otherValue: number
  boundary: "lower" | "upper"
  onChange(value: number): void
}) {
  const t = useTranslations()
  const [draft, setDraft] = React.useState(formatMHz(value))
  const parsedMHz = Number(draft)
  const parsedHz = parsedMHz * 1_000_000
  const frequencyInvalid =
    draft === "" ||
    !Number.isFinite(parsedMHz) ||
    !Number.isInteger(parsedHz) ||
    parsedHz < SPECTRUM_MIN_FREQUENCY_HZ ||
    parsedHz > SPECTRUM_MAX_FREQUENCY_HZ
  const rangeInvalid =
    !frequencyInvalid &&
    (boundary === "lower" ? parsedHz > otherValue : parsedHz < otherValue)
  const invalid = frequencyInvalid || rangeInvalid

  function commit() {
    if (invalid) {
      setDraft(formatMHz(value))
      return
    }
    if (parsedHz !== value) onChange(parsedHz)
  }

  return (
    <Field orientation="responsive" data-invalid={invalid || undefined}>
      <FieldContent>
        <SettingLabel id={id} label={label} />
        <FieldError>
          {frequencyInvalid
            ? t("spectrumFrequencyInvalid")
            : rangeInvalid
              ? t("spectrumFrequencyRangeInvalid")
              : undefined}
        </FieldError>
      </FieldContent>
      <div className="flex w-full items-center gap-2 sm:w-64">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={SPECTRUM_MIN_FREQUENCY_HZ / 1_000_000}
          max={SPECTRUM_MAX_FREQUENCY_HZ / 1_000_000}
          step={0.000001}
          value={draft}
          aria-invalid={invalid}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setDraft(formatMHz(value))
              event.currentTarget.blur()
            }
          }}
        />
        <span className="shrink-0 text-sm text-muted-foreground">MHz</span>
      </div>
    </Field>
  )
}

function SpectrumCollectionCard({
  kind,
  items,
  selected,
  onChange,
}: {
  kind: "zone" | "scan-list"
  items: readonly (Zone | ScanList)[]
  selected: readonly number[]
  onChange(numbers: readonly number[]): void
}) {
  const t = useTranslations()
  const title =
    kind === "zone" ? t("spectrumZonesTitle") : t("spectrumScanListsTitle")
  const label = kind === "zone" ? t("spectrumZones") : t("spectrumScanLists")
  const triggerId = `spectrum-${kind}-selection`

  function toggle(number: number, checked: boolean) {
    const next = checked
      ? [...selected, number].sort((left, right) => left - right)
      : selected.filter((candidate) => candidate !== number)
    if (next.length > 0) onChange(next)
  }

  return (
    <SettingsCard id={`spectrum-${kind}`} title={title}>
      <Field orientation="responsive">
        <FieldContent>
          <FieldLabel htmlFor={triggerId}>{label}</FieldLabel>
          <FieldDescription>
            {t("spectrumCollectionDescription")}
          </FieldDescription>
        </FieldContent>
        <DropdownMenu>
          <DropdownMenuTrigger
            id={triggerId}
            render={<Button variant="outline" className="sm:w-64" />}
            className="justify-between"
          >
            <span className="truncate">
              {kind === "zone"
                ? t("selectedZonesCount", { count: selected.length })
                : t("selectedScanListsCount", { count: selected.length })}
            </span>
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {items.map((item) => {
                const checked = selected.includes(item.number)
                return (
                  <DropdownMenuCheckboxItem
                    key={item.number}
                    checked={checked}
                    disabled={checked && selected.length === 1}
                    onCheckedChange={(nextChecked) =>
                      toggle(item.number, nextChecked)
                    }
                  >
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {kind === "zone"
                        ? t("zoneNumber", { number: item.number - 1 })
                        : t("scanListNumber", { number: item.number - 1 })}
                    </span>
                    <span className="truncate">{item.name || t("unused")}</span>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Field>
    </SettingsCard>
  )
}

function formatMHz(frequencyHz: number) {
  return (frequencyHz / 1_000_000)
    .toFixed(6)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
}

export { SpectrumWorkspace }
