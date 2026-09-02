import { notFound } from "next/navigation"
import { getRequestConfig } from "next-intl/server"

import { isLocale } from "@/i18n/routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !isLocale(locale)) {
    notFound()
  }

  const messages =
    locale === "en"
      ? (await import("@/dictionaries/en")).default
      : (await import("@/dictionaries/tr")).default

  return {
    locale,
    messages,
    timeZone: "Europe/Istanbul",
  }
})
