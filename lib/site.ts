import type { Locale } from "@/i18n/routing"

const SITE_ORIGIN = new URL("https://cps.erkan.dev")
const SITE_NAME = "TYT UVL-15W Browser CPS"
const SITE_LAST_REVIEWED = new Date("2026-08-31T00:00:00.000Z")
const PUBLIC_INDEXABLE_PATHS = [""] as const

const SITE_DESCRIPTIONS: Record<Locale, string> = {
  en: "Program, back up, and manage a TYT UVL-15W Codeplug locally in a compatible desktop browser.",
  tr: "TYT UVL-15W Codeplug'ını uyumlu bir masaüstü tarayıcıda yerel olarak programlayın, yedekleyin ve yönetin.",
}

function absoluteUrl(pathname = "/") {
  return new URL(pathname, SITE_ORIGIN).toString()
}

function localizedPath(locale: Locale, pathname = "") {
  const suffix = pathname === "/" ? "" : pathname.replace(/^\//, "")

  return suffix ? `/${locale}/${suffix}` : `/${locale}`
}

function localizedAlternates(pathname = "") {
  return {
    en: absoluteUrl(localizedPath("en", pathname)),
    tr: absoluteUrl(localizedPath("tr", pathname)),
    "x-default": absoluteUrl(localizedPath("tr", pathname)),
  }
}

export {
  PUBLIC_INDEXABLE_PATHS,
  SITE_DESCRIPTIONS,
  SITE_LAST_REVIEWED,
  SITE_NAME,
  SITE_ORIGIN,
  absoluteUrl,
  localizedAlternates,
  localizedPath,
}
