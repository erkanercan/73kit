"use client"

import { KeyboardIcon } from "lucide-react"
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
import type { KeyboardSettingsPatch } from "@/modules/codeplug/index"

import { KeyLockCard } from "./key-lock-card"
import { MenuAndBackKeysCard } from "./menu-and-back-keys-card"
import { NumericKeysCard } from "./numeric-keys-card"
import { SideAndTopKeysCard } from "./side-and-top-keys-card"
import type { EditKeyboardSetting } from "./types"

function KeyboardSettingsWorkspace() {
  const { busy, capability, completedRead, editKeyboardSettings, readRadio } =
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
              <KeyboardIcon />
            </EmptyMedia>
            <EmptyTitle>{t("keyboardSettingsReadRequiredTitle")}</EmptyTitle>
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

  const settings = codeplug.getKeyboardSettings()
  const edit: EditKeyboardSetting = (field, value) => {
    editKeyboardSettings({ [field]: value } as KeyboardSettingsPatch)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioSettingsTitle")} />

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
