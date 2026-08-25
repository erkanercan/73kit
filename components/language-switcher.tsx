"use client"

import { useLocale, useTranslations } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

function LanguageSwitcher() {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations()

  return (
    <nav
      aria-label={t("languageSwitcherLabel")}
      className="flex items-center rounded-md border p-0.5"
    >
      {routing.locales.map((nextLocale) => (
        <Link
          key={nextLocale}
          href={pathname}
          locale={nextLocale}
          replace
          aria-current={nextLocale === locale ? "page" : undefined}
          title={nextLocale === "tr" ? t("languageTr") : t("languageEn")}
          className={buttonVariants({
            size: "xs",
            variant: nextLocale === locale ? "secondary" : "ghost",
          })}
        >
          {nextLocale.toUpperCase()}
        </Link>
      ))}
    </nav>
  )
}

export { LanguageSwitcher }
