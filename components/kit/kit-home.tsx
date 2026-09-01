import { ArrowRightIcon, RadioIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

function KitHome() {
  const t = useTranslations()

  return (
    <main className="flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("kitHomeTitle")} />
      <section
        aria-labelledby="kit-tools-title"
        className="flex flex-col gap-4"
      >
        <h2 id="kit-tools-title" className="font-heading text-lg font-medium">
          {t("kitToolsTitle")}
        </h2>
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>{t("radioCpsTitle")}</CardTitle>
              <CardAction>
                <RadioIcon aria-hidden="true" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm">
              <p>{t("radioCpsDescription")}</p>
            </CardContent>
            <CardFooter className="justify-end">
              <Link href="/cps" className={buttonVariants()}>
                {t("openRadioCps")}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  )
}

export { KitHome }
