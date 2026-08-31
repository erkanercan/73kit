import type { Metadata } from "next"

import type { Locale } from "@/i18n/routing"
import {
  absoluteUrl,
  localizedAlternates,
  localizedPath,
  SITE_NAME,
} from "@/lib/site"

type PageMetadataInput = {
  locale: Locale
  pathname?: string
  title: string
  description: string
  index?: boolean
}

function createPageMetadata({
  locale,
  pathname = "",
  title,
  description,
  index = true,
}: PageMetadataInput): Metadata {
  const canonicalPath = localizedPath(locale, pathname)
  const canonicalUrl = absoluteUrl(canonicalPath)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: localizedAlternates(pathname),
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: locale === "tr" ? ["en_US"] : ["tr_TR"],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index,
      follow: true,
    },
  }
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export { createPageMetadata, serializeJsonLd }
