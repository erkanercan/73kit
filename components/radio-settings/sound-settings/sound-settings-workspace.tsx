"use client"

import { DownloadIcon, Volume2Icon } from "lucide-react"
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
import type { SoundSettingsPatch } from "@/modules/codeplug/index"

import { AiNoiseReductionCard } from "./ai-noise-reduction-card"
import { AiVoxCard } from "./ai-vox-card"
import { AlertTonesCard } from "./alert-tones-card"
import { MicrophoneGainCard } from "./microphone-gain-card"
import { RxGainCard } from "./rx-gain-card"
import type { EditSoundSetting } from "./types"

function SoundSettingsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editSoundSettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("radioSettingsTitle")} />
        <SettingsCategoryTabs active="sounds" />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Volume2Icon />
            </EmptyMedia>
            <EmptyTitle>{t("soundSettingsReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getSoundSettings()
  const soundChangeCount = changes.filter(
    (change) => change.kind === "edit-sound-setting"
  ).length
  const edit: EditSoundSetting = (field, value) => {
    editSoundSettings({ [field]: value } as SoundSettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioSettingsTitle")}>
        {soundChangeCount > 0 && (
          <Badge>{t("pendingChangeCount", { count: soundChangeCount })}</Badge>
        )}
      </PageHeader>

      <SettingsCategoryTabs active="sounds" />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AlertTonesCard settings={settings} edit={edit} />
          <AiNoiseReductionCard settings={settings} edit={edit} />
        </div>
        <div className="flex flex-col gap-4">
          <MicrophoneGainCard settings={settings} edit={edit} />
          <RxGainCard settings={settings} edit={edit} />
          <AiVoxCard settings={settings} edit={edit} />
        </div>
      </div>
    </main>
  )
}

export { SoundSettingsWorkspace }
