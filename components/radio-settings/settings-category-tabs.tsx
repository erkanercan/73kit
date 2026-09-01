"use client"

import { useTranslations } from "next-intl"

import { useRadioCpsPath } from "@/components/radio-model-provider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@/i18n/navigation"

const categories = [
  ["functions", "settingsCategoryFunctions"],
  ["display", "settingsCategoryDisplay"],
  ["sounds", "settingsCategorySounds"],
  ["keyboard", "settingsCategoryKeyboard"],
  ["menu", "settingsCategoryMenu"],
] as const

type SettingsCategory = (typeof categories)[number][0]

function SettingsCategoryTabs({ active }: { active: SettingsCategory }) {
  const t = useTranslations()
  const settingsPath = useRadioCpsPath("radio-settings")

  return (
    <Tabs value={active} className="overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max sm:grid sm:w-full sm:grid-cols-5">
        {categories.map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            nativeButton={false}
            render={<Link href={`${settingsPath}/${value}`} />}
          >
            {t(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { SettingsCategoryTabs }
