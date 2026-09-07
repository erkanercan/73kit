import type { Locale } from "@/i18n/routing"

const SITE_ORIGIN = new URL("https://73kit.erkan.dev")
const SITE_NAME = "73Kit"
const SITE_LAST_REVIEWED = new Date("2026-09-04T00:00:00.000Z")
const PUBLIC_INDEXABLE_PATHS = ["", "privacy", "cps", "cps/tyt-uvl15w"] as const

const SITE_DESCRIPTIONS: Record<Locale, string> = {
  en: "A growing collection of local-first browser tools, starting with Radio CPS.",
  tr: "Telsiz CPS ile başlayan, giderek büyüyen yerel öncelikli tarayıcı araçları koleksiyonu.",
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
