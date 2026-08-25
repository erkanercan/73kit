"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavigationItem {
  readonly title: string
  readonly icon: LucideIcon
  readonly href?: string
  readonly active?: boolean
  readonly planned?: boolean
}

interface NavigationSection {
  readonly label: string
  readonly items: readonly NavigationItem[]
}

function NavMain({ sections }: { sections: readonly NavigationSection[] }) {
  return sections.map((section) => (
    <SidebarGroup key={section.label}>
      <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
      <SidebarMenu>
        {section.items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.href ? (
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.active}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            ) : (
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
                  <SidebarMenuButton disabled>
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
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  ))
}

export { NavMain }
export type { NavigationItem, NavigationSection }
