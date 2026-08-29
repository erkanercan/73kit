"use client"

import {
  ArchiveIcon,
  ChartNoAxesColumnIncreasingIcon,
  BookOpenIcon,
  CircleGaugeIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  ListIcon,
  MapIcon,
  RadioTowerIcon,
  RadioIcon,
  SatelliteIcon,
  ScanLineIcon,
  BetweenHorizontalStartIcon,
  BluetoothIcon,
  Settings2Icon,
  AudioLinesIcon,
  HardDriveUploadIcon,
  HouseIcon,
  WaypointsIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { NavMain, type NavigationSection } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
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
  const { busy: updateBusy } = useUpdateCoordinator()
  const pathname = usePathname()
  const t = useTranslations()
  const navigation: NavigationSection[] = [
    {
      label: t("navWorkspace"),
      items: [
        {
          title: t("navOverview"),
          href: "/",
          icon: HouseIcon,
          active: pathname === "/",
        },
        {
          title: t("navRadio"),
          href: "/radio",
          icon: RadioIcon,
          active: pathname === "/radio",
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
          title: t("navSpectrum"),
          href: "/spectrum",
          icon: ChartNoAxesColumnIncreasingIcon,
          active: pathname === "/spectrum",
        },
        {
          title: t("navBluetooth"),
          href: "/bluetooth",
          icon: BluetoothIcon,
          active: pathname === "/bluetooth",
        },
        {
          title: t("navFmRadio"),
          href: "/fm-radio",
          icon: RadioTowerIcon,
          active: pathname === "/fm-radio",
        },
        {
          title: t("navSignalSystem"),
          href: "/signal-system",
          icon: AudioLinesIcon,
          active: pathname === "/signal-system",
        },
      ],
    },
    ...(process.env.NODE_ENV === "development"
      ? [
          {
            label: t("navDevelopment"),
            items: [
              {
                title: t("navFirmwareSimulator"),
                href: "/prototype/firmware-compatibility",
                icon: FlaskConicalIcon,
                active: pathname === "/prototype/firmware-compatibility",
              },
            ],
          },
        ]
      : []),
  ]
  const guardedNavigation = navigation.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      disabled: updateBusy && item.href !== "/updates",
      disabledDescription: updateBusy ? t("updatesStayOnPage") : undefined,
    })),
  }))
  const secondaryNavigation = [
    {
      title: t("navBackups"),
      href: "/backups",
      icon: ArchiveIcon,
      active: pathname === "/backups",
      planned: false,
    },
    {
      title: t("navUpdates"),
      href: "/updates",
      icon: HardDriveUploadIcon,
      active: pathname === "/updates",
      planned: false,
    },
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
        <NavMain sections={guardedNavigation} plannedLabel={t("planned")} />
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
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export { AppSidebar }
