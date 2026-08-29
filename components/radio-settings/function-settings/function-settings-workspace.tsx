"use client"

import { Settings2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { RadioReadButton } from "@/components/radio-read-button"
import { SettingsCategoryTabs } from "@/components/radio-settings/settings-category-tabs"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { FunctionSettingsPatch } from "@/modules/codeplug/index"

import { CitSettingsCard } from "./cit-settings-card"
import { PowerSaveSettingsCard } from "./power-save-settings-card"
import { ScanSettingsCard } from "./scan-settings-card"
import { SteSettingsCard } from "./ste-settings-card"
import { ToneBurstSettingsCard } from "./tone-burst-settings-card"
import { TrxSettingsCard } from "./trx-settings-card"
import type { EditFunctionSetting } from "./types"
import { WeatherSettingsCard } from "./weather-settings-card"

function FunctionSettingsWorkspace() {
  const { busy, capability, completedRead, editFunctionSettings, readRadio } =
    useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("radioSettingsTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings2Icon />
            </EmptyMedia>
            <EmptyTitle>{t("functionSettingsReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <RadioReadButton
              busy={busy}
              disabled={capability !== "available"}
              onClick={() => void readRadio()}
            />
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const settings = codeplug.getFunctionSettings()
  const edit: EditFunctionSetting = (field, value) => {
    editFunctionSettings({ [field]: value } as FunctionSettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioSettingsTitle")} />

      <SettingsCategoryTabs active="functions" />

      <div className="flex flex-col gap-4">
        <TrxSettingsCard settings={settings} edit={edit} />

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <CitSettingsCard settings={settings} edit={edit} />
            <SteSettingsCard settings={settings} edit={edit} />
            <ToneBurstSettingsCard settings={settings} edit={edit} />
          </div>

          <div className="flex flex-col gap-4">
            <ScanSettingsCard settings={settings} edit={edit} />
            <PowerSaveSettingsCard settings={settings} edit={edit} />
            <WeatherSettingsCard settings={settings} edit={edit} />
          </div>
        </div>
      </div>
    </main>
  )
}

export { FunctionSettingsWorkspace }
