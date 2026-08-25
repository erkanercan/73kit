"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { DownloadIcon, MapIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorDrawer } from "@/components/channels/channel-editor-drawer"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { AddZoneChannelsDrawer } from "@/components/zones/add-zone-channels-drawer"
import { BandZoneSelectors } from "@/components/zones/band-zone-selectors"
import { ZoneMemberRow } from "@/components/zones/zone-member-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Channel } from "@/modules/codeplug/index"

function ZonesWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editBandZoneSelection,
    editMemoryChannel,
    editZone,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const [selectedZoneNumber, setSelectedZoneNumber] = React.useState(1)
  const [selectedChannelNumber, setSelectedChannelNumber] = React.useState<
    number | null
  >(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null

  if (!codeplug) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <Card className="w-full">
          <CardContent>
            <Empty className="min-h-[32rem] border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapIcon />
                </EmptyMedia>
                <EmptyTitle>{t("zonesReadRequiredTitle")}</EmptyTitle>
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

  const zones = codeplug.getZones()
  const bandZoneSelections = codeplug.getBandZoneSelections()
  const channels = codeplug.getChannels()
  const selectedZone = zones[selectedZoneNumber - 1] ?? zones[0]
  const members = selectedZone.channelNumbers
    .map((number) => channels[number - 1])
    .filter((channel): channel is Channel => Boolean(channel))
  const memberNumbers = new Set(selectedZone.channelNumbers)
  const availableChannels = channels.filter(
    (channel) => channel.valid && !memberNumbers.has(channel.number)
  )
  const selectedChannel = selectedChannelNumber
    ? (channels[selectedChannelNumber - 1] ?? null)
    : null

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          {t("zonesTitle")}
        </h1>
        {changes.length > 0 && (
          <Badge>{t("pendingChangeCount", { count: changes.length })}</Badge>
        )}
        <BandZoneSelectors
          zones={zones}
          selections={bandZoneSelections}
          onChange={editBandZoneSelection}
        />
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="min-h-0 gap-2 py-3">
          <CardHeader className="px-3">
            <CardTitle>{t("zoneSlots")}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 px-2">
            <ScrollArea className="h-40 lg:h-full">
              <div className="space-y-1 pr-2">
                {zones.map((zone) => (
                  <Button
                    key={zone.number}
                    variant={
                      zone.number === selectedZone.number
                        ? "secondary"
                        : "ghost"
                    }
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                    onClick={() => setSelectedZoneNumber(zone.number)}
                  >
                    <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                      {t("zoneNumber", { number: zone.number - 1 })}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {zone.name || t("unused")}
                    </span>
                    <Badge variant="outline">
                      {zone.channelNumbers.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <ZoneEditor
          key={selectedZone.number}
          zoneNumber={selectedZone.number}
          zoneName={selectedZone.name}
          members={members}
          onNameChange={(name) => editZone(selectedZone.number, { name })}
          onMembersChange={(channelNumbers) =>
            editZone(selectedZone.number, { channelNumbers })
          }
          onAdd={() => setAddOpen(true)}
          onInspect={setSelectedChannelNumber}
          onClear={() =>
            editZone(selectedZone.number, { name: "", channelNumbers: [] })
          }
        />
      </div>

      <AddZoneChannelsDrawer
        open={addOpen}
        channels={availableChannels}
        onOpenChange={setAddOpen}
        onAdd={(channelNumber) =>
          editZone(selectedZone.number, {
            channelNumbers: [...selectedZone.channelNumbers, channelNumber],
          })
        }
      />
      <ChannelEditorDrawer
        channel={selectedChannel}
        onEdit={editMemoryChannel}
        onOpenChange={(open) => !open && setSelectedChannelNumber(null)}
      />
    </main>
  )
}

function ZoneEditor({
  zoneNumber,
  zoneName,
  members,
  onNameChange,
  onMembersChange,
  onAdd,
  onInspect,
  onClear,
}: {
  zoneNumber: number
  zoneName: string
  members: readonly Channel[]
  onNameChange(name: string): void
  onMembersChange(channelNumbers: readonly number[]): void
  onAdd(): void
  onInspect(channelNumber: number): void
  onClear(): void
}) {
  const t = useTranslations()
  const [name, setName] = React.useState(zoneName)
  const [nameError, setNameError] = React.useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function commitName() {
    if (new TextEncoder().encode(name).byteLength > 24) {
      setNameError(true)
      return
    }
    setNameError(false)
    if (name !== zoneName) onNameChange(name)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const channelNumbers = members.map((channel) => channel.number)
    const from = channelNumbers.indexOf(Number(event.active.id))
    const to = channelNumbers.indexOf(Number(event.over.id))
    if (from >= 0 && to >= 0)
      onMembersChange(arrayMove(channelNumbers, from, to))
  }

  return (
    <Card className="min-h-0 min-w-0 gap-3 py-3">
      <CardHeader className="gap-3 px-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`zone-name-${zoneNumber}`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t("zoneNumber", { number: zoneNumber - 1 })}
            </label>
            <Badge variant="secondary">
              {t("zoneMemberCount", { count: members.length })}
            </Badge>
          </div>
          <Input
            id={`zone-name-${zoneNumber}`}
            value={name}
            aria-invalid={nameError}
            placeholder={t("zoneName")}
            onChange={(event) => {
              setName(event.currentTarget.value)
              setNameError(false)
            }}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
              if (event.key === "Escape") {
                setName(zoneName)
                setNameError(false)
                event.currentTarget.blur()
              }
            }}
          />
          {nameError && (
            <p className="text-xs text-destructive">{t("zoneNameTooLong")}</p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={members.length >= 128}
            onClick={onAdd}
          >
            <PlusIcon data-icon="inline-start" />
            {t("addChannels")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!zoneName && members.length === 0}
            onClick={onClear}
          >
            <Trash2Icon data-icon="inline-start" />
            {t("clearZone")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 px-3">
        {members.length === 0 ? (
          <Empty className="min-h-0 flex-1 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapIcon />
              </EmptyMedia>
              <EmptyTitle>{t("emptyZone")}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={onAdd}>
                <PlusIcon data-icon="inline-start" />
                {t("addChannels")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={members.map((channel) => channel.number)}
              strategy={verticalListSortingStrategy}
            >
              <Table containerClassName="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-10">
                      <span className="sr-only">{t("moveChannel")}</span>
                    </TableHead>
                    <TableHead className="w-14">{t("position")}</TableHead>
                    <TableHead className="w-16">{t("channelNumber")}</TableHead>
                    <TableHead>{t("rxFrequency")}</TableHead>
                    <TableHead>{t("txFrequency")}</TableHead>
                    <TableHead>{t("channelName")}</TableHead>
                    <TableHead>{t("txPower")}</TableHead>
                    <TableHead>{t("sqlType")}</TableHead>
                    <TableHead>
                      <span className="sr-only">{t("channelActions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((channel, index) => (
                    <ZoneMemberRow
                      key={channel.number}
                      channel={channel}
                      position={index + 1}
                      onInspect={() => onInspect(channel.number)}
                      onRemove={() =>
                        onMembersChange(
                          members
                            .filter((item) => item.number !== channel.number)
                            .map((item) => item.number)
                        )
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

export { ZonesWorkspace }
