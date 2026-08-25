"use client"

import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

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
import { Link } from "@/i18n/navigation"

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

function NavMain({
  sections,
  plannedLabel,
}: {
  sections: readonly NavigationSection[]
  plannedLabel: string
}) {
  const t = useTranslations()

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
                      aria-label={t("plannedUnavailable", {
                        item: item.title,
                      })}
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
    </SidebarGroup>
  ))
}

export { NavMain }
export type { NavigationItem, NavigationSection }
