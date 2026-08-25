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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import {
  Columns3Icon,
  DownloadIcon,
  GripVerticalIcon,
  ListIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Channel, SpecialChannel } from "@/modules/codeplug/index"

const ADVANCED_COLUMN_IDS = [
  "txFrequency",
  "offset",
  "reverse",
  "step",
  "rxOnly",
  "bclo",
  "squelch",
  "dcsPolarity",
  "compander",
  "optionalSignaling",
  "scrambler",
  "pttId",
  "aprsReceive",
] as const

function ChannelsWorkspace() {
  const {
    busy,
    capability,
    changes,
    completedRead,
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
          <Badge>{t("pendingChannelMoves", { count: changes.length })}</Badge>
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

function MemoryChannelsCard({
  channels,
  changeCount,
  onMove,
  onReset,
}: {
  channels: readonly Channel[]
  changeCount: number
  onMove(fromNumber: number, toNumber: number): void
  onReset(): void
}) {
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const [usedOnly, setUsedOnly] = React.useState(true)
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(
    null
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      Object.fromEntries(ADVANCED_COLUMN_IDS.map((id) => [id, false]))
    )

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleChannels = React.useMemo(
    () =>
      channels.filter((channel) => {
        if (usedOnly && !channel.valid) {
          return false
        }
        if (!normalizedSearch) {
          return true
        }

        const haystack = [
          channel.number,
          channel.name,
          formatFrequency(channel.receiveFrequencyHz),
          formatFrequency(channel.transmitFrequencyHz),
        ]
          .join(" ")
          .toLocaleLowerCase()

        return haystack.includes(normalizedSearch)
      }),
    [channels, normalizedSearch, usedOnly]
  )

  const columns = React.useMemo(
    () => createMemoryColumns(t, setSelectedChannel, normalizedSearch !== ""),
    [normalizedSearch, t]
  )
  // TanStack Table intentionally returns stateful functions that React Compiler
  // cannot memoize. The table owns that state and remains outside compilation.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: visibleChannels,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (channel) => String(channel.number),
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnVisibility },
  })
  const rows = table.getRowModel().rows
  const scrollElement = React.useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement.current,
    estimateSize: () => 44,
    overscan: 12,
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || normalizedSearch) {
      return
    }
    onMove(Number(event.active.id), Number(event.over.id))
  }

  function showBasicColumns() {
    setColumnVisibility(
      Object.fromEntries(ADVANCED_COLUMN_IDS.map((id) => [id, false]))
    )
  }

  function showAdvancedColumns() {
    setColumnVisibility(
      Object.fromEntries(ADVANCED_COLUMN_IDS.map((id) => [id, true]))
    )
  }

  return (
    <>
      <section className="flex h-full min-h-0 min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              aria-label={t("searchChannels")}
              placeholder={t("searchChannelsPlaceholder")}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </InputGroup>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={usedOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setUsedOnly(true)}
            >
              {t("usedChannelsOnly")}
            </Button>
            <Button
              variant={!usedOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setUsedOnly(false)}
            >
              {t("allChannelSlots")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <Columns3Icon data-icon="inline-start" />
                {t("columnVisibility")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("columnVisibility")}</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={ADVANCED_COLUMN_IDS.every(
                      (id) => columnVisibility[id] !== false
                    )}
                    onCheckedChange={(checked) =>
                      checked ? showAdvancedColumns() : showBasicColumns()
                    }
                  >
                    <SlidersHorizontalIcon />
                    {t("advancedColumns")}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) =>
                          column.toggleVisibility(checked)
                        }
                      >
                        {column.columnDef.header as string}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {changeCount > 0 && (
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcwIcon data-icon="inline-start" />
                {t("resetChannelOrder")}
              </Button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>{t("noMatchingChannels")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable: t("channelReorderHelp"),
              },
              announcements: {
                onDragStart({ active }) {
                  return t("dragChannel", { number: Number(active.id) })
                },
                onDragOver({ active, over }) {
                  return over
                    ? t("channelMoveAnnouncement", {
                        from: Number(active.id),
                        to: Number(over.id),
                      })
                    : undefined
                },
                onDragEnd({ active, over }) {
                  return over
                    ? t("channelMoveAnnouncement", {
                        from: Number(active.id),
                        to: Number(over.id),
                      })
                    : t("channelMoveCancelled")
                },
                onDragCancel() {
                  return t("channelMoveCancelled")
                },
              },
            }}
          >
            <SortableContext
              items={rows.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                containerRef={scrollElement}
                containerClassName="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border"
                className="grid min-w-[1500px]"
              >
                <TableHeader className="sticky top-0 z-10 grid bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="flex w-full">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="flex shrink-0 items-center"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody
                  className="relative grid"
                  style={{ height: rowVirtualizer.getTotalSize() }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    return (
                      <SortableChannelRow
                        key={row.id}
                        row={row}
                        virtualRow={virtualRow}
                        reorderDisabled={normalizedSearch !== ""}
                        onInspect={() => setSelectedChannel(row.original)}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <ChannelDetailsSheet
        channel={selectedChannel}
        onOpenChange={(open) => !open && setSelectedChannel(null)}
      />
    </>
  )
}

function SortableChannelRow({
  row,
  virtualRow,
  reorderDisabled,
  onInspect,
}: {
  row: ReturnType<
    ReturnType<typeof useReactTable<Channel>>["getRowModel"]
  >["rows"][number]
  virtualRow: VirtualItem
  reorderDisabled: boolean
  onInspect(): void
}) {
  const t = useTranslations()
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: row.id, disabled: reorderDisabled })
  const dragTransform = CSS.Transform.toString(transform)

  return (
    <TableRow
      ref={setNodeRef}
      data-state={isDragging ? "selected" : undefined}
      className="absolute flex w-full"
      style={{
        height: virtualRow.size,
        transform: `translateY(${virtualRow.start}px)${dragTransform ? ` ${dragTransform}` : ""}`,
        transition,
      }}
      onDoubleClick={onInspect}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className="flex shrink-0 items-center overflow-hidden"
          style={{ width: cell.column.getSize() }}
        >
          {cell.column.id === "move" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={reorderDisabled}
              aria-label={t("dragChannel", { number: row.original.number })}
              title={
                reorderDisabled
                  ? t("reorderSearchDisabled")
                  : t("channelReorderHelp")
              }
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon />
            </Button>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

function createMemoryColumns(
  t: ReturnType<typeof useTranslations>,
  onInspect: (channel: Channel) => void,
  reorderDisabled: boolean
): ColumnDef<Channel>[] {
  return [
    {
      id: "move",
      header: () => <span className="sr-only">{t("moveChannel")}</span>,
      size: 56,
      enableHiding: false,
    },
    {
      accessorKey: "number",
      header: t("channelNumber"),
      size: 64,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {String(row.original.number).padStart(4, "0")}
        </span>
      ),
    },
    {
      accessorKey: "valid",
      header: t("used"),
      size: 92,
      cell: ({ row }) => (
        <Badge variant={row.original.valid ? "secondary" : "outline"}>
          {row.original.valid ? t("used") : t("unused")}
        </Badge>
      ),
    },
    {
      accessorKey: "name",
      header: t("channelName"),
      size: 180,
      cell: ({ row }) => (
        <span className="truncate font-medium">
          {row.original.name || t("unused")}
        </span>
      ),
    },
    frequencyColumn("receiveFrequencyHz", "rxFrequency", t, 142),
    frequencyColumn("transmitFrequencyHz", "txFrequency", t, 142),
    {
      accessorKey: "duplex",
      header: t("duplex"),
      size: 96,
      cell: ({ row }) => channelValue(row.original.duplex, t),
    },
    {
      id: "txOrOffset",
      header: t("txOrOffset"),
      size: 150,
      cell: ({ row }) => {
        const channel = row.original
        if (channel.duplex === "split") {
          return (
            <span className="font-mono">
              {formatFrequency(channel.transmitFrequencyHz)}
            </span>
          )
        }
        if (channel.duplex === "positive" || channel.duplex === "negative") {
          return (
            <span className="font-mono">
              {channel.duplex === "positive" ? "+" : "−"}
              {formatFrequency(channel.offsetFrequencyHz)}
            </span>
          )
        }
        return t("simplex")
      },
    },
    frequencyColumn("offsetFrequencyHz", "offset", t, 122),
    {
      accessorKey: "modulation",
      header: t("channelMode"),
      size: 112,
      cell: ({ row }) => channelValue(row.original.modulation, t),
    },
    {
      accessorKey: "transmitPower",
      header: t("txPower"),
      size: 92,
      cell: ({ row }) => channelValue(row.original.transmitPower, t),
    },
    {
      id: "txTone",
      header: t("txTone"),
      size: 118,
      cell: ({ row }) => formatTone(row.original.transmitTone, t),
    },
    {
      id: "rxTone",
      header: t("rxTone"),
      size: 118,
      cell: ({ row }) => formatTone(row.original.receiveTone, t),
    },
    {
      accessorKey: "scan",
      header: t("scanFlag"),
      size: 92,
      cell: ({ row }) => channelValue(row.original.scan, t),
    },
    membershipColumn("zoneNames", "channelZones", t),
    membershipColumn("scanListNames", "channelScanLists", t),
    {
      accessorKey: "reverse",
      header: t("talkAroundReverse"),
      size: 160,
      cell: ({ row }) => channelValue(row.original.reverse, t),
    },
    {
      accessorKey: "stepKHz",
      id: "step",
      header: t("frequencyStep"),
      size: 92,
      cell: ({ row }) =>
        row.original.stepKHz === "unknown"
          ? t("valueUnknown")
          : `${row.original.stepKHz} kHz`,
    },
    booleanColumn("receiveOnly", "rxOnly", "rxOnly", t),
    valueColumn("busyChannelLockout", "bclo", "busyChannelLockout", t, 160),
    valueColumn("squelch", "squelch", "squelch", t, 168),
    valueColumn("dcsPolarity", "dcsPolarity", "dcsPolarity", t, 180),
    valueColumn("compander", "compander", "compander", t, 160),
    {
      id: "optionalSignaling",
      header: t("optionalSignaling"),
      size: 180,
      cell: ({ row }) =>
        `${channelValue(row.original.optionalSignaling.kind, t)} · ${row.original.optionalSignaling.index}`,
    },
    valueColumn("scrambler", "scrambler", "scrambler", t, 112),
    valueColumn("pttId", "pttId", "pttId", t, 92),
    valueColumn("aprsReceive", "aprsReceive", "aprsReceive", t, 132),
    {
      id: "details",
      header: t("channelDetails"),
      size: 104,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("inspectChannel", { number: row.original.number })}
          onClick={() => onInspect(row.original)}
        >
          {t("channelDetails")}
        </Button>
      ),
      meta: { reorderDisabled },
    },
  ]
}

function frequencyColumn(
  accessorKey:
    "receiveFrequencyHz" | "transmitFrequencyHz" | "offsetFrequencyHz",
  id: "rxFrequency" | "txFrequency" | "offset",
  t: ReturnType<typeof useTranslations>,
  size: number
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(id),
    size,
    cell: ({ row }) => (
      <span className="font-mono">
        {formatFrequency(row.original[accessorKey])}
      </span>
    ),
  }
}

function membershipColumn(
  accessorKey: "zoneNames" | "scanListNames",
  headerKey: "channelZones" | "channelScanLists",
  t: ReturnType<typeof useTranslations>
): ColumnDef<Channel> {
  return {
    accessorKey,
    header: t(headerKey),
    size: 190,
    cell: ({ row }) => (
      <span className="truncate text-muted-foreground">
        {row.original[accessorKey].join(", ") || t("noMembership")}
      </span>
    ),
  }
}

function booleanColumn(
  accessorKey: "receiveOnly",
  id: string,
  headerKey: "rxOnly",
  t: ReturnType<typeof useTranslations>
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(headerKey),
    size: 100,
    cell: ({ row }) =>
      row.original[accessorKey] ? t("valueOn") : t("valueOff"),
  }
}

function valueColumn(
  accessorKey:
    | "busyChannelLockout"
    | "squelch"
    | "dcsPolarity"
    | "compander"
    | "scrambler"
    | "pttId"
    | "aprsReceive",
  id: string,
  headerKey:
    | "busyChannelLockout"
    | "squelch"
    | "dcsPolarity"
    | "compander"
    | "scrambler"
    | "pttId"
    | "aprsReceive",
  t: ReturnType<typeof useTranslations>,
  size: number
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(headerKey),
    size,
    cell: ({ row }) => channelValue(row.original[accessorKey], t),
  }
}

function SpecialChannelsCard({
  channels,
  kind,
}: {
  channels: readonly SpecialChannel[]
  kind: "vfo" | "call"
}) {
  const t = useTranslations()
  const [selectedChannel, setSelectedChannel] =
    React.useState<SpecialChannel | null>(null)

  return (
    <>
      <Table containerClassName="rounded-lg border">
        <TableHeader>
          <TableRow>
            <TableHead>{t("specialChannelSlot")}</TableHead>
            {kind === "call" && <TableHead>{t("channelName")}</TableHead>}
            <TableHead>{t("rxFrequency")}</TableHead>
            <TableHead>{t("txFrequency")}</TableHead>
            <TableHead>{t("duplex")}</TableHead>
            <TableHead>{t("offset")}</TableHead>
            <TableHead>{t("channelMode")}</TableHead>
            <TableHead>{t("txPower")}</TableHead>
            <TableHead>{t("txTone")}</TableHead>
            <TableHead>{t("rxTone")}</TableHead>
            <TableHead>{t("channelDetails")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {channels.map((channel) => (
            <TableRow key={String(channel.slot)}>
              <TableCell className="font-medium">
                {kind === "vfo"
                  ? t("vfoSlot", { slot: String(channel.slot) })
                  : t("callSlot", { slot: String(channel.slot) })}
              </TableCell>
              {kind === "call" && <TableCell>{channel.name}</TableCell>}
              <TableCell className="font-mono">
                {formatFrequency(channel.receiveFrequencyHz)}
              </TableCell>
              <TableCell className="font-mono">
                {formatFrequency(channel.transmitFrequencyHz)}
              </TableCell>
              <TableCell>{channelValue(channel.duplex, t)}</TableCell>
              <TableCell className="font-mono">
                {formatFrequency(channel.offsetFrequencyHz)}
              </TableCell>
              <TableCell>{channelValue(channel.modulation, t)}</TableCell>
              <TableCell>{channelValue(channel.transmitPower, t)}</TableCell>
              <TableCell>{formatTone(channel.transmitTone, t)}</TableCell>
              <TableCell>{formatTone(channel.receiveTone, t)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChannel(channel)}
                >
                  {t("channelDetails")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <SpecialChannelDetailsSheet
        channel={selectedChannel}
        kind={kind}
        onOpenChange={(open) => !open && setSelectedChannel(null)}
      />
    </>
  )
}

function SpecialChannelDetailsSheet({
  channel,
  kind,
  onOpenChange,
}: {
  channel: SpecialChannel | null
  kind: "vfo" | "call"
  onOpenChange(open: boolean): void
}) {
  const t = useTranslations()

  return (
    <Sheet open={channel !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg" closeLabel={t("sidebarClose")}>
        {channel && (
          <>
            <SheetHeader>
              <SheetTitle>
                {kind === "vfo"
                  ? t("vfoSlot", { slot: String(channel.slot) })
                  : t("callSlot", { slot: String(channel.slot) })}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {specialChannelDetails(channel, kind, t).map(
                  ([label, value]) => (
                    <div key={label} className="flex min-w-0 flex-col gap-1">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-sm break-words">{value}</dd>
                    </div>
                  )
                )}
              </dl>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ChannelDetailsSheet({
  channel,
  onOpenChange,
}: {
  channel: Channel | null
  onOpenChange(open: boolean): void
}) {
  const t = useTranslations()

  return (
    <Sheet open={channel !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg" closeLabel={t("sidebarClose")}>
        {channel && (
          <>
            <SheetHeader>
              <SheetTitle>
                {t("channelDetailsTitle", { number: channel.number })}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {channelDetails(channel, t).map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col gap-1">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-sm break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function channelDetails(
  channel: Channel,
  t: ReturnType<typeof useTranslations>
): readonly (readonly [string, React.ReactNode])[] {
  return [
    [t("used"), channel.valid ? t("used") : t("unused")],
    [t("channelName"), channel.name || t("unused")],
    [t("rxFrequency"), formatFrequency(channel.receiveFrequencyHz)],
    [t("txFrequency"), formatFrequency(channel.transmitFrequencyHz)],
    [t("duplex"), channelValue(channel.duplex, t)],
    [t("offset"), formatFrequency(channel.offsetFrequencyHz)],
    [t("talkAroundReverse"), channelValue(channel.reverse, t)],
    [
      t("frequencyStep"),
      channel.stepKHz === "unknown"
        ? t("valueUnknown")
        : `${channel.stepKHz} kHz`,
    ],
    [t("channelMode"), channelValue(channel.modulation, t)],
    [t("txPower"), channelValue(channel.transmitPower, t)],
    [t("rxOnly"), channel.receiveOnly ? t("valueOn") : t("valueOff")],
    [t("busyChannelLockout"), channelValue(channel.busyChannelLockout, t)],
    [t("scanFlag"), channelValue(channel.scan, t)],
    [t("squelch"), channelValue(channel.squelch, t)],
    [t("txTone"), formatTone(channel.transmitTone, t)],
    [t("rxTone"), formatTone(channel.receiveTone, t)],
    [t("dcsPolarity"), channelValue(channel.dcsPolarity, t)],
    [t("compander"), channelValue(channel.compander, t)],
    [
      t("optionalSignaling"),
      formatOptionalSignaling(channel.optionalSignaling, t),
    ],
    [t("scrambler"), channelValue(channel.scrambler, t)],
    [t("pttId"), channelValue(channel.pttId, t)],
    [t("aprsReceive"), channelValue(channel.aprsReceive, t)],
    [t("channelZones"), channel.zoneNames.join(", ") || t("noMembership")],
    [
      t("channelScanLists"),
      channel.scanListNames.join(", ") || t("noMembership"),
    ],
  ]
}

function specialChannelDetails(
  channel: SpecialChannel,
  kind: "vfo" | "call",
  t: ReturnType<typeof useTranslations>
): readonly (readonly [string, React.ReactNode])[] {
  return [
    ...(kind === "call"
      ? ([[t("channelName"), channel.name || t("unused")]] as const)
      : []),
    [t("rxFrequency"), formatFrequency(channel.receiveFrequencyHz)],
    [t("txFrequency"), formatFrequency(channel.transmitFrequencyHz)],
    [t("duplex"), channelValue(channel.duplex, t)],
    [t("offset"), formatFrequency(channel.offsetFrequencyHz)],
    [t("talkAroundReverse"), channelValue(channel.reverse, t)],
    [
      t("frequencyStep"),
      channel.stepKHz === "unknown"
        ? t("valueUnknown")
        : `${channel.stepKHz} kHz`,
    ],
    [t("channelMode"), channelValue(channel.modulation, t)],
    [t("txPower"), channelValue(channel.transmitPower, t)],
    [t("rxOnly"), channel.receiveOnly ? t("valueOn") : t("valueOff")],
    [t("busyChannelLockout"), channelValue(channel.busyChannelLockout, t)],
    [t("squelch"), channelValue(channel.squelch, t)],
    [t("txTone"), formatTone(channel.transmitTone, t)],
    [t("rxTone"), formatTone(channel.receiveTone, t)],
    [t("dcsPolarity"), channelValue(channel.dcsPolarity, t)],
    [t("compander"), channelValue(channel.compander, t)],
    [
      t("optionalSignaling"),
      formatOptionalSignaling(channel.optionalSignaling, t),
    ],
    [t("scrambler"), channelValue(channel.scrambler, t)],
    [t("pttId"), channelValue(channel.pttId, t)],
    [t("aprsReceive"), channelValue(channel.aprsReceive, t)],
  ]
}

function formatFrequency(frequencyHz: number) {
  return `${(frequencyHz / 1_000_000).toFixed(6)} MHz`
}

function formatTone(
  tone: Channel["transmitTone"],
  t: ReturnType<typeof useTranslations>
) {
  if (tone.kind === "off") {
    return t("valueOff")
  }
  if (tone.kind === "unknown") {
    return t("valueUnknown")
  }
  const suffix = tone.reverse ? ` (${t("dcsReverseSuffix")})` : ""
  return tone.kind === "ctcss"
    ? `${tone.frequencyHz.toFixed(1)} Hz${suffix}`
    : `D${tone.code}${suffix}`
}

function formatOptionalSignaling(
  signaling: Channel["optionalSignaling"],
  t: ReturnType<typeof useTranslations>
) {
  const kind = channelValue(signaling.kind, t)
  return signaling.kind === "off" || signaling.kind === "unknown"
    ? kind
    : `${kind} · ${signaling.index}`
}

function channelValue(
  value: string | number,
  t: ReturnType<typeof useTranslations>
) {
  const labels: Record<string, string> = {
    off: t("valueOff"),
    negative: t("valueNegative"),
    positive: t("valuePositive"),
    split: t("valueSplit"),
    "talk-around": t("valueTalkAround"),
    reverse: t("valueReverse"),
    reserved: t("valueReserved"),
    fm: t("valueFm"),
    "fm-narrow": t("valueFmNarrow"),
    am: t("valueAm"),
    "am-narrow": t("valueAmNarrow"),
    unknown: t("valueUnknown"),
    low: t("valueLow"),
    medium: t("valueMedium"),
    high: t("valueHigh"),
    normal: t("valueNormal"),
    skip: t("valueSkip"),
    priority: t("valuePriority"),
    repeater: t("valueRepeater"),
    carrier: t("valueCarrier"),
    tone: t("valueTone"),
    "optional-signaling": t("valueOptionalSignaling"),
    "tone-and-optional-signaling": t("valueToneAndOptional"),
    "tone-or-optional-signaling": t("valueToneOrOptional"),
    transmit: t("valueTransmit"),
    receive: t("valueReceive"),
    "transmit-and-receive": t("valueTransmitAndReceive"),
    "tx-normal-rx-inverted": "TX Normal / RX Inverted",
    "tx-inverted-rx-normal": "TX Inverted / RX Normal",
    inverted: "TX Inverted / RX Inverted",
    dtmf: t("valueDtmf"),
    "two-tone": t("valueTwoTone"),
    "five-tone": t("valueFiveTone"),
    on: t("valueOn"),
    "on-muted": t("valueOnMuted"),
  }

  return labels[String(value)] ?? String(value)
}

export { ChannelsWorkspace }
