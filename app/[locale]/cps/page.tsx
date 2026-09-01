import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { RadioModelSelector } from "@/components/radio-cps/radio-model-selector"
import { isLocale } from "@/i18n/routing"
import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = await getTranslations({ locale })
  return createPageMetadata({
    locale,
    pathname: "/cps",
    title: t("radioCpsTitle"),
    description: t("radioCpsDescription"),
  })
}

export default function RadioCpsPage() {
  return <RadioModelSelector />
}
