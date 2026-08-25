"use client"

import * as React from "react"
import {
  DownloadIcon,
  LoaderCircleIcon,
  RadioIcon,
  UploadIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  CpsWorkspaceProvider,
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
  return (
    <CpsWorkspaceProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div id="main-content" className="flex flex-1 flex-col">
            {children}
          </div>
          <WorkspaceStatusBar />
        </SidebarInset>
      </SidebarProvider>
    </CpsWorkspaceProvider>
  )
}

function AppHeader() {
  const { busy, readRadio, webSerialSupported } = useCpsWorkspace()

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
            <BreadcrumbPage>Radio</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
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
            {busy ? "Reading Radio…" : "Read Radio"}
          </span>
          <span className="sr-only sm:hidden">
            {busy ? "Reading Radio" : "Read Radio"}
          </span>
        </Button>
        <Button size="sm" variant="outline" disabled>
          <UploadIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Write Radio</span>
          <span className="sr-only sm:hidden">Write Radio is planned</span>
        </Button>
        <Badge variant="outline" className="hidden lg:inline-flex">
          Planned
        </Badge>
      </div>
    </header>
  )
}

function WorkspaceStatusBar() {
  const { completedRead, sourceRadio, status } = useCpsWorkspace()

  return (
    <>
      <Separator />
      <footer
        aria-live="polite"
        className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-1.5">
          <RadioIcon aria-hidden="true" />
          <span>{sourceRadio?.model ?? "No Radio"}</span>
          <StatusBadge status={status} />
        </div>
        <span>Working Codeplug: {completedRead ? "Ready" : "None"}</span>
        <span>Changes: 0</span>
        <span>Local save: {completedRead ? "Session only" : "No data"}</span>
      </footer>
    </>
  )
}

function StatusBadge({ status }: { status: WorkspaceStatus }) {
  const labels: Record<WorkspaceStatus, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting",
    reading: "Reading",
    ready: "Backup ready",
  }

  return (
    <Badge variant={status === "disconnected" ? "outline" : "secondary"}>
      {labels[status]}
    </Badge>
  )
}

export { CpsAppShell, StatusBadge }
