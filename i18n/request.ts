import { notFound } from "next/navigation"
import { getRequestConfig } from "next-intl/server"

import { isLocale } from "@/i18n/routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !isLocale(locale)) {
    notFound()
  }

  return {
    locale,
    messages: (await import(`@/dictionaries/${locale}`)).default,
    timeZone: "Europe/Istanbul",
  }
})
