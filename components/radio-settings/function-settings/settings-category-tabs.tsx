import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const categories = [
  ["functions", "settingsCategoryFunctions", false],
  ["display", "settingsCategoryDisplay", true],
  ["sounds", "settingsCategorySounds", true],
  ["keyboard", "settingsCategoryKeyboard", true],
  ["menu", "settingsCategoryMenu", true],
] as const

function SettingsCategoryTabs() {
  const t = useTranslations()

  return (
    <Tabs value="functions" className="overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max sm:grid sm:w-full sm:grid-cols-5">
        {categories.map(([value, label, planned]) => (
          <TabsTrigger key={value} value={value} disabled={planned}>
            {t(label)}
            {planned && (
              <Badge variant="outline" className="hidden lg:inline-flex">
                {t("planned")}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { SettingsCategoryTabs }
