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
import { getNavigationItemState } from "@/modules/update-presentation/index"
import type { RadioCapability } from "@/modules/radio-support/index"

interface NavigationItem {
  readonly title: string
  readonly icon: LucideIcon
  readonly href?: string
  readonly active?: boolean
  readonly planned?: boolean
  readonly disabled?: boolean
  readonly disabledDescription?: string
  readonly capability?: RadioCapability
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
        {section.items.map((item) => {
          const state = getNavigationItemState({
            planned: item.planned ?? false,
            disabled: item.disabled ?? false,
          })

          return (
            <SidebarMenuItem key={item.title}>
              {item.href && state === "available" ? (
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
                        aria-label={
                          state === "locked"
                            ? item.disabledDescription
                            : t("plannedUnavailable", { item: item.title })
                        }
                      />
                    }
                  >
                    <SidebarMenuButton disabled>
                      <item.icon />
                      <span>{item.title}</span>
                      {state === "planned" && (
                        <Badge
                          variant="outline"
                          className="ml-auto group-data-[collapsible=icon]:hidden"
                        >
                          {plannedLabel}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {state === "locked"
                      ? item.disabledDescription
                      : t("plannedUnavailable", { item: item.title })}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  ))
}

export { NavMain }
export type { NavigationItem, NavigationSection }
