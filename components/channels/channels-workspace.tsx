"use client"

import { ListIcon, TriangleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { MemoryChannelsCard } from "@/components/channels/memory-channels-card"
import { SpecialChannelsCard } from "@/components/channels/special-channels-card"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { PageHeader } from "@/components/page-header"
import { RadioReadButton } from "@/components/radio-read-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function ChannelsWorkspace() {
  const {
    addMemoryChannel,
    busy,
    capability,
    changes,
    completedRead,
    deleteMemoryChannel,
    duplicateMemoryChannel,
    editCallChannel,
    editChannelMemberships,
    editMemoryChannel,
    editVfoChannel,
    moveMemoryChannel,
    readRadio,
    resetWorkingCodeplug,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-6 lg:p-8">
        <PageHeader title={t("channelsTitle")} />
        <Empty className="min-h-[32rem] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListIcon />
            </EmptyMedia>
            <EmptyTitle>{t("channelsReadRequiredTitle")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <RadioReadButton
              busy={busy}
              disabled={capability !== "available"}
              onClick={() => void readRadio()}
            />
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const channels = codeplug.getChannels()
  const membershipIssues = codeplug.validateMembershipConsistency()
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <PageHeader title={t("channelsTitle")} />

      {membershipIssues.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("membershipConsistencyWarningTitle")}</AlertTitle>
          <AlertDescription>
            {t("membershipConsistencyWarningDescription", {
              count: membershipIssues.length,
            })}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="memory" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="memory">{t("memoryChannels")}</TabsTrigger>
          <TabsTrigger value="vfo">{t("vfoChannels")}</TabsTrigger>
          <TabsTrigger value="call">{t("callChannels")}</TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="min-h-0 overflow-hidden">
          <MemoryChannelsCard
            channels={channels}
            zones={codeplug.getZones()}
            scanLists={codeplug.getScanLists()}
            changeCount={changes.length}
            onAdd={addMemoryChannel}
            onDelete={deleteMemoryChannel}
            onDuplicate={duplicateMemoryChannel}
            onEdit={editMemoryChannel}
            onEditMemberships={editChannelMemberships}
            onMove={moveMemoryChannel}
            onReset={resetWorkingCodeplug}
          />
        </TabsContent>
        <TabsContent value="vfo" className="min-h-0 overflow-hidden">
          <SpecialChannelsCard
            channels={codeplug.getVfoChannels()}
            kind="vfo"
            onEdit={editVfoChannel}
          />
        </TabsContent>
        <TabsContent value="call" className="min-h-0 overflow-hidden">
          <SpecialChannelsCard
            channels={codeplug.getCallChannels()}
            kind="call"
            onEdit={editCallChannel}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

export { ChannelsWorkspace }
