"use client"

import { DownloadIcon, KeyboardIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
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
import type { KeyboardSettingsPatch } from "@/modules/codeplug/index"

import { KeyLockCard } from "./key-lock-card"
import { MenuAndBackKeysCard } from "./menu-and-back-keys-card"
import { NumericKeysCard } from "./numeric-keys-card"
import { SideAndTopKeysCard } from "./side-and-top-keys-card"
import type { EditKeyboardSetting } from "./types"

function KeyboardSettingsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editKeyboardSettings,
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
        <SettingsCategoryTabs active="keyboard" />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyboardIcon />
            </EmptyMedia>
            <EmptyTitle>{t("keyboardSettingsReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getKeyboardSettings()
  const keyboardChangeCount = changes.filter(
    (change) => change.kind === "edit-keyboard-setting"
  ).length
  const edit: EditKeyboardSetting = (field, value) => {
    editKeyboardSettings({ [field]: value } as KeyboardSettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {t("radioSettingsTitle")}
          </h1>
          {keyboardChangeCount > 0 && (
            <Badge>
              {t("pendingChangeCount", { count: keyboardChangeCount })}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("radioSettingsDescription")}
        </p>
      </header>

      <SettingsCategoryTabs active="keyboard" />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SideAndTopKeysCard settings={settings} edit={edit} />
          <KeyLockCard settings={settings} edit={edit} />
        </div>
        <div className="flex flex-col gap-4">
          <NumericKeysCard settings={settings} edit={edit} />
          <MenuAndBackKeysCard settings={settings} edit={edit} />
        </div>
      </div>
    </main>
  )
}

export { KeyboardSettingsWorkspace }
