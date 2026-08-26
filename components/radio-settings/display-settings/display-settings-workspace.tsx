"use client"

import { DownloadIcon, MonitorCogIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { SettingsCategoryTabs } from "@/components/radio-settings/settings-category-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { DisplaySettingsPatch } from "@/modules/codeplug/index"

import { LcdBacklightCard } from "./lcd-backlight-card"
import { MemoryChannelDisplayCard } from "./memory-channel-display-card"
import { OtherDisplaySettingsCard } from "./other-display-settings-card"
import { PowerOnDisplayCard } from "./power-on-display-card"
import type { EditDisplaySetting } from "./types"
import { UnitsCard } from "./units-card"

function DisplaySettingsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editDisplaySettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("radioSettingsTitle")} />
        <SettingsCategoryTabs active="display" />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MonitorCogIcon />
            </EmptyMedia>
            <EmptyTitle>{t("displaySettingsReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getDisplaySettings()
  const displayChangeCount = changes.filter(
    (change) => change.kind === "edit-display-setting"
  ).length
  const edit: EditDisplaySetting = (field, value) => {
    editDisplaySettings({ [field]: value } as DisplaySettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioSettingsTitle")}>
        {displayChangeCount > 0 && (
          <Badge>
            {t("pendingChangeCount", { count: displayChangeCount })}
          </Badge>
        )}
      </PageHeader>

      <SettingsCategoryTabs active="display" />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <LcdBacklightCard settings={settings} edit={edit} />
          <PowerOnDisplayCard settings={settings} edit={edit} />
          <MemoryChannelDisplayCard settings={settings} edit={edit} />
        </div>
        <div className="flex flex-col gap-4">
          <UnitsCard settings={settings} edit={edit} />
          <OtherDisplaySettingsCard settings={settings} edit={edit} />
        </div>
      </div>
    </main>
  )
}

export { DisplaySettingsWorkspace }
