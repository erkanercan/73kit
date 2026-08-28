"use client"

import * as React from "react"

import {
  useCpsWorkspaceController,
  type CpsWorkspaceContextValue,
} from "@/components/cps-workspace-controller"

const CpsWorkspaceContext =
  React.createContext<CpsWorkspaceContextValue | null>(null)

function CpsWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const value = useCpsWorkspaceController()
  return (
    <CpsWorkspaceContext.Provider value={value}>
      {children}
    </CpsWorkspaceContext.Provider>
  )
}

function useCpsWorkspace() {
  const context = React.useContext(CpsWorkspaceContext)
  if (!context) {
    throw new Error("useCpsWorkspace must be used within CpsWorkspaceProvider")
  }
  return context
}

export { CpsWorkspaceProvider, useCpsWorkspace }
export type {
  WorkspaceChange,
  WorkspaceError,
  WorkspaceErrorKey,
  WorkspacePhase,
} from "@/components/cps-workspace-controller"
