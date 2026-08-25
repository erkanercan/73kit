"use client"

import { DownloadIcon, ListIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { MemoryChannelsCard } from "@/components/channels/memory-channels-card"
import { SpecialChannelsCard } from "@/components/channels/special-channels-card"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    editMemoryChannel,
    moveMemoryChannel,
    readRadio,
    resetWorkingCodeplug,
  } = useCpsWorkspace()
  const t = useTranslations()
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <Card className="w-full">
          <CardContent>
            <Empty className="min-h-[32rem] border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListIcon />
                </EmptyMedia>
                <EmptyTitle>{t("channelsReadRequiredTitle")}</EmptyTitle>
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
          </CardContent>
        </Card>
      </main>
    )
  }

  const channels = codeplug.getChannels()
  const usedCount = channels.filter((channel) => channel.valid).length

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          {t("channelsTitle")}
        </h1>
        <Badge variant="secondary">
          {t("channelsUsedCount", {
            used: usedCount,
            total: channels.length,
          })}
        </Badge>
        {changes.length > 0 && (
          <Badge>{t("pendingChangeCount", { count: changes.length })}</Badge>
        )}
      </header>

      <Tabs defaultValue="memory" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="memory">{t("memoryChannels")}</TabsTrigger>
          <TabsTrigger value="vfo">{t("vfoChannels")}</TabsTrigger>
          <TabsTrigger value="call">{t("callChannels")}</TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="min-h-0 overflow-hidden">
          <MemoryChannelsCard
            channels={channels}
            changeCount={changes.length}
            onAdd={addMemoryChannel}
            onDelete={deleteMemoryChannel}
            onEdit={editMemoryChannel}
            onMove={moveMemoryChannel}
            onReset={resetWorkingCodeplug}
          />
        </TabsContent>
        <TabsContent value="vfo" className="min-h-0 overflow-auto">
          <SpecialChannelsCard
            channels={codeplug.getVfoChannels()}
            kind="vfo"
          />
        </TabsContent>
        <TabsContent value="call" className="min-h-0 overflow-auto">
          <SpecialChannelsCard
            channels={codeplug.getCallChannels()}
            kind="call"
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

export { ChannelsWorkspace }
