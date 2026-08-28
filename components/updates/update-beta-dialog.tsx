"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

function UpdateBetaDialog({
  open,
  onAcknowledge,
}: {
  readonly open: boolean
  onAcknowledge(): void
}) {
  const t = useTranslations()

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlertIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("updatesBetaTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("updatesBetaDialogDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="flex list-disc flex-col gap-3 pl-5 text-sm">
          <li>
            <strong>{t("updatesBetaRiskInterruptTitle")}</strong>
            <p className="text-muted-foreground">
              {t("updatesBetaRiskInterruptDescription")}
            </p>
          </li>
          <li>
            <strong>{t("updatesBetaRiskRecoveryTitle")}</strong>
            <p className="text-muted-foreground">
              {t("updatesBetaRiskRecoveryDescription")}
            </p>
          </li>
          <li>
            <strong>{t("updatesBetaRiskPackageTitle")}</strong>
            <p className="text-muted-foreground">
              {t("updatesBetaRiskPackageDescription")}
            </p>
          </li>
        </ul>

        <AlertDialogFooter>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("updatesBetaLeave")}
          </Link>
          <AlertDialogAction onClick={onAcknowledge}>
            {t("updatesBetaContinue")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { UpdateBetaDialog }
