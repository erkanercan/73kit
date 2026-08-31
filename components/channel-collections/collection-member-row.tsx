"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EyeIcon, GripVerticalIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  channelValue,
  formatFrequency,
} from "@/components/channels/channel-format"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { Channel } from "@/modules/codeplug/index"

import type { CollectionKind } from "./membership-collections-workspace"

function CollectionMemberRow({
  kind,
  channel,
  position,
  onInspect,
  onRemove,
}: {
  kind: CollectionKind
  channel: Channel
  position: number
  onInspect(): void
  onRemove(): void
}) {
  const t = useTranslations()
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: channel.number })
  const dragLabel = kind === "zone" ? "dragZoneMember" : "dragScanListMember"
  const removeLabel =
    kind === "zone" ? "removeChannelFromZone" : "removeChannelFromScanList"

  return (
    <TableRow
      ref={setNodeRef}
      data-state={isDragging ? "selected" : undefined}
      className="cursor-pointer"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onInspect}
    >
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t(dragLabel, { number: channel.number })}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      </TableCell>
      <TableCell className="w-14 font-mono">{position}</TableCell>
      <TableCell className="w-16 font-mono font-medium">
        {channel.number}
      </TableCell>
      <TableCell className="font-mono">
        {formatFrequency(channel.receiveFrequencyHz)}
      </TableCell>
      <TableCell className="font-mono">
        {formatFrequency(channel.transmitFrequencyHz)}
      </TableCell>
      <TableCell className="max-w-48 truncate">{channel.name || "-"}</TableCell>
      <TableCell>{channelValue(channel.transmitPower, t)}</TableCell>
      <TableCell>{channelValue(channel.squelch, t)}</TableCell>
      {kind === "scan-list" && (
        <TableCell>{channelValue(channel.scan, t)}</TableCell>
      )}
      <TableCell className="w-20">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("inspectChannel", { number: channel.number })}
            onClick={(event) => {
              event.stopPropagation()
              onInspect()
            }}
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t(removeLabel, { number: channel.number })}
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
          >
            <XIcon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export { CollectionMemberRow }
