import { useTranslations } from "next-intl"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@/i18n/navigation"

const categories = [
  ["functions", "settingsCategoryFunctions", "/radio-settings/functions"],
  ["display", "settingsCategoryDisplay", "/radio-settings/display"],
  ["sounds", "settingsCategorySounds", "/radio-settings/sounds"],
  ["keyboard", "settingsCategoryKeyboard", "/radio-settings/keyboard"],
  ["menu", "settingsCategoryMenu", "/radio-settings/menu"],
] as const

type SettingsCategory = (typeof categories)[number][0]

function SettingsCategoryTabs({ active }: { active: SettingsCategory }) {
  const t = useTranslations()

  return (
    <Tabs value={active} className="overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max sm:grid sm:w-full sm:grid-cols-5">
        {categories.map(([value, label, href]) => (
          <TabsTrigger
            key={value}
            value={value}
            nativeButton={false}
            render={<Link href={href} />}
          >
            {t(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { SettingsCategoryTabs }
