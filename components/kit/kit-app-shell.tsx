"use client"

import { LanguageSwitcher } from "@/components/language-switcher"
import { KitSidebar } from "@/components/kit/kit-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

function KitAppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations()

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      labels={{
        title: t("sidebarTitle"),
        description: t("kitSidebarDescription"),
        close: t("sidebarClose"),
        toggle: t("sidebarToggle"),
      }}
    >
      <KitSidebar />
      <SidebarInset className="h-svh min-h-0 overflow-hidden md:h-[calc(100svh-1rem)]">
        <KitHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
        <Separator />
        <footer className="flex min-h-10 items-center justify-end px-4 py-2 text-xs text-muted-foreground">
          <a
            href="https://erkan.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("footerMadeBy")} TA4EN - erkan.dev
          </a>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}

function KitHeader() {
  const pathname = usePathname()
  const t = useTranslations()
  const title =
    pathname === "/cps"
      ? t("radioCpsTitle")
      : pathname === "/diagnostics"
        ? t("navDiagnostics")
        : pathname === "/about"
          ? t("navAbout")
          : t("kitHomeTitle")

  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-auto"
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </header>
  )
}

export { KitAppShell }
