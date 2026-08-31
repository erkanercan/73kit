"use client"

import { TriangleAlertIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorFields } from "@/components/channels/channel-editor-fields"
import { channelAdvisories } from "@/components/channels/channel-filtering"
import type {
  EditChannelMemberships,
  EditMemoryChannel,
} from "@/components/channels/channel-editing"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Channel, ScanList, Zone } from "@/modules/codeplug/index"

function ChannelEditorDrawer({
  channel,
  zones,
  scanLists,
  onEdit,
  onEditMemberships,
  onOpenChange,
}: {
  channel: Channel | null
  zones: readonly Zone[]
  scanLists: readonly ScanList[]
  onEdit: EditMemoryChannel
  onEditMemberships: EditChannelMemberships
  onOpenChange(open: boolean): void
}) {
  const t = useTranslations()

  return (
    <Drawer
      open={channel !== null}
      swipeDirection="right"
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="w-[min(48rem,calc(100vw-1rem))]">
        {channel && (
          <>
            <DrawerHeader className="flex-row items-center justify-between pb-4">
              <DrawerTitle>
                {t("channelDetailsTitle", { number: channel.number })}
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
              {channelAdvisories(channel).map((advisory) => (
                <Alert key={advisory} className="mb-3">
                  <TriangleAlertIcon aria-hidden="true" />
                  <AlertTitle>
                    {t(
                      advisory === "receive-tone-enabled"
                        ? "receiveToneAdvisoryTitle"
                        : "txBandAdvisoryTitle"
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      advisory === "receive-tone-enabled"
                        ? "receiveToneAdvisoryDescription"
                        : "txBandAdvisoryDescription"
                    )}
                  </AlertDescription>
                </Alert>
              ))}
              <ChannelEditorFields
                key={channel.number}
                channel={channel}
                zones={zones}
                scanLists={scanLists}
                onEdit={(patch) => onEdit(channel.number, patch)}
                onEditMemberships={(patch) =>
                  onEditMemberships(channel.number, patch)
                }
              />
            </ScrollArea>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export { ChannelEditorDrawer }
