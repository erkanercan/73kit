"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function NavSecondary({
  items,
  ...props
}: {
  items: readonly {
    readonly title: string
    readonly icon: LucideIcon
    readonly planned: boolean
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="block"
                      tabIndex={0}
                      aria-label={`${item.title} is planned and not yet available`}
                    />
                  }
                >
                  <SidebarMenuButton size="sm" disabled>
                    <item.icon />
                    <span>{item.title}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto group-data-[collapsible=icon]:hidden"
                    >
                      Planned
                    </Badge>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.title} is planned and not yet available.
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export { NavSecondary }
