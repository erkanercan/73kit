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
import {
  DownloadIcon,
  ListChecksIcon,
  MapIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { AddCollectionChannelsDrawer } from "@/components/channel-collections/add-collection-channels-drawer"
import { CollectionMemberRow } from "@/components/channel-collections/collection-member-row"
import { ChannelEditorDrawer } from "@/components/channels/channel-editor-drawer"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { BandScanListSelectors } from "@/components/scan-lists/band-scan-list-selectors"
import { BandZoneSelectors } from "@/components/zones/band-zone-selectors"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Channel, ScanList, Zone } from "@/modules/codeplug/index"
import { cn } from "@/lib/utils"

type CollectionKind = "zone" | "scan-list"
type ChannelCollection = Zone | ScanList

const LABELS = {
  zone: {
    title: "zonesTitle",
    readRequiredTitle: "zonesReadRequiredTitle",
    slots: "zoneSlots",
    number: "zoneNumber",
    name: "zoneName",
    nameTooLong: "zoneNameTooLong",
    memberCount: "zoneMemberCount",
    clear: "clearZone",
    empty: "emptyZone",
  },
  "scan-list": {
    title: "scanListsTitle",
    readRequiredTitle: "scanListsReadRequiredTitle",
    slots: "scanListSlots",
    number: "scanListNumber",
    name: "scanListName",
    nameTooLong: "scanListNameTooLong",
    memberCount: "scanListMemberCount",
    clear: "clearScanList",
    empty: "emptyScanList",
  },
} as const

function MembershipCollectionsWorkspace({ kind }: { kind: CollectionKind }) {
  const {
    busy,
    capability,
    changes,
    completedRead,
    editBandScanListSelection,
    editBandZoneSelection,
    editMemoryChannel,
    editScanList,
    editZone,
    readRadio,
  } = useCpsWorkspace()
  const t = useTranslations()
  const labels = LABELS[kind]
  const [selectedNumber, setSelectedNumber] = React.useState(1)
  const [selectedChannelNumber, setSelectedChannelNumber] = React.useState<
    number | null
  >(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const codeplug = completedRead?.workingCodeplug.codeplug ?? null
  const CollectionIcon = kind === "zone" ? MapIcon : ListChecksIcon

  if (!codeplug) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <Card className="w-full">
          <CardContent>
            <Empty className="min-h-[32rem] border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CollectionIcon />
                </EmptyMedia>
                <EmptyTitle>{t(labels.readRequiredTitle)}</EmptyTitle>
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

  const collections: readonly ChannelCollection[] =
    kind === "zone" ? codeplug.getZones() : codeplug.getScanLists()
  const channels = codeplug.getChannels()
  const selectedCollection = collections[selectedNumber - 1] ?? collections[0]
  const members = selectedCollection.channelNumbers
    .map((number) => channels[number - 1])
    .filter((channel): channel is Channel => Boolean(channel))
  const memberNumbers = new Set(selectedCollection.channelNumbers)
  const availableChannels = channels.filter(
    (channel) => channel.valid && !memberNumbers.has(channel.number)
  )
  const selectedChannel = selectedChannelNumber
    ? (channels[selectedChannelNumber - 1] ?? null)
    : null

  function editCollection(
    number: number,
    patch: {
      readonly name?: string
      readonly channelNumbers?: readonly number[]
    }
  ) {
    if (kind === "zone") {
      editZone(number, patch)
    } else {
      editScanList(number, patch)
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          {t(labels.title)}
        </h1>
        {changes.length > 0 && (
          <Badge>{t("pendingChangeCount", { count: changes.length })}</Badge>
        )}
        {kind === "zone" && (
          <BandZoneSelectors
            zones={codeplug.getZones()}
            selections={codeplug.getBandZoneSelections()}
            onChange={editBandZoneSelection}
          />
        )}
        {kind === "scan-list" && (
          <BandScanListSelectors
            scanLists={codeplug.getScanLists()}
            selections={codeplug.getBandScanListSelections()}
            onChange={editBandScanListSelection}
          />
        )}
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="min-h-0 gap-2 py-3">
          <CardHeader className="px-3">
            <CardTitle>{t(labels.slots)}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 px-2">
            <ScrollArea className="h-40 lg:h-full">
              <div className="flex flex-col gap-1 pr-2">
                {collections.map((collection) => (
                  <Button
                    key={collection.number}
                    variant={
                      collection.number === selectedCollection.number
                        ? "secondary"
                        : "ghost"
                    }
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                    onClick={() => setSelectedNumber(collection.number)}
                  >
                    <span
                      className={cn(
                        "shrink-0 truncate font-mono text-xs text-muted-foreground",
                        kind === "zone" ? "w-20" : "w-28"
                      )}
                    >
                      {t(labels.number, { number: collection.number - 1 })}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {collection.name || t("unused")}
                    </span>
                    <Badge variant="outline">
                      {collection.channelNumbers.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <CollectionEditor
          key={`${kind}-${selectedCollection.number}`}
          kind={kind}
          collection={selectedCollection}
          members={members}
          onNameChange={(name) =>
            editCollection(selectedCollection.number, { name })
          }
          onMembersChange={(channelNumbers) =>
            editCollection(selectedCollection.number, { channelNumbers })
          }
          onAdd={() => setAddOpen(true)}
          onInspect={setSelectedChannelNumber}
          onClear={() =>
            editCollection(selectedCollection.number, {
              name: "",
              channelNumbers: [],
            })
          }
        />
      </div>

      <AddCollectionChannelsDrawer
        kind={kind}
        open={addOpen}
        channels={availableChannels}
        onOpenChange={setAddOpen}
        onAdd={(channelNumber) =>
          editCollection(selectedCollection.number, {
            channelNumbers: [
              ...selectedCollection.channelNumbers,
              channelNumber,
            ],
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

function CollectionEditor({
  kind,
  collection,
  members,
  onNameChange,
  onMembersChange,
  onAdd,
  onInspect,
  onClear,
}: {
  kind: CollectionKind
  collection: ChannelCollection
  members: readonly Channel[]
  onNameChange(name: string): void
  onMembersChange(channelNumbers: readonly number[]): void
  onAdd(): void
  onInspect(channelNumber: number): void
  onClear(): void
}) {
  const t = useTranslations()
  const labels = LABELS[kind]
  const [name, setName] = React.useState(collection.name)
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
    if (name !== collection.name) onNameChange(name)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const channelNumbers = members.map((channel) => channel.number)
    const from = channelNumbers.indexOf(Number(event.active.id))
    const to = channelNumbers.indexOf(Number(event.over.id))
    if (from >= 0 && to >= 0) {
      onMembersChange(arrayMove(channelNumbers, from, to))
    }
  }

  const inputId = `${kind}-name-${collection.number}`

  return (
    <Card className="min-h-0 min-w-0 gap-3 py-3">
      <CardHeader className="gap-3 px-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <FieldGroup className="min-w-0 gap-0">
          <Field data-invalid={nameError}>
            <div className="flex items-center gap-2">
              <FieldLabel
                htmlFor={inputId}
                className="text-xs text-muted-foreground"
              >
                {t(labels.number, { number: collection.number - 1 })}
              </FieldLabel>
              <Badge variant="secondary">
                {t(labels.memberCount, { count: members.length })}
              </Badge>
            </div>
            <Input
              id={inputId}
              value={name}
              aria-invalid={nameError}
              placeholder={t(labels.name)}
              onChange={(event) => {
                setName(event.currentTarget.value)
                setNameError(false)
              }}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur()
                if (event.key === "Escape") {
                  setName(collection.name)
                  setNameError(false)
                  event.currentTarget.blur()
                }
              }}
            />
            {nameError && <FieldError>{t(labels.nameTooLong)}</FieldError>}
          </Field>
        </FieldGroup>
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
            disabled={!collection.name && members.length === 0}
            onClick={onClear}
          >
            <Trash2Icon data-icon="inline-start" />
            {t(labels.clear)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 px-3">
        {members.length === 0 ? (
          <Empty className="min-h-0 flex-1 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {kind === "zone" ? <MapIcon /> : <ListChecksIcon />}
              </EmptyMedia>
              <EmptyTitle>{t(labels.empty)}</EmptyTitle>
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
                    {kind === "scan-list" && (
                      <TableHead>{t("scanFlag")}</TableHead>
                    )}
                    <TableHead>
                      <span className="sr-only">{t("channelActions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((channel, index) => (
                    <CollectionMemberRow
                      key={channel.number}
                      kind={kind}
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

export { MembershipCollectionsWorkspace }
export type { CollectionKind }
