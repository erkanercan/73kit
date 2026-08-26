import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@/i18n/navigation"

const categories = [
  ["functions", "settingsCategoryFunctions", "/radio-settings/functions"],
  ["display", "settingsCategoryDisplay", "/radio-settings/display"],
  ["sounds", "settingsCategorySounds", "/radio-settings/sounds"],
  ["keyboard", "settingsCategoryKeyboard", null],
  ["menu", "settingsCategoryMenu", null],
] as const

type SettingsCategory = (typeof categories)[number][0]

function SettingsCategoryTabs({ active }: { active: SettingsCategory }) {
  const t = useTranslations()

  return (
    <Tabs value={active} className="overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max sm:grid sm:w-full sm:grid-cols-5">
        {categories.map(([value, label, href]) =>
          href ? (
            <TabsTrigger
              key={value}
              value={value}
              nativeButton={false}
              render={<Link href={href} />}
            >
              {t(label)}
            </TabsTrigger>
          ) : (
            <TabsTrigger key={value} value={value} disabled>
              {t(label)}
              <Badge variant="outline" className="hidden lg:inline-flex">
                {t("planned")}
              </Badge>
            </TabsTrigger>
          )
        )}
      </TabsList>
    </Tabs>
  )
}

export { SettingsCategoryTabs }
