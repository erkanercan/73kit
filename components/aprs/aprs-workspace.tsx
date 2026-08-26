"use client"

import { DownloadIcon, WaypointsIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AprsSettingsPatch } from "@/modules/codeplug/index"

import { AprsReceiveTab } from "./aprs-receive-tab"
import { AprsStationTab } from "./aprs-station-tab"
import { AprsTncTab } from "./aprs-tnc-tab"
import { AprsTransmitChannelsTab } from "./aprs-transmit-channels-tab"
import type { EditAprsSetting } from "./types"

function AprsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editAprsSettings,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("aprsTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WaypointsIcon />
            </EmptyMedia>
            <EmptyTitle>{t("aprsReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              disabled={busy || capability !== "available"}
              onClick={() => void readRadio()}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("readRadio")}
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const settings = codeplug.getAprsSettings()
  const aprsChangeCount = changes.filter(
    (change) => change.kind === "edit-aprs-setting"
  ).length
  const edit: EditAprsSetting = (field, value) =>
    editAprsSettings({ [field]: value } as AprsSettingsPatch)

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("aprsTitle")}>
        {aprsChangeCount > 0 && (
          <Badge>{t("pendingChangeCount", { count: aprsChangeCount })}</Badge>
        )}
      </PageHeader>

      <Tabs defaultValue="station" className="gap-6">
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="station">
            {t("aprsTabStationBeacon")}
          </TabsTrigger>
          <TabsTrigger value="receive">{t("aprsTabReceive")}</TabsTrigger>
          <TabsTrigger value="tx-channels">
            {t("aprsTabTxChannels")}
          </TabsTrigger>
          <TabsTrigger value="tnc">{t("aprsTabTnc")}</TabsTrigger>
        </TabsList>
        <TabsContent value="station">
          <AprsStationTab settings={settings} edit={edit} />
        </TabsContent>
        <TabsContent value="receive">
          <AprsReceiveTab settings={settings} edit={edit} />
        </TabsContent>
        <TabsContent value="tx-channels">
          <AprsTransmitChannelsTab settings={settings} edit={edit} />
        </TabsContent>
        <TabsContent value="tnc">
          <AprsTncTab settings={settings} edit={edit} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

export { AprsWorkspace }
