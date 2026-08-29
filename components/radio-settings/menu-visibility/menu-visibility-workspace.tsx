"use client"

import { ListTreeIcon } from "lucide-react"
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

import { MenuVisibilityCard } from "./menu-visibility-card"

function MenuVisibilityWorkspace() {
  const { busy, capability, completedRead, readRadio, setMenuVisibility } =
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
              <ListTreeIcon />
            </EmptyMedia>
            <EmptyTitle>{t("menuVisibilityReadRequiredTitle")}</EmptyTitle>
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

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("radioSettingsTitle")} />

      <SettingsCategoryTabs active="menu" />
      <MenuVisibilityCard
        visibility={codeplug.getMenuVisibility()}
        onSetVisibility={setMenuVisibility}
      />
    </main>
  )
}

export { MenuVisibilityWorkspace }
