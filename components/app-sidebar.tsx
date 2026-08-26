"use client"

import {
  ArchiveIcon,
  BookOpenIcon,
  CircleGaugeIcon,
  ListChecksIcon,
  ListIcon,
  MapIcon,
  RadioIcon,
  SatelliteIcon,
  ScanLineIcon,
  BetweenHorizontalStartIcon,
  BluetoothIcon,
  Settings2Icon,
  WaypointsIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

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
import { Link, usePathname } from "@/i18n/navigation"

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { completedRead, phase } = useCpsWorkspace()
  const pathname = usePathname()
  const t = useTranslations()
  const navigation: NavigationSection[] = [
    {
      label: t("navWorkspace"),
      items: [
        {
          title: t("navRadio"),
          href: "/",
          icon: RadioIcon,
          active: pathname === "/",
        },
        {
          title: t("navChannels"),
          href: "/channels",
          icon: ListIcon,
          active: pathname === "/channels",
        },
        {
          title: t("navZones"),
          href: "/zones",
          icon: MapIcon,
          active: pathname === "/zones",
        },
        {
          title: t("navScanLists"),
          href: "/scan-lists",
          icon: ListChecksIcon,
          active: pathname === "/scan-lists",
        },
        {
          title: t("navVfoScanEdges"),
          href: "/vfo-scan-edges",
          icon: BetweenHorizontalStartIcon,
          active: pathname === "/vfo-scan-edges",
        },
      ],
    },
    {
      label: t("navConfiguration"),
      items: [
        {
          title: t("navSettings"),
          href: "/radio-settings/functions",
          icon: Settings2Icon,
          active: pathname.startsWith("/radio-settings"),
        },
        {
          title: t("navAprs"),
          href: "/aprs",
          icon: WaypointsIcon,
          active: pathname === "/aprs",
        },
        {
          title: t("navGps"),
          href: "/gps",
          icon: SatelliteIcon,
          active: pathname === "/gps",
        },
        {
          title: t("navBluetooth"),
          href: "/bluetooth",
          icon: BluetoothIcon,
          active: pathname === "/bluetooth",
        },
      ],
    },
    {
      label: t("navData"),
      items: [{ title: t("navBackups"), icon: ArchiveIcon, planned: true }],
    },
  ]
  const secondaryNavigation = [
    { title: t("navDiagnostics"), icon: CircleGaugeIcon, planned: true },
    { title: t("navAbout"), icon: BookOpenIcon, planned: true },
  ]

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
                <span className="truncate text-xs">
                  {t("localRadioWorkspace")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={navigation} plannedLabel={t("planned")} />
        <NavSecondary
          items={secondaryNavigation}
          plannedLabel={t("planned")}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={
                completedRead
                  ? t("workingCodeplugReady")
                  : t("noWorkingCodeplug")
              }
              render={<div />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <ScanLineIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {completedRead ? t("workingCodeplug") : t("noCodeplug")}
                </span>
                <span className="truncate text-xs">
                  {phase === "reading"
                    ? t("radioReadInProgress")
                    : t("sessionStorage")}
                </span>
              </div>
              <Badge variant={completedRead ? "secondary" : "outline"}>
                {completedRead ? t("ready") : t("empty")}
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
