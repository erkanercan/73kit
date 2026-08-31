import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { OverviewWorkspace } from "@/components/overview-workspace"
import { isLocale } from "@/i18n/routing"
import { createPageMetadata, serializeJsonLd } from "@/lib/seo"
import { absoluteUrl, localizedPath, SITE_LAST_REVIEWED } from "@/lib/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!isLocale(locale)) return {}

  const t = await getTranslations({ locale })
  const title =
    locale === "tr"
      ? "Tekser TR-UV15 / TYT UVL-15W Tarayıcı CPS"
      : "TYT UVL-15W Browser CPS"

  return createPageMetadata({
    locale,
    title,
    description: t("metadataDescription"),
  })
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocale(locale)) return null

  const t = await getTranslations({ locale })
  const canonicalUrl = absoluteUrl(localizedPath(locale))
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TYT UVL-15W Browser CPS",
    alternateName: "Tekser TR-UV15 Tarayıcı CPS",
    url: canonicalUrl,
    description: t("metadataDescription"),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Windows, macOS, Linux, ChromeOS",
    browserRequirements:
      "Desktop Chromium browser with Web Serial in a secure context",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
    },
    inLanguage: ["tr", "en"],
    author: {
      "@type": "Person",
      name: "Erkan",
      url: "https://erkan.dev",
    },
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    dateModified: SITE_LAST_REVIEWED.toISOString(),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <OverviewWorkspace />
    </>
  )
}
