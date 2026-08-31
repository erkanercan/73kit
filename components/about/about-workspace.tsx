"use client"

import {
  BookOpenIcon,
  LaptopIcon,
  RadioIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function AboutWorkspace() {
  const t = useTranslations()
  const sections = [
    {
      icon: RadioIcon,
      title: t("aboutScopeTitle"),
      description: t("aboutScopeDescription"),
    },
    {
      icon: ShieldCheckIcon,
      title: t("aboutSafetyTitle"),
      description: t("aboutSafetyDescription"),
    },
    {
      icon: LaptopIcon,
      title: t("aboutPlatformTitle"),
      description: t("aboutPlatformDescription"),
    },
    {
      icon: BookOpenIcon,
      title: t("aboutUpdaterTitle"),
      description: t("aboutUpdaterDescription"),
    },
  ]

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("aboutTitle")} />
      <div className="grid gap-3 lg:grid-cols-2">
        {sections.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon aria-hidden="true" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

export { AboutWorkspace }
