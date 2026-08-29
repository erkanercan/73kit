"use client"

import { DownloadIcon, LoaderCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

function RadioReadButton({
  busy,
  compact = false,
  disabled = false,
  readAgain = false,
  size = "default",
  onClick,
}: {
  busy: boolean
  compact?: boolean
  disabled?: boolean
  readAgain?: boolean
  size?: "default" | "sm"
  onClick(): void
}) {
  const t = useTranslations()
  const label = busy
    ? t("readingRadio")
    : readAgain
      ? t("readAgain")
      : t("readRadio")

  return (
    <Button size={size} disabled={disabled || busy} onClick={onClick}>
      {busy ? (
        <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      {compact ? (
        <>
          <span className="hidden sm:inline">{label}</span>
          <span className="sr-only sm:hidden">
            {busy ? t("readingRadioPlain") : label}
          </span>
        </>
      ) : (
        label
      )}
    </Button>
  )
}

export { RadioReadButton }
