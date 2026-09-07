"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { AppSidebar } from "@/components/app-sidebar"
import { DocumentHistoryControls } from "@/components/document-history-controls"
import { LanguageSwitcher } from "@/components/language-switcher"
import { CodeplugFileActions } from "@/components/codeplug-file-actions"
import { RadioReadButton } from "@/components/radio-read-button"
import { useRadioModel } from "@/components/radio-model-provider"
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
import { Link, usePathname } from "@/i18n/navigation"
import { formatPercent } from "@/lib/format-percent"
import {
  evaluateFirmwareSupport,
  radioCpsPath,
} from "@/modules/radio-support/index"

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
  const radioModel = useRadioModel()
  const t = useTranslations()
  const basePath = radioCpsPath(radioModel.id)
  const workspacePath =
    pathname === basePath ? "/" : pathname.slice(basePath.length) || "/"
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
    "/diagnostics": t("navDiagnostics"),
    "/about": t("navAbout"),
    "/prototype/firmware-compatibility": t("navFirmwareSimulator"),
    "/prototype/radio-write": t("radioWriteTitle"),
  }
  const pageTitle = workspacePath.startsWith("/radio-settings")
    ? t("navSettings")
    : (exactPageTitles[workspacePath] ?? t("navOverview"))
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
        <DocumentHistoryControls />
        <LanguageSwitcher />
        <CodeplugFileActions />
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
  const { changes, completedRead, phase, progress, sourceRadio } =
    useCpsWorkspace()
  const t = useTranslations()
  const radioModel = useRadioModel()
  const supportProfile = sourceRadio
    ? evaluateFirmwareSupport(radioModel.id, sourceRadio.firmwareVersion)
    : null
  const radioStatus =
    phase === "connecting"
      ? t("footerRadioConnecting")
      : phase === "reading"
        ? t("footerRadioReading", { progress: formatPercent(progress) })
        : sourceRadio
          ? t(
              supportProfile?.status === "beta"
                ? "footerRadioReadyBeta"
                : "footerRadioReady",
              {
                model: sourceRadio.model,
                version: sourceRadio.firmwareVersion,
              }
            )
          : t("footerRadioDisconnected")

  return (
    <>
      <Separator />
      <footer className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-xs text-muted-foreground">
        <dl
          aria-live="polite"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1"
        >
          <WorkspaceStatusItem
            label={t("footerRadioLabel")}
            value={radioStatus}
          />
          <WorkspaceStatusItem
            label={t("footerCodeplugLabel")}
            value={
              completedRead
                ? t("footerCodeplugReady")
                : t("footerCodeplugUnavailable")
            }
          />
          {completedRead && (
            <WorkspaceStatusItem
              label={t("footerChangesLabel")}
              value={
                changes.length === 0
                  ? t("footerNoPendingChanges")
                  : t("footerPendingChanges", { count: changes.length })
              }
            />
          )}
        </dl>
        <Link
          href="/privacy"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("navPrivacy")}
        </Link>
        <a
          href="https://erkan.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("footerMadeBy")} TA4EN - erkan.dev
        </a>
      </footer>
    </>
  )
}

function WorkspaceStatusItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <dt>{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
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
