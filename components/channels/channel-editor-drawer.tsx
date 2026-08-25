"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { ChannelEditorFields } from "@/components/channels/channel-editor-fields"
import type { EditMemoryChannel } from "@/components/channels/channel-editing"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Channel } from "@/modules/codeplug/index"

function ChannelEditorDrawer({
  channel,
  onEdit,
  onOpenChange,
}: {
  channel: Channel | null
  onEdit: EditMemoryChannel
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
              <ChannelEditorFields
                key={channel.number}
                channel={channel}
                onEdit={onEdit}
              />
            </ScrollArea>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export { ChannelEditorDrawer }
