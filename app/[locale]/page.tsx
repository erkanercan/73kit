import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { KitHome } from "@/components/kit/kit-home"
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
  return createPageMetadata({
    locale,
    title: "73Kit",
    description: t("kitMetadataDescription"),
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
    name: "73Kit",
    url: canonicalUrl,
    description: t("kitMetadataDescription"),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Windows, macOS, Linux, ChromeOS",
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
      <KitHome />
    </>
  )
}
