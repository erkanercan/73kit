"use client"

import * as React from "react"
import { RadioIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { RadioReadButton } from "@/components/radio-read-button"
import { RadioWriteDialog } from "@/components/radio-write/radio-write-dialog"
import {
  useCpsWorkspace,
  type WorkspacePhase,
} from "@/components/cps-workspace-provider"
import { useUpdateCoordinator } from "@/components/update-coordinator-provider"
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

function CpsAppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations()

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      labels={{
        title: t("sidebarTitle"),
        description: t("sidebarDescription"),
        close: t("sidebarClose"),
        toggle: t("sidebarToggle"),
      }}
    >
      <AppSidebar />
      <SidebarInset className="h-svh min-h-0 overflow-hidden md:h-[calc(100svh-1rem)]">
        <AppHeader />
        <div
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-auto"
        >
          {children}
        </div>
        <WorkspaceStatusBar />
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppHeader() {
  const { busy, capability, completedRead, readRadio } = useCpsWorkspace()
  const { busy: updateBusy } = useUpdateCoordinator()
  const pathname = usePathname()
  const t = useTranslations()
  const exactPageTitles: Record<string, string> = {
    "/": t("navOverview"),
    "/radio": t("navRadio"),
    "/channels": t("navChannels"),
    "/zones": t("navZones"),
    "/scan-lists": t("navScanLists"),
    "/vfo-scan-edges": t("navVfoScanEdges"),
    "/aprs": t("navAprs"),
    "/gps": t("navGps"),
    "/spectrum": t("navSpectrum"),
    "/bluetooth": t("navBluetooth"),
    "/fm-radio": t("navFmRadio"),
    "/signal-system": t("navSignalSystem"),
    "/backups": t("navBackups"),
    "/updates": t("navUpdates"),
    "/prototype/firmware-compatibility": t("navFirmwareSimulator"),
    "/prototype/radio-write": t("radioWriteTitle"),
  }
  const pageTitle = pathname.startsWith("/radio-settings")
    ? t("navSettings")
    : (exactPageTitles[pathname] ?? t("navOverview"))
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
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher />
        <RadioReadButton
          size="sm"
          busy={busy}
          compact
          disabled={updateBusy || capability !== "available"}
          readAgain={completedRead !== null}
          onClick={() => void readRadio()}
        />
        <RadioWriteDialog />
      </div>
    </header>
  )
}

function WorkspaceStatusBar() {
  const { changes, completedRead, phase, sourceRadio } = useCpsWorkspace()
  const pathname = usePathname()
  const t = useTranslations()

  if (pathname === "/" || pathname === "/updates") return null

  return (
    <>
      <Separator />
      <footer
        aria-live="polite"
        className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-1.5">
          <RadioIcon aria-hidden="true" />
          <span>{sourceRadio?.model ?? t("noRadio")}</span>
          <StatusText phase={phase} />
        </div>
        <span>
          {t("workingCodeplug")}: {completedRead ? t("ready") : t("none")}
        </span>
        <span>{t("changesCount", { count: changes.length })}</span>
        <span>
          {t("localSave", {
            value: completedRead ? t("sessionOnly") : t("noData"),
          })}
        </span>
      </footer>
    </>
  )
}

function StatusText({ phase }: { phase: WorkspacePhase }) {
  const t = useTranslations()
  const labels: Record<WorkspacePhase, string> = {
    idle: t("idle"),
    connecting: t("connecting"),
    reading: t("reading"),
    ready: t("backupReady"),
  }

  return <span className="font-medium">{labels[phase]}</span>
}

export { CpsAppShell, StatusText }
