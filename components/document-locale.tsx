"use client"

import * as React from "react"

import type { Locale } from "@/i18n/routing"

function DocumentLocale({ locale }: { locale: Locale }) {
  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}

export { DocumentLocale }
