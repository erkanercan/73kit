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
  ListFilterIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorDrawer } from "@/components/channels/channel-editor-drawer"
import {
  DEFAULT_CHANNEL_FILTERS,
  countActiveChannelFilters,
  filterMemoryChannels,
  type ChannelFilters,
  type ChannelModulationFilter,
  type ChannelToneFilter,
} from "@/components/channels/channel-filtering"
import type {
  EditChannelMemberships,
  EditMemoryChannel,
} from "@/components/channels/channel-editing"
import {
  createMemoryColumns,
  SortableChannelRow,
} from "@/components/channels/memory-channel-columns"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Channel, ScanList, Zone } from "@/modules/codeplug/index"

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
  zones,
  scanLists,
  changeCount,
  onAdd,
  onDelete,
  onDuplicate,
  onMove,
  onEdit,
  onEditMemberships,
  onReset,
}: {
  channels: readonly Channel[]
  zones: readonly Zone[]
  scanLists: readonly ScanList[]
  changeCount: number
  onAdd(): void
  onDelete(number: number): void
  onDuplicate(number: number): void
  onMove(fromNumber: number, toNumber: number): void
  onEdit: EditMemoryChannel
  onEditMemberships: EditChannelMemberships
  onReset(): void
}) {
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const [usedOnly, setUsedOnly] = React.useState(true)
  const [filters, setFilters] = React.useState<ChannelFilters>(
    DEFAULT_CHANNEL_FILTERS
  )
  const [selectedChannelNumber, setSelectedChannelNumber] = React.useState<
    number | null
  >(null)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      Object.fromEntries(DEFAULT_HIDDEN_COLUMN_IDS.map((id) => [id, false]))
    )

  const visibleChannels = React.useMemo(
    () =>
      filterMemoryChannels(channels, zones, scanLists, {
        usedOnly,
        query: search,
        filters,
      }),
    [channels, filters, scanLists, search, usedOnly, zones]
  )
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const activeFilterCount = countActiveChannelFilters(filters)
  const canAdd = channels.some((channel) => !channel.valid)

  const columns = React.useMemo(
    () =>
      createMemoryColumns(
        t,
        (channel) => setSelectedChannelNumber(channel.number),
        normalizedSearch !== "",
        zones,
        scanLists,
        canAdd,
        onEdit,
        onEditMemberships,
        onDuplicate,
        onDelete
      ),
    [
      canAdd,
      normalizedSearch,
      onDelete,
      onDuplicate,
      onEdit,
      onEditMemberships,
      scanLists,
      t,
      zones,
    ]
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
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="sm" />}>
                <ListFilterIcon data-icon="inline-start" />
                {t("channelFilters")}
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </SheetTrigger>
              <SheetContent closeLabel={t("closeChannelFilters")}>
                <SheetHeader>
                  <SheetTitle>{t("channelFilters")}</SheetTitle>
                  <SheetDescription>
                    {t("channelFiltersDescription")}
                  </SheetDescription>
                </SheetHeader>
                <FieldGroup className="px-4">
                  <FilterSelect
                    id="channel-mode-filter"
                    label={t("channelMode")}
                    value={filters.modulation}
                    options={[
                      { value: "all", label: t("allValues") },
                      { value: "fm", label: t("valueFm") },
                      { value: "fm-narrow", label: t("valueFmNarrow") },
                      { value: "am", label: t("valueAm") },
                      { value: "am-narrow", label: t("valueAmNarrow") },
                      { value: "unknown", label: t("valueUnknown") },
                    ]}
                    onChange={(modulation) =>
                      setFilters((current) => ({
                        ...current,
                        modulation: modulation as ChannelModulationFilter,
                      }))
                    }
                  />
                  <FilterSelect
                    id="channel-tone-filter"
                    label={t("toneType")}
                    value={filters.tone}
                    options={[
                      { value: "all", label: t("allValues") },
                      { value: "off", label: t("valueOff") },
                      { value: "ctcss", label: "CTCSS" },
                      { value: "dcs", label: "DCS" },
                    ]}
                    onChange={(tone) =>
                      setFilters((current) => ({
                        ...current,
                        tone: tone as ChannelToneFilter,
                      }))
                    }
                  />
                  <FilterSelect
                    id="channel-zone-filter"
                    label={t("channelZones")}
                    value={filters.zoneNumber?.toString() ?? "all"}
                    options={[
                      { value: "all", label: t("allValues") },
                      ...zones.map((zone) => ({
                        value: zone.number.toString(),
                        label: zone.name || t("unnamedMembership"),
                      })),
                    ]}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        zoneNumber: value === "all" ? null : Number(value),
                      }))
                    }
                  />
                  <FilterSelect
                    id="channel-scan-list-filter"
                    label={t("channelScanLists")}
                    value={filters.scanListNumber?.toString() ?? "all"}
                    options={[
                      { value: "all", label: t("allValues") },
                      ...scanLists.map((scanList) => ({
                        value: scanList.number.toString(),
                        label: scanList.name || t("unnamedMembership"),
                      })),
                    ]}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        scanListNumber: value === "all" ? null : Number(value),
                      }))
                    }
                  />
                </FieldGroup>
                <SheetFooter>
                  <Button
                    variant="outline"
                    onClick={() => setFilters(DEFAULT_CHANNEL_FILTERS)}
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    {t("resetFilters")}
                  </Button>
                  <SheetClose render={<Button />}>
                    {t("applyFilters")}
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
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
        zones={zones}
        scanLists={scanLists}
        onEdit={onEdit}
        onEditMemberships={onEditMemberships}
        onOpenChange={(open) => !open && setSelectedChannelNumber(null)}
      />
    </>
  )
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: readonly { readonly value: string; readonly label: string }[]
  onChange(value: string): void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={value}
        onValueChange={(nextValue) => nextValue && onChange(nextValue)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export { MemoryChannelsCard }
