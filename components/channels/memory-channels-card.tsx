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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Columns3Icon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorDrawer } from "@/components/channels/channel-editor-drawer"
import type { EditMemoryChannel } from "@/components/channels/channel-editing"
import { formatFrequency } from "@/components/channels/channel-format"
import {
  createMemoryColumns,
  SortableChannelRow,
} from "@/components/channels/memory-channel-columns"
import { Button } from "@/components/ui/button"
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
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Channel } from "@/modules/codeplug/index"

const ADVANCED_COLUMN_IDS = [
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

const DEFAULT_HIDDEN_COLUMN_IDS = [
  ...ADVANCED_COLUMN_IDS,
  "zoneNames",
  "scanListNames",
] as const

function MemoryChannelsCard({
  channels,
  changeCount,
  onAdd,
  onDelete,
  onMove,
  onEdit,
  onReset,
}: {
  channels: readonly Channel[]
  changeCount: number
  onAdd(): void
  onDelete(number: number): void
  onMove(fromNumber: number, toNumber: number): void
  onEdit: EditMemoryChannel
  onReset(): void
}) {
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const [usedOnly, setUsedOnly] = React.useState(true)
  const [selectedChannelNumber, setSelectedChannelNumber] = React.useState<
    number | null
  >(null)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      Object.fromEntries(DEFAULT_HIDDEN_COLUMN_IDS.map((id) => [id, false]))
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
    () =>
      createMemoryColumns(
        t,
        (channel) => setSelectedChannelNumber(channel.number),
        normalizedSearch !== "",
        onEdit,
        onDelete
      ),
    [normalizedSearch, onDelete, onEdit, t]
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
      Object.fromEntries(DEFAULT_HIDDEN_COLUMN_IDS.map((id) => [id, false]))
    )
  }

  function showAdvancedColumns() {
    setColumnVisibility(
      Object.fromEntries(DEFAULT_HIDDEN_COLUMN_IDS.map((id) => [id, true]))
    )
  }

  function handleAdd() {
    setSearch("")
    setUsedOnly(true)
    onAdd()
  }

  const canAdd = channels.some((channel) => !channel.valid)

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
              variant="outline"
              size="sm"
              disabled={!canAdd}
              title={!canAdd ? t("channelCapacityReached") : undefined}
              onClick={handleAdd}
            >
              <PlusIcon data-icon="inline-start" />
              {t("addChannel")}
            </Button>
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
                    checked={DEFAULT_HIDDEN_COLUMN_IDS.every(
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
                className="grid min-w-full"
                style={{ width: table.getTotalSize() }}
              >
                <TableHeader className="sticky top-0 z-10 grid bg-background">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="flex w-full">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "flex shrink-0 items-center",
                            header.column.id === "name" && "grow"
                          )}
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
                        onInspect={() =>
                          setSelectedChannelNumber(row.original.number)
                        }
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <ChannelEditorDrawer
        channel={
          selectedChannelNumber === null
            ? null
            : (channels[selectedChannelNumber - 1] ?? null)
        }
        onEdit={onEdit}
        onOpenChange={(open) => !open && setSelectedChannelNumber(null)}
      />
    </>
  )
}

export { MemoryChannelsCard }
