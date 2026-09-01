import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { isLocale } from "@/i18n/routing"
import { createPageMetadata } from "@/lib/seo"
import {
  getRadioModel,
  isRadioModelId,
  listRadioModels,
} from "@/modules/radio-support/index"

export function generateStaticParams() {
  return listRadioModels().map((radio) => ({ radioModel: radio.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; radioModel: string }>
}): Promise<Metadata> {
  const { locale, radioModel } = await params
  if (!isLocale(locale) || !isRadioModelId(radioModel)) return {}
  const t = await getTranslations({ locale })
  const radio = getRadioModel(radioModel)
  return createPageMetadata({
    locale,
    pathname: `/cps/${radio.id}`,
    title: `${radio.displayName} — ${t("radioCpsTitle")}`,
    description: t("radioCpsDescription"),
  })
}

export default async function RadioModelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ radioModel: string }>
}) {
  const { radioModel } = await params
  if (!isRadioModelId(radioModel)) notFound()
  return children
}
