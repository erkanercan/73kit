"use client"

import * as React from "react"
import {
  DownloadIcon,
  LoaderCircleIcon,
  RadioIcon,
  UploadIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  useCpsWorkspace,
  type WorkspaceStatus,
} from "@/components/cps-workspace-provider"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

function CpsAppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations()

  return (
    <SidebarProvider
      labels={{
        title: t("sidebarTitle"),
        description: t("sidebarDescription"),
        close: t("sidebarClose"),
        toggle: t("sidebarToggle"),
      }}
    >
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div id="main-content" className="flex flex-1 flex-col">
          {children}
        </div>
        <WorkspaceStatusBar />
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppHeader() {
  const { busy, readRadio, webSerialSupported } = useCpsWorkspace()
  const t = useTranslations()

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
            <BreadcrumbPage>{t("navRadio")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher />
        <Button
          size="sm"
          disabled={busy || webSerialSupported !== true}
          onClick={() => void readRadio()}
        >
          {busy ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          <span className="hidden sm:inline">
            {busy ? t("readingRadio") : t("readRadio")}
          </span>
          <span className="sr-only sm:hidden">
            {busy ? t("readingRadioPlain") : t("readRadio")}
          </span>
        </Button>
        <Button size="sm" variant="outline" disabled>
          <UploadIcon data-icon="inline-start" />
          <span className="hidden sm:inline">{t("writeRadio")}</span>
          <span className="sr-only sm:hidden">{t("writeRadioPlanned")}</span>
        </Button>
        <Badge variant="outline" className="hidden lg:inline-flex">
          {t("planned")}
        </Badge>
      </div>
    </header>
  )
}

function WorkspaceStatusBar() {
  const { completedRead, sourceRadio, status } = useCpsWorkspace()
  const t = useTranslations()

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
          <StatusBadge status={status} />
        </div>
        <span>
          {t("workingCodeplug")}: {completedRead ? t("ready") : t("none")}
        </span>
        <span>{t("changesCount", { count: 0 })}</span>
        <span>
          {t("localSave", {
            value: completedRead ? t("sessionOnly") : t("noData"),
          })}
        </span>
      </footer>
    </>
  )
}

function StatusBadge({ status }: { status: WorkspaceStatus }) {
  const t = useTranslations()
  const labels: Record<WorkspaceStatus, string> = {
    disconnected: t("disconnected"),
    connecting: t("connecting"),
    reading: t("reading"),
    ready: t("backupReady"),
  }

  return (
    <Badge variant={status === "disconnected" ? "outline" : "secondary"}>
      {labels[status]}
    </Badge>
  )
}

export { CpsAppShell, StatusBadge }
