"use client"

import * as React from "react"

import {
  useUpdateCoordinatorController,
  type UpdateCoordinatorContextValue,
} from "@/components/update-coordinator-controller"

const UpdateCoordinatorContext =
  React.createContext<UpdateCoordinatorContextValue | null>(null)

function UpdateCoordinatorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const value = useUpdateCoordinatorController()
  return (
    <UpdateCoordinatorContext.Provider value={value}>
      {children}
    </UpdateCoordinatorContext.Provider>
  )
}

function useUpdateCoordinator() {
  const context = React.useContext(UpdateCoordinatorContext)
  if (!context) {
    throw new Error(
      "useUpdateCoordinator must be used within UpdateCoordinatorProvider"
    )
  }
  return context
}

export { UpdateCoordinatorProvider, useUpdateCoordinator }
export type {
  UpdateCoordinatorErrorCode,
  UpdateCoordinatorPhase,
  UpdateRecoveryRecord,
} from "@/components/update-coordinator-controller"
