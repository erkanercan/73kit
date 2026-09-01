"use client"

import * as React from "react"
import { ArrowRightIcon, RadioIcon, ShieldCheckIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "@/i18n/navigation"
import {
  isRadioModelId,
  listRadioModels,
  radioCpsPath,
  type RadioModelId,
} from "@/modules/radio-support/index"

const radioModels = listRadioModels()
const radioModelItems = radioModels.map((radio) => ({
  label: radio.displayName,
  value: radio.id,
}))

function RadioModelSelector() {
  const t = useTranslations()
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState<RadioModelId | null>(null)
  const selectedRadio = selectedId
    ? radioModels.find((radio) => radio.id === selectedId)
    : undefined

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("selectRadioTitle")} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("radioModel")}</CardTitle>
            <CardAction>
              <RadioIcon aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm">{t("radioModelDescription")}</p>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="radio-model">
                  {t("radioManufacturerAndModel")}
                </FieldLabel>
                <Select
                  items={radioModelItems}
                  value={selectedId}
                  onValueChange={(value) => {
                    if (value && isRadioModelId(value)) setSelectedId(value)
                  }}
                >
                  <SelectTrigger id="radio-model" className="w-full max-w-xl">
                    <SelectValue>
                      {(value) =>
                        radioModelItems.find((item) => item.value === value)
                          ?.label ?? t("selectRadioPlaceholder")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {radioModelItems.map((radio) => (
                        <SelectItem key={radio.value} value={radio.value}>
                          {radio.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("radioFirmwareDetectedLater")}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              disabled={!selectedId}
              onClick={() => {
                if (selectedId) router.push(radioCpsPath(selectedId))
              }}
            >
              {t("continueToRadioCps")}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("firmwareSupportTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">{t("firmwareSupportDescription")}</p>
            {selectedRadio ? (
              <>
                {selectedRadio.firmwareProfiles.map((firmware) => (
                  <div
                    key={firmware.version}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-mono text-sm">
                      {firmware.version}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {t("validated")}
                    </span>
                  </div>
                ))}
                <Alert>
                  <ShieldCheckIcon aria-hidden="true" />
                  <AlertTitle>{t("otherFirmwareNotValidatedTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("otherFirmwareNotValidatedDescription")}
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("selectRadioForFirmware")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export { RadioModelSelector }
