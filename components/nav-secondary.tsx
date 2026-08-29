"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

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
import { Link } from "@/i18n/navigation"

function NavSecondary({
  items,
  plannedLabel,
  ...props
}: {
  items: readonly {
    readonly title: string
    readonly icon: LucideIcon
    readonly planned: boolean
    readonly href?: string
    readonly active?: boolean
  }[]
  plannedLabel: string
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const t = useTranslations()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.href && !item.planned ? (
                <SidebarMenuButton
                  size="sm"
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
                        aria-label={t("plannedUnavailable", {
                          item: item.title,
                        })}
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
                        {plannedLabel}
                      </Badge>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t("plannedUnavailable", { item: item.title })}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export { NavSecondary }
