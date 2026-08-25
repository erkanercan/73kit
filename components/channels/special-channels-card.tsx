"use client"

import * as React from "react"
import { EyeIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorFields } from "@/components/channels/channel-editor-fields"
import {
  DUPLEX_OPTIONS,
  MODULATION_OPTIONS,
  POWER_OPTIONS,
} from "@/components/channels/channel-editing"
import { formatFrequency } from "@/components/channels/channel-format"
import { ChannelToneEditor } from "@/components/channels/channel-tone-editor"
import {
  ChannelValueSelect,
  EditableTextCell,
  FrequencyCell,
} from "@/components/channels/editable-channel-cells"
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
import type {
  CallChannelPatch,
  MemoryChannelPatch,
  SpecialChannel,
  VfoChannelPatch,
} from "@/modules/codeplug/index"

type SpecialChannelsCardProps =
  | {
      readonly channels: readonly SpecialChannel[]
      readonly kind: "vfo"
      onEdit(slot: "A" | "B", patch: VfoChannelPatch): void
    }
  | {
      readonly channels: readonly SpecialChannel[]
      readonly kind: "call"
      onEdit(slot: 1 | 2, patch: CallChannelPatch): void
    }

function SpecialChannelsCard(props: SpecialChannelsCardProps) {
  const { channels, kind } = props
  const t = useTranslations()
  const [selectedSlot, setSelectedSlot] = React.useState<
    SpecialChannel["slot"] | null
  >(null)
  const selectedChannel =
    channels.find((channel) => channel.slot === selectedSlot) ?? null

  function edit(channel: SpecialChannel, patch: MemoryChannelPatch) {
    if (kind === "vfo") {
      props.onEdit(channel.slot as "A" | "B", toVfoChannelPatch(patch))
      return
    }
    props.onEdit(channel.slot as 1 | 2, toCallChannelPatch(patch))
  }

  return (
    <>
      <Table containerClassName="h-full rounded-lg border">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">{t("specialChannelSlot")}</TableHead>
            {kind === "call" && (
              <TableHead className="w-36">{t("channelName")}</TableHead>
            )}
            <TableHead className="w-40">{t("rxFrequency")}</TableHead>
            <TableHead className="w-40">{t("txFrequency")}</TableHead>
            <TableHead className="w-24">{t("duplex")}</TableHead>
            <TableHead className="w-40">{t("offset")}</TableHead>
            <TableHead className="w-24">{t("channelMode")}</TableHead>
            <TableHead className="w-24">{t("txPower")}</TableHead>
            <TableHead className="w-28">{t("txTone")}</TableHead>
            <TableHead className="w-28">{t("rxTone")}</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">{t("channelActions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {channels.map((channel) => {
            const label =
              kind === "vfo"
                ? t("vfoSlot", { slot: String(channel.slot) })
                : t("callSlot", { slot: String(channel.slot) })

            return (
              <TableRow
                key={String(channel.slot)}
                onDoubleClick={() => setSelectedSlot(channel.slot)}
              >
                <TableCell className="font-medium">{label}</TableCell>
                {kind === "call" && (
                  <TableCell>
                    <EditableTextCell
                      value={channel.name}
                      displayValue={channel.name || t("unused")}
                      ariaLabel={`${t("channelName")} ${label}`}
                      invalidMessage={t("channelNameTooLong")}
                      validate={(value) =>
                        !value.includes("\0") &&
                        new TextEncoder().encode(value).byteLength <= 24
                      }
                      onCommit={(name) => edit(channel, { name })}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <FrequencyCell
                    value={channel.receiveFrequencyHz}
                    ariaLabel={`${t("rxFrequency")} ${label}`}
                    onCommit={(receiveFrequencyHz) =>
                      edit(channel, { receiveFrequencyHz })
                    }
                  />
                </TableCell>
                <TableCell>
                  {channel.duplex === "split" ? (
                    <FrequencyCell
                      value={channel.transmitFrequencyHz}
                      ariaLabel={`${t("txFrequency")} ${label}`}
                      onCommit={(transmitFrequencyHz) =>
                        edit(channel, { transmitFrequencyHz })
                      }
                    />
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {formatFrequency(channel.transmitFrequencyHz)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ChannelValueSelect
                    value={channel.duplex}
                    options={DUPLEX_OPTIONS}
                    ariaLabel={`${t("duplex")} ${label}`}
                    t={t}
                    onCommit={(duplex) => edit(channel, { duplex })}
                  />
                </TableCell>
                <TableCell>
                  {channel.duplex === "positive" ||
                  channel.duplex === "negative" ? (
                    <FrequencyCell
                      value={channel.offsetFrequencyHz}
                      ariaLabel={`${t("offset")} ${label}`}
                      onCommit={(offsetFrequencyHz) =>
                        edit(channel, { offsetFrequencyHz })
                      }
                    />
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {formatFrequency(channel.offsetFrequencyHz)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ChannelValueSelect
                    value={channel.modulation}
                    options={MODULATION_OPTIONS}
                    ariaLabel={`${t("channelMode")} ${label}`}
                    t={t}
                    onCommit={(modulation) => edit(channel, { modulation })}
                  />
                </TableCell>
                <TableCell>
                  <ChannelValueSelect
                    value={channel.transmitPower}
                    options={POWER_OPTIONS}
                    ariaLabel={`${t("txPower")} ${label}`}
                    t={t}
                    onCommit={(transmitPower) =>
                      edit(channel, { transmitPower })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ChannelToneEditor
                    id={`${kind}-${channel.slot}-tx-tone`}
                    label={t("txTone")}
                    tone={channel.transmitTone}
                    direction="transmit"
                    compact
                    onCommit={(transmitTone) => edit(channel, { transmitTone })}
                  />
                </TableCell>
                <TableCell>
                  <ChannelToneEditor
                    id={`${kind}-${channel.slot}-rx-tone`}
                    label={t("rxTone")}
                    tone={channel.receiveTone}
                    direction="receive"
                    compact
                    onCommit={(receiveTone) => edit(channel, { receiveTone })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("inspectSpecialChannel", { channel: label })}
                    title={t("inspectSpecialChannel", { channel: label })}
                    onClick={() => setSelectedSlot(channel.slot)}
                  >
                    <EyeIcon />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <Drawer
        open={selectedChannel !== null}
        swipeDirection="right"
        onOpenChange={(open) => !open && setSelectedSlot(null)}
      >
        <DrawerContent className="w-[min(48rem,calc(100vw-1rem))]">
          {selectedChannel && (
            <>
              <DrawerHeader className="flex-row items-center justify-between pb-4">
                <DrawerTitle>
                  {kind === "vfo"
                    ? t("vfoSlot", { slot: String(selectedChannel.slot) })
                    : t("callSlot", { slot: String(selectedChannel.slot) })}
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
                <ChannelEditorFields
                  key={`${kind}-${selectedChannel.slot}`}
                  channel={selectedChannel}
                  showName={kind === "call"}
                  onEdit={(patch) => edit(selectedChannel, patch)}
                />
              </ScrollArea>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

function toCallChannelPatch(patch: MemoryChannelPatch): CallChannelPatch {
  const { valid, scan, ...result } = patch
  void valid
  void scan
  return result
}

function toVfoChannelPatch(patch: MemoryChannelPatch): VfoChannelPatch {
  const { name, ...result } = toCallChannelPatch(patch)
  void name
  return result
}

export { SpecialChannelsCard }
