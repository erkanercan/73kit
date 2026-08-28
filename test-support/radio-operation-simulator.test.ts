import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const simulatorSource = readFileSync(
  new URL(
    "../components/prototype/radio-operation-simulator.tsx",
    import.meta.url
  ),
  "utf8"
)

const surfacedOperationErrors = [
  "noRadioSelected",
  "serialPermissionDenied",
  "serialPortSelectionRequired",
  "serialPortUnavailable",
  "serialConnectionClosed",
  "serialStreamsUnavailable",
  "webSerialUnavailable",
  "radioAlreadyConnected",
  "radioNotConnected",
  "radioOperationInProgress",
  "radioConnectionClosed",
  "radioResponseTimeout",
  "radioProtocolError",
  "incompatibleRadio",
  "readPasswordRequired",
  "writePasswordRequired",
  "unexpectedRadioResponse",
  "backupHistorySaveFailed",
  "unknownRadioError",
] as const

test("simulates every user-facing Radio operation error", () => {
  for (const errorKey of surfacedOperationErrors) {
    assert.match(simulatorSource, new RegExp(`error: "${errorKey}"`))
  }

  assert.match(simulatorSource, /firmwareCompatibilityStopped/)
  assert.match(simulatorSource, /firmwareDemoSourceMismatch/)
  assert.match(simulatorSource, /firmwareDemoIdentityIncomplete/)
})

test("keeps the Radio operation simulator isolated from devices and storage", () => {
  assert.doesNotMatch(
    simulatorSource,
    /WebSerialTransport|requestPort|navigator\.serial/
  )
  assert.doesNotMatch(simulatorSource, /BackupHistoryStore|indexedDB/)
})
