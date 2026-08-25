"use client"

import Link from "next/link"
import {
  ArchiveIcon,
  BookOpenIcon,
  CircleGaugeIcon,
  ListChecksIcon,
  ListIcon,
  MapIcon,
  RadioIcon,
  ScanLineIcon,
  Settings2Icon,
  WaypointsIcon,
} from "lucide-react"

import { NavMain, type NavigationSection } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navigation: NavigationSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Radio", href: "/", icon: RadioIcon, active: true },
      { title: "Channels", icon: ListIcon, planned: true },
      { title: "Zones", icon: MapIcon, planned: true },
      { title: "Scan Lists", icon: ListChecksIcon, planned: true },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "APRS", icon: WaypointsIcon, planned: true },
      { title: "Settings", icon: Settings2Icon, planned: true },
    ],
  },
  {
    label: "Data",
    items: [{ title: "Backups", icon: ArchiveIcon, planned: true }],
  },
]

const secondaryNavigation = [
  { title: "Diagnostics", icon: CircleGaugeIcon, planned: true },
  { title: "About", icon: BookOpenIcon, planned: true },
]

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { completedRead, status } = useCpsWorkspace()

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="UVL-15W CPS"
              render={<Link href="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <RadioIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">UVL-15W CPS</span>
                <span className="truncate text-xs">Local radio workspace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={navigation} />
        <NavSecondary items={secondaryNavigation} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={
                completedRead ? "Working Codeplug ready" : "No Working Codeplug"
              }
              render={<div />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <ScanLineIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {completedRead ? "Working Codeplug" : "No Codeplug"}
                </span>
                <span className="truncate text-xs">
                  {status === "reading"
                    ? "Radio Read in progress"
                    : "Session storage"}
                </span>
              </div>
              <Badge variant={completedRead ? "secondary" : "outline"}>
                {completedRead ? "Ready" : "Empty"}
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export { AppSidebar }
