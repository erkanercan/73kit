"use client"

import * as React from "react"
import {
  FileArchiveIcon,
  FileCheck2Icon,
  LoaderCircleIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  PackageKindLabel,
  UpdateErrorAlert,
} from "@/components/updates/update-ui"

function PackageSelection() {
  const {
    busy,
    clearPackage,
    errorCode,
    phase,
    selectedPackage,
    selectPackage,
  } = useUpdateCoordinator()
  const t = useTranslations()
  const locale = useLocale()
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("updatesPackageTitle")}</CardTitle>
        {selectedPackage && (
          <CardAction>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={clearPackage}
            >
              {t("updatesChooseDifferent")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".Fir,.fir,.DAT,.dat"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void selectPackage(file)
            event.currentTarget.value = ""
          }}
        />

        {phase === "validating-package" ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LoaderCircleIcon className="animate-spin" />
              </EmptyMedia>
              <EmptyTitle>{t("updatesValidatingPackage")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : selectedPackage ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileCheck2Icon aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {selectedPackage.fileName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PackageKindLabel kind={selectedPackage.kind} />
                  <span>{selectedPackage.version}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("updatesPackageFacts", {
                      size: new Intl.NumberFormat(locale, {
                        style: "unit",
                        unit: "byte",
                        unitDisplay: "short",
                      }).format(selectedPackage.byteLength),
                      blocks: selectedPackage.blockCount,
                    })}
                  </span>
                </div>
              </div>
              <ShieldCheckIcon aria-label={t("updatesPackageValidated")} />
            </div>
            <Alert>
              <ShieldCheckIcon aria-hidden="true" />
              <AlertTitle>{t("updatesPackageValidated")}</AlertTitle>
              <AlertDescription>
                {t("updatesPackageValidatedHint")}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileArchiveIcon />
              </EmptyMedia>
              <EmptyTitle>{t("updatesSelectPackage")}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => inputRef.current?.click()}>
                <UploadIcon data-icon="inline-start" />
                {t("updatesBrowsePackage")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("updatesAcceptedPackages")}
              </p>
            </EmptyContent>
          </Empty>
        )}

        {errorCode && <UpdateErrorAlert code={errorCode} />}
      </CardContent>
    </Card>
  )
}

export { PackageSelection }
