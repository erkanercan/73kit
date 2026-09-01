import {
  createCpsWorkspace,
  type CpsWorkspaceOptions,
} from "../cps-workspace/index.ts"
import type { RadioTransport } from "../uvl15w-radio/transport.ts"
import { getRadioModel, type RadioModelId } from "./index.ts"

function createCpsWorkspaceForRadioModel(
  radioModelId: RadioModelId,
  transport: RadioTransport,
  options: CpsWorkspaceOptions = {}
) {
  const radioModel = getRadioModel(radioModelId)

  switch (radioModel.driverId) {
    case "uvl15w-normal-mode-v3":
      return createCpsWorkspace(transport, options)
    default:
      throw new Error(
        `Radio Model ${radioModel.id} has no registered CPS implementation`
      )
  }
}

export { createCpsWorkspaceForRadioModel }
