"use client"

import { DownloadIcon, ListTreeIcon } from "lucide-react"
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

import { MenuVisibilityCard } from "./menu-visibility-card"

function MenuVisibilityWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    readRadio,
    setMenuVisibility,
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
        <SettingsCategoryTabs active="menu" />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTreeIcon />
            </EmptyMedia>
            <EmptyTitle>{t("menuVisibilityReadRequiredTitle")}</EmptyTitle>
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

  const menuChangeCount = changes.filter(
    (change) => change.kind === "edit-menu-visibility"
  ).length

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {t("radioSettingsTitle")}
          </h1>
          {menuChangeCount > 0 && (
            <Badge>{t("pendingChangeCount", { count: menuChangeCount })}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("radioSettingsDescription")}
        </p>
      </header>

      <SettingsCategoryTabs active="menu" />
      <MenuVisibilityCard
        visibility={codeplug.getMenuVisibility()}
        onSetVisibility={setMenuVisibility}
      />
    </main>
  )
}

export { MenuVisibilityWorkspace }
