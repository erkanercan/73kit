"use client"

import * as React from "react"

import {
  getRadioModel,
  radioCpsPath,
  type RadioModelDefinition,
  type RadioModelId,
} from "@/modules/radio-support/index"

const RadioModelContext = React.createContext<RadioModelDefinition | null>(null)

function RadioModelProvider({
  radioModelId,
  children,
}: {
  radioModelId: RadioModelId
  children: React.ReactNode
}) {
  const radioModel = getRadioModel(radioModelId)
  return (
    <RadioModelContext.Provider value={radioModel}>
      {children}
    </RadioModelContext.Provider>
  )
}

function useRadioModel() {
  const radioModel = React.useContext(RadioModelContext)
  if (!radioModel) {
    throw new Error("useRadioModel must be used within RadioModelProvider")
  }
  return radioModel
}

function useRadioCpsPath(suffix = "") {
  return radioCpsPath(useRadioModel().id, suffix)
}

export { RadioModelProvider, useRadioCpsPath, useRadioModel }
