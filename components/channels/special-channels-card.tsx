"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  channelValue,
  formatFrequency,
  formatOptionalSignaling,
  formatTone,
} from "@/components/channels/channel-format"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SpecialChannel } from "@/modules/codeplug/index"

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
      <SpecialChannelDetailsDrawer
        channel={selectedChannel}
        kind={kind}
        onOpenChange={(open) => !open && setSelectedChannel(null)}
      />
    </>
  )
}

function SpecialChannelDetailsDrawer({
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
    <Drawer
      open={channel !== null}
      swipeDirection="right"
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="w-[min(36rem,calc(100vw-1rem))]">
        {channel && (
          <>
            <DrawerHeader className="flex-row items-center justify-between pb-4">
              <DrawerTitle>
                {kind === "vfo"
                  ? t("vfoSlot", { slot: String(channel.slot) })
                  : t("callSlot", { slot: String(channel.slot) })}
              </DrawerTitle>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("closeChannelDetails")}
                  />
                }
              >
                <XIcon />
              </DrawerClose>
            </DrawerHeader>
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
      </DrawerContent>
    </Drawer>
  )
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

export { SpecialChannelsCard }
