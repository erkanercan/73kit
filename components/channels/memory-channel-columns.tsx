"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import type { VirtualItem } from "@tanstack/react-virtual"
import { EyeIcon, GripVerticalIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  APRS_RECEIVE_OPTIONS,
  BCLO_OPTIONS,
  COMPANDER_OPTIONS,
  DCS_POLARITY_OPTIONS,
  DUPLEX_OPTIONS,
  MODULATION_OPTIONS,
  OPTIONAL_SIGNALING_OPTIONS,
  POWER_OPTIONS,
  PTT_ID_OPTIONS,
  REVERSE_OPTIONS,
  SCAN_OPTIONS,
  SCRAMBLER_OPTIONS,
  SQUELCH_OPTIONS,
  STEP_OPTIONS,
  type EditChannelMemberships,
  type EditMemoryChannel,
} from "@/components/channels/channel-editing"
import {
  ChannelMembershipPicker,
  type MembershipKind,
} from "@/components/channels/channel-membership-picker"
import { formatFrequency } from "@/components/channels/channel-format"
import { ChannelToneEditor } from "@/components/channels/channel-tone-editor"
import {
  ChannelValueSelect,
  EditableNameCell,
  EditableSelectCell,
  FrequencyCell,
} from "@/components/channels/editable-channel-cells"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Channel, ScanList, Zone } from "@/modules/codeplug/index"

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
          className={cn(
            "flex shrink-0 items-center overflow-hidden",
            cell.column.id === "name" && "grow"
          )}
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
  reorderDisabled: boolean,
  zones: readonly Zone[],
  scanLists: readonly ScanList[],
  onEdit: EditMemoryChannel,
  onEditMemberships: EditChannelMemberships,
  onDelete: (number: number) => void
): ColumnDef<Channel>[] {
  return [
    {
      id: "move",
      header: () => <span className="sr-only">{t("moveChannel")}</span>,
      size: 40,
      enableHiding: false,
    },
    {
      accessorKey: "number",
      header: t("channelNumber"),
      size: 52,
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
      size: 88,
      cell: ({ row }) => (
        <EditableSelectCell
          value={row.original.valid ? "used" : "unused"}
          ariaLabel={`${t("used")} ${row.original.number}`}
          options={[
            { value: "used", label: t("used") },
            { value: "unused", label: t("unused") },
          ]}
          onCommit={(value) =>
            onEdit(row.original.number, { valid: value === "used" })
          }
        />
      ),
    },
    {
      accessorKey: "name",
      header: t("channelName"),
      size: 140,
      cell: ({ row }) => (
        <EditableNameCell channel={row.original} onEdit={onEdit} />
      ),
    },
    frequencyColumn("receiveFrequencyHz", "rxFrequency", t, 150, onEdit),
    frequencyColumn("transmitFrequencyHz", "txFrequency", t, 150, onEdit),
    {
      accessorKey: "duplex",
      header: t("duplex"),
      size: 92,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.duplex}
          options={DUPLEX_OPTIONS}
          ariaLabel={`${t("duplex")} ${row.original.number}`}
          t={t}
          onCommit={(duplex) => onEdit(row.original.number, { duplex })}
        />
      ),
    },
    frequencyColumn("offsetFrequencyHz", "offset", t, 150, onEdit),
    {
      accessorKey: "modulation",
      header: t("channelMode"),
      size: 90,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.modulation}
          options={MODULATION_OPTIONS}
          ariaLabel={`${t("channelMode")} ${row.original.number}`}
          t={t}
          onCommit={(modulation) => onEdit(row.original.number, { modulation })}
        />
      ),
    },
    {
      accessorKey: "transmitPower",
      header: t("txPower"),
      size: 90,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.transmitPower}
          options={POWER_OPTIONS}
          ariaLabel={`${t("txPower")} ${row.original.number}`}
          t={t}
          onCommit={(transmitPower) =>
            onEdit(row.original.number, { transmitPower })
          }
        />
      ),
    },
    {
      id: "txTone",
      header: t("txTone"),
      size: 100,
      cell: ({ row }) => (
        <ChannelToneEditor
          id={`channel-${row.original.number}-tx-tone`}
          label={t("txTone")}
          tone={row.original.transmitTone}
          direction="transmit"
          compact
          onCommit={(transmitTone) =>
            onEdit(row.original.number, { transmitTone })
          }
        />
      ),
    },
    {
      id: "rxTone",
      header: t("rxTone"),
      size: 100,
      cell: ({ row }) => (
        <ChannelToneEditor
          id={`channel-${row.original.number}-rx-tone`}
          label={t("rxTone")}
          tone={row.original.receiveTone}
          direction="receive"
          compact
          onCommit={(receiveTone) =>
            onEdit(row.original.number, { receiveTone })
          }
        />
      ),
    },
    {
      accessorKey: "scan",
      header: t("scanFlag"),
      size: 90,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.scan}
          options={SCAN_OPTIONS}
          ariaLabel={`${t("scanFlag")} ${row.original.number}`}
          t={t}
          onCommit={(scan) => onEdit(row.original.number, { scan })}
        />
      ),
    },
    membershipColumn(
      "zone",
      "zoneNames",
      "channelZones",
      zones,
      t,
      onEditMemberships
    ),
    membershipColumn(
      "scan-list",
      "scanListNames",
      "channelScanLists",
      scanLists,
      t,
      onEditMemberships
    ),
    {
      accessorKey: "reverse",
      header: t("talkAroundReverse"),
      size: 180,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.reverse}
          options={REVERSE_OPTIONS}
          ariaLabel={`${t("talkAroundReverse")} ${row.original.number}`}
          t={t}
          onCommit={(reverse) => onEdit(row.original.number, { reverse })}
        />
      ),
    },
    {
      accessorKey: "stepKHz",
      id: "step",
      header: t("frequencyStep"),
      size: 124,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.stepKHz}
          options={STEP_OPTIONS}
          ariaLabel={`${t("frequencyStep")} ${row.original.number}`}
          t={t}
          suffix=" kHz"
          onCommit={(stepKHz) => onEdit(row.original.number, { stepKHz })}
        />
      ),
    },
    booleanColumn("receiveOnly", "rxOnly", "rxOnly", t, onEdit),
    valueColumn(
      "busyChannelLockout",
      "bclo",
      "busyChannelLockout",
      t,
      160,
      BCLO_OPTIONS,
      onEdit
    ),
    valueColumn(
      "squelch",
      "squelch",
      "squelch",
      t,
      180,
      SQUELCH_OPTIONS,
      onEdit
    ),
    valueColumn(
      "dcsPolarity",
      "dcsPolarity",
      "dcsPolarity",
      t,
      210,
      DCS_POLARITY_OPTIONS,
      onEdit
    ),
    valueColumn(
      "compander",
      "compander",
      "compander",
      t,
      180,
      COMPANDER_OPTIONS,
      onEdit
    ),
    {
      id: "optionalSignaling",
      header: t("optionalSignaling"),
      size: 190,
      cell: ({ row }) => (
        <ChannelValueSelect
          value={row.original.optionalSignaling.kind}
          options={OPTIONAL_SIGNALING_OPTIONS}
          ariaLabel={`${t("optionalSignaling")} ${row.original.number}`}
          t={t}
          onCommit={(kind) =>
            onEdit(row.original.number, {
              optionalSignaling: {
                ...row.original.optionalSignaling,
                kind,
                index:
                  row.original.optionalSignaling.index <= 15
                    ? row.original.optionalSignaling.index
                    : 0,
              },
            })
          }
        />
      ),
    },
    valueColumn(
      "scrambler",
      "scrambler",
      "scrambler",
      t,
      132,
      SCRAMBLER_OPTIONS,
      onEdit
    ),
    valueColumn("pttId", "pttId", "pttId", t, 116, PTT_ID_OPTIONS, onEdit),
    valueColumn(
      "aprsReceive",
      "aprsReceive",
      "aprsReceive",
      t,
      160,
      APRS_RECEIVE_OPTIONS,
      onEdit
    ),
    {
      id: "details",
      header: () => <span className="sr-only">{t("channelActions")}</span>,
      size: 72,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("inspectChannel", { number: row.original.number })}
            title={t("inspectChannel", { number: row.original.number })}
            onClick={() => onInspect(row.original)}
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteChannel", { number: row.original.number })}
            title={t("deleteChannel", { number: row.original.number })}
            onClick={() => onDelete(row.original.number)}
          >
            <Trash2Icon />
          </Button>
        </div>
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
  size: number,
  onEdit: EditMemoryChannel
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(id),
    size,
    cell: ({ row }) => {
      if (
        accessorKey === "transmitFrequencyHz" &&
        row.original.duplex !== "split"
      ) {
        return (
          <span className="font-mono text-muted-foreground">
            {formatFrequency(row.original.transmitFrequencyHz)}
          </span>
        )
      }
      if (
        accessorKey === "offsetFrequencyHz" &&
        row.original.duplex !== "positive" &&
        row.original.duplex !== "negative"
      ) {
        return (
          <span className="font-mono text-muted-foreground">
            {formatFrequency(row.original.offsetFrequencyHz)}
          </span>
        )
      }

      return (
        <FrequencyCell
          value={row.original[accessorKey]}
          ariaLabel={`${t(id)} ${row.original.number}`}
          onCommit={(value) =>
            onEdit(row.original.number, { [accessorKey]: value })
          }
        />
      )
    },
  }
}

function membershipColumn(
  kind: MembershipKind,
  accessorKey: "zoneNames" | "scanListNames",
  headerKey: "channelZones" | "channelScanLists",
  collections: readonly (Zone | ScanList)[],
  t: ReturnType<typeof useTranslations>,
  onEditMemberships: EditChannelMemberships
): ColumnDef<Channel> {
  return {
    accessorKey,
    header: t(headerKey),
    size: 190,
    cell: ({ row }) => (
      <ChannelMembershipPicker
        id={`channel-${row.original.number}-${accessorKey}`}
        kind={kind}
        channelNumber={row.original.number}
        collections={collections}
        compact
        onChange={(numbers) =>
          onEditMemberships(
            row.original.number,
            kind === "zone"
              ? { zoneNumbers: numbers }
              : { scanListNumbers: numbers }
          )
        }
      />
    ),
  }
}

function booleanColumn(
  accessorKey: "receiveOnly",
  id: string,
  headerKey: "rxOnly",
  t: ReturnType<typeof useTranslations>,
  onEdit: EditMemoryChannel
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(headerKey),
    size: 100,
    cell: ({ row }) => (
      <EditableSelectCell
        value={row.original[accessorKey] ? "on" : "off"}
        ariaLabel={`${t(headerKey)} ${row.original.number}`}
        options={[
          { value: "off", label: t("valueOff") },
          { value: "on", label: t("valueOn") },
        ]}
        onCommit={(value) =>
          onEdit(row.original.number, { [accessorKey]: value === "on" })
        }
      />
    ),
  }
}

type EditableValueKey =
  | "busyChannelLockout"
  | "squelch"
  | "dcsPolarity"
  | "compander"
  | "scrambler"
  | "pttId"
  | "aprsReceive"

function valueColumn<Key extends EditableValueKey>(
  accessorKey: Key,
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
  size: number,
  options: readonly Exclude<Channel[Key], "unknown">[],
  onEdit: EditMemoryChannel
): ColumnDef<Channel> {
  return {
    accessorKey,
    id,
    header: t(headerKey),
    size,
    cell: ({ row }) => (
      <ChannelValueSelect
        value={row.original[accessorKey]}
        options={options}
        ariaLabel={`${t(headerKey)} ${row.original.number}`}
        t={t}
        onCommit={(value) =>
          onEdit(row.original.number, { [accessorKey]: value })
        }
      />
    ),
  }
}

export { createMemoryColumns, SortableChannelRow }
