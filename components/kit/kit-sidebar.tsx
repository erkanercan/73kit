"use client"

import Image from "next/image"
import {
  BookOpenIcon,
  CircleGaugeIcon,
  HouseIcon,
  RadioIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/navigation"

function KitSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const t = useTranslations()

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
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("kitNavigation")}</SidebarGroupLabel>
          <SidebarMenu>
            <KitSidebarItem
              href="/"
              title={t("kitHomeTitle")}
              icon={HouseIcon}
              active={pathname === "/"}
            />
            <KitSidebarItem
              href="/cps"
              title={t("radioCpsTitle")}
              icon={RadioIcon}
              active={pathname.startsWith("/cps")}
            />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <KitSidebarItem
            href="/diagnostics"
            title={t("navDiagnostics")}
            icon={CircleGaugeIcon}
            active={pathname === "/diagnostics"}
          />
          <KitSidebarItem
            href="/about"
            title={t("navAbout")}
            icon={BookOpenIcon}
            active={pathname === "/about"}
          />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function KitSidebarItem({
  href,
  title,
  icon: Icon,
  active,
}: {
  href: string
  title: string
  icon: typeof HouseIcon
  active: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={title}
        isActive={active}
        render={<Link href={href} />}
      >
        <Icon />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export { KitSidebar }
