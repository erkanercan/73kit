import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"

import { ApplicationShell } from "@/components/application-shell"
import { AnalyticsNotice } from "@/components/analytics/analytics-notice"
import { DocumentLocale } from "@/components/document-locale"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isLocale, routing } from "@/i18n/routing"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!isLocale(locale)) {
    return {}
  }

  const t = await getTranslations({ locale })

  return {
    title: "73Kit",
    description: t("metadataDescription"),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocale(locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale locale={locale} />
      <TooltipProvider>
        <ApplicationShell>{children}</ApplicationShell>
        <AnalyticsNotice />
      </TooltipProvider>
    </NextIntlClientProvider>
  )
}
