"use client"

import * as React from "react"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { formatFrequency } from "@/components/channels/channel-format"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Channel } from "@/modules/codeplug/index"

import type { CollectionKind } from "./membership-collections-workspace"

function AddCollectionChannelsDrawer({
  kind,
  open,
  channels,
  onAdd,
  onOpenChange,
}: {
  kind: CollectionKind
  open: boolean
  channels: readonly Channel[]
  onAdd(channelNumber: number): void
  onOpenChange(open: boolean): void
}) {
  const t = useTranslations()
  const [search, setSearch] = React.useState("")
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleChannels = channels.filter((channel) => {
    if (!normalizedSearch) return true
    return [
      channel.number,
      channel.name,
      formatFrequency(channel.receiveFrequencyHz),
      formatFrequency(channel.transmitFrequencyHz),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })
  const title = kind === "zone" ? "addChannelsToZone" : "addChannelsToScanList"
  const empty =
    kind === "zone" ? "noAvailableZoneChannels" : "noAvailableScanListChannels"

  return (
    <Drawer open={open} swipeDirection="right" onOpenChange={onOpenChange}>
      <DrawerContent className="w-[min(44rem,calc(100vw-1rem))]">
        <DrawerHeader className="flex-row items-center justify-between pb-4">
          <DrawerTitle>{t(title)}</DrawerTitle>
          <DrawerClose
            render={
              <Button variant="ghost" size="icon-sm" aria-label={t("close")} />
            }
          >
            <XIcon />
          </DrawerClose>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              value={search}
              aria-label={t("searchChannels")}
              placeholder={t("searchChannelsPlaceholder")}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </InputGroup>
          {visibleChannels.length === 0 ? (
            <Empty className="min-h-0 flex-1 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>{t(empty)}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table containerClassName="min-h-0 flex-1 overflow-auto rounded-lg border">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>{t("channelNumber")}</TableHead>
                  <TableHead>{t("channelName")}</TableHead>
                  <TableHead>{t("rxFrequency")}</TableHead>
                  <TableHead>{t("txFrequency")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("addChannel")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleChannels.map((channel) => (
                  <TableRow key={channel.number}>
                    <TableCell className="font-mono font-medium">
                      {channel.number}
                    </TableCell>
                    <TableCell>{channel.name || "-"}</TableCell>
                    <TableCell className="font-mono">
                      {formatFrequency(channel.receiveFrequencyHz)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatFrequency(channel.transmitFrequencyHz)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAdd(channel.number)}
                      >
                        <PlusIcon data-icon="inline-start" />
                        {t("add")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export { AddCollectionChannelsDrawer }
