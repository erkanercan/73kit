"use client"

import { DownloadIcon, Settings2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { SettingsCategoryTabs } from "./settings-category-tabs"
import { SteSettingsCard } from "./ste-settings-card"
import { ToneBurstSettingsCard } from "./tone-burst-settings-card"
import { TrxSettingsCard } from "./trx-settings-card"
import type { EditFunctionSetting } from "./types"
import { WeatherSettingsCard } from "./weather-settings-card"

function FunctionSettingsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editFunctionSettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {t("radioSettingsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("radioSettingsDescription")}
          </p>
        </header>
        <SettingsCategoryTabs />
        <Card className="w-full">
          <CardContent>
            <Empty className="min-h-[32rem] border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Settings2Icon />
                </EmptyMedia>
                <EmptyTitle>
                  {t("functionSettingsReadRequiredTitle")}
                </EmptyTitle>
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
          </CardContent>
        </Card>
      </main>
    )
  }

  const settings = codeplug.getFunctionSettings()
  const functionChangeCount = changes.filter(
    (change) => change.kind === "edit-function-setting"
  ).length

  const edit: EditFunctionSetting = (field, value) => {
    editFunctionSettings({ [field]: value } as FunctionSettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {t("radioSettingsTitle")}
          </h1>
          {functionChangeCount > 0 && (
            <Badge>
              {t("pendingChangeCount", { count: functionChangeCount })}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("radioSettingsDescription")}
        </p>
      </header>

      <SettingsCategoryTabs />

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
