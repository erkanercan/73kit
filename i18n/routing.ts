import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
})

export type Locale = (typeof routing.locales)[number]

export function isLocale(value: string): value is Locale {
  return routing.locales.includes(value as Locale)
}
