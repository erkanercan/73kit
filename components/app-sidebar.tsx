"use client"

import Image from "next/image"
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
import { useRadioModel } from "@/components/radio-model-provider"
import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/navigation"
import { radioCpsPath } from "@/modules/radio-support/index"

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sourceRadio } = useCpsWorkspace()
  const { busy: updateBusy } = useUpdateCoordinator()
  const pathname = usePathname()
  const radioModel = useRadioModel()
  const basePath = radioCpsPath(radioModel.id)
  const route = (suffix = "") => radioCpsPath(radioModel.id, suffix)
  const t = useTranslations()
  const navigation: NavigationSection[] = [
    {
      label: t("navWorkspace"),
      items: [
        {
          title: t("navOverview"),
          href: basePath,
          icon: HouseIcon,
          active: pathname === basePath,
        },
        {
          title: t("navRadio"),
          href: route("radio"),
          icon: RadioIcon,
          capability: "radio-information",
          active: pathname === route("radio"),
        },
        {
          title: t("navChannels"),
          href: route("channels"),
          icon: ListIcon,
          capability: "channels",
          active: pathname === route("channels"),
        },
        {
          title: t("navZones"),
          href: route("zones"),
          icon: MapIcon,
          capability: "zones",
          active: pathname === route("zones"),
        },
        {
          title: t("navScanLists"),
          href: route("scan-lists"),
          icon: ListChecksIcon,
          capability: "scan-lists",
          active: pathname === route("scan-lists"),
        },
        {
          title: t("navVfoScanEdges"),
          href: route("vfo-scan-edges"),
          icon: BetweenHorizontalStartIcon,
          capability: "vfo-scan-edges",
          active: pathname === route("vfo-scan-edges"),
        },
      ],
    },
    {
      label: t("navConfiguration"),
      items: [
        {
          title: t("navSettings"),
          href: route("radio-settings/functions"),
          icon: Settings2Icon,
          capability: "radio-settings",
          active: pathname.startsWith(route("radio-settings")),
        },
        {
          title: t("navAprs"),
          href: route("aprs"),
          icon: WaypointsIcon,
          capability: "aprs",
          active: pathname === route("aprs"),
        },
        {
          title: t("navGps"),
          href: route("gps"),
          icon: SatelliteIcon,
          capability: "gps",
          active: pathname === route("gps"),
        },
        {
          title: t("navSpectrum"),
          href: route("spectrum"),
          icon: ChartNoAxesColumnIncreasingIcon,
          capability: "spectrum",
          active: pathname === route("spectrum"),
        },
        {
          title: t("navBluetooth"),
          href: route("bluetooth"),
          icon: BluetoothIcon,
          capability: "bluetooth-settings",
          active: pathname === route("bluetooth"),
        },
        {
          title: t("navFmRadio"),
          href: route("fm-radio"),
          icon: RadioTowerIcon,
          capability: "fm-radio",
          active: pathname === route("fm-radio"),
        },
        {
          title: t("navSignalSystem"),
          href: route("signal-system"),
          icon: AudioLinesIcon,
          capability: "signal-system",
          active: pathname === route("signal-system"),
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
                href: route("prototype/firmware-compatibility"),
                icon: FlaskConicalIcon,
                active: pathname === route("prototype/firmware-compatibility"),
              },
            ],
          },
        ]
      : []),
  ]
  const guardedNavigation = navigation.map((section) => ({
    ...section,
    items: section.items
      .filter(
        (item) =>
          !item.capability || radioModel.capabilities.includes(item.capability)
      )
      .map((item) => ({
        ...item,
        disabled: updateBusy && item.href !== route("updates"),
        disabledDescription: updateBusy ? t("updatesStayOnPage") : undefined,
      })),
  }))
  const secondaryNavigation = [
    {
      title: t("navBackups"),
      href: route("backups"),
      icon: ArchiveIcon,
      capability: "backups" as const,
      active: pathname === route("backups"),
      planned: false,
    },
    {
      title: t("navUpdates"),
      href: route("updates"),
      icon: HardDriveUploadIcon,
      capability: "firmware-updates" as const,
      active: pathname === route("updates"),
      planned: false,
    },
    {
      title: t("navDiagnostics"),
      href: "/diagnostics",
      icon: CircleGaugeIcon,
      active: pathname === "/diagnostics",
      planned: false,
    },
    {
      title: t("navAbout"),
      href: "/about",
      icon: BookOpenIcon,
      active: pathname === "/about",
      planned: false,
    },
  ]

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="73Kit"
              render={<Link href="/" />}
            >
              <Image
                src="/icons/app-icon.svg"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg"
                priority
              />
              <span className="truncate font-heading font-semibold tracking-tight">
                73Kit
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t("changeRadioModel")}
              render={<Link href="/cps" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <RadioIcon />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {radioModel.displayName}
                </span>
                <span className="truncate text-xs">
                  {sourceRadio
                    ? t("firmwareDetected", {
                        version: sourceRadio.firmwareVersion,
                      })
                    : t("footerRadioDisconnected")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={guardedNavigation} plannedLabel={t("planned")} />
        <NavSecondary
          items={secondaryNavigation.filter(
            (item) =>
              item.capability === undefined ||
              radioModel.capabilities.includes(item.capability)
          )}
          plannedLabel={t("planned")}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export { AppSidebar }
