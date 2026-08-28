import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_SIZE,
  createCodeplug,
} from "../modules/codeplug/index.ts"
import {
  createCpsWorkspace,
  type CompletedRadioRead,
} from "../modules/cps-workspace/index.ts"
import { CODEPLUG_START_ADDRESS } from "../modules/uvl15w-radio/index.ts"
import type { RadioDebugEvent } from "../modules/uvl15w-radio/index.ts"
import {
  encodeRequestFrame,
  encodeResponseFrame,
} from "../modules/uvl15w-radio/protocol.ts"
import {
  ScriptedTransport,
  type ScriptStep,
} from "./scripted-transport/index.ts"
import { InMemoryRadioWriteStore } from "./in-memory-radio-write-store/index.ts"

const encoder = new TextEncoder()

test("prepares and durably stores a reviewed full-range Radio Write without opening the Radio", async () => {
  const baselineBytes = radioBytes()
  const transport = new ScriptedTransport([...readSessionSteps(baselineBytes)])
  const store = new InMemoryRadioWriteStore()
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })
  const visiblePhases: string[] = []

  await workspace.connect()
  const completedRead = await workspace.read()
  const editedCodeplug =
    completedRead.workingCodeplug.codeplug.editDisplaySettings({
      systemTheme: "dark",
    })
  const prepared = await workspace.prepareRadioWrite({
    workingCodeplug: {
      ...completedRead.workingCodeplug,
      codeplug: editedCodeplug,
    },
    changeSet: [{ kind: "edit-display-setting", field: "systemTheme" }],
    onProgress: (snapshot) => {
      visiblePhases.push(snapshot.phase)
    },
  })

  assert.equal(prepared.schemaVersion, 1)
  assert.equal(prepared.layout.id, "uvl15w-3.07.23")
  assert.equal(prepared.baselineBackup.byteLength, CODEPLUG_SIZE)
  assert.equal(prepared.recoveryBackup.byteLength, CODEPLUG_SIZE)
  assert.equal(prepared.intendedWriteImage.byteLength, CODEPLUG_SIZE)
  assert.match(prepared.baselineBackup.sha256, /^[a-f0-9]{64}$/)
  assert.match(prepared.recoveryBackup.sha256, /^[a-f0-9]{64}$/)
  assert.match(prepared.intendedWriteImage.sha256, /^[a-f0-9]{64}$/)
  assert.match(prepared.changeSetSha256, /^[a-f0-9]{64}$/)
  assert.deepEqual(prepared.recoveryBackup, prepared.baselineBackup)

  const persisted = await store.load()
  assert.equal(persisted?.recovery.phase, "review-required")
  assert.deepEqual(persisted?.artifacts.baselineBackup.bytes, baselineBytes)
  assert.deepEqual(persisted?.artifacts.recoveryBackup.bytes, baselineBytes)
  assert.deepEqual(
    persisted?.artifacts.intendedWriteImage.bytes,
    await editedCodeplug
      .materializeWriteImage(CODEPLUG_LAYOUT_3_07_23.id)
      .then((image) => image.toBytes())
  )
  assert.deepEqual(persisted?.changeSet, [
    { kind: "edit-display-setting", field: "systemTheme" },
  ])
  assert.equal(workspace.getRadioWriteSnapshot()?.phase, "review-required")
  assert.deepEqual(visiblePhases, ["review-required"])
  transport.assertComplete()
})

test("completes after every block and E5 Reboot are acknowledged without reconnecting", async () => {
  const baselineBytes = radioBytes()
  const editedCodeplug = createCodeplug(baselineBytes).editDisplaySettings({
    systemTheme: "dark",
  })
  const intendedImage = await editedCodeplug.materializeWriteImage(
    CODEPLUG_LAYOUT_3_07_23.id
  )
  const intendedBytes = intendedImage.toBytes()
  const transport = new ScriptedTransport([
    ...readSessionSteps(baselineBytes),
    ...writeSessionSteps(intendedBytes),
  ])
  const store = new InMemoryRadioWriteStore()
  const debugEvents: RadioDebugEvent[] = []
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
    onDebugEvent: (event) => {
      debugEvents.push(event)
    },
  })
  const visiblePhases: string[] = []

  await workspace.connect()
  const completedRead = await workspace.read()
  await workspace.prepareRadioWrite({
    workingCodeplug: {
      ...completedRead.workingCodeplug,
      codeplug: editedCodeplug,
    },
    changeSet: [{ kind: "edit-display-setting", field: "systemTheme" }],
  })
  const result = await workspace.executePreparedRadioWrite({
    onProgress: (snapshot) => {
      visiblePhases.push(snapshot.phase)
    },
  })

  assert.deepEqual(result.baselineBackup.codeplug.toBytes(), intendedBytes)
  assert.deepEqual(result.workingCodeplug.codeplug.toBytes(), intendedBytes)
  assert.equal(result.backupHistory.length, 2)
  assert.deepEqual(
    result.backupHistory.map((backup) => backup.codeplug.toBytes()),
    [baselineBytes, intendedBytes]
  )
  const writeBlocks = debugEvents.filter(
    (event) => event.direction === "sent" && event.command === 0xe4
  )
  assert.equal(writeBlocks.length, 200)
  assert.deepEqual(writeBlocks[0], {
    sequence: writeBlocks[0]?.sequence,
    direction: "sent",
    command: 0xe4,
    payloadLength: 518,
    address: CODEPLUG_START_ADDRESS,
    dataLength: 512,
    attempt: 1,
  })
  assert.equal(JSON.stringify(debugEvents).includes("PROTOTYPE"), false)
  assert.equal(workspace.getSnapshot().status, "ready")
  assert.equal(workspace.getRadioWriteSnapshot()?.phase, "completed")
  assert.equal(await store.load(), null)
  assert.ok(store.savedPhases.includes("writing-before-first-block"))
  assert.ok(store.savedPhases.includes("writing"))
  assert.deepEqual(
    [...new Set(visiblePhases)],
    ["checking-radio", "writing-before-first-block", "writing", "completed"]
  )
  transport.assertComplete()
})

test("stops before preparation when the Change Set is empty", async () => {
  const baselineBytes = radioBytes()
  const transport = new ScriptedTransport(readSessionSteps(baselineBytes))
  const store = new InMemoryRadioWriteStore()
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })

  await workspace.connect()
  const completedRead = await workspace.read()
  await assert.rejects(
    workspace.prepareRadioWrite({
      workingCodeplug: completedRead.workingCodeplug,
      changeSet: [],
    }),
    /empty Change Set/
  )

  assert.equal(await store.load(), null)
  assert.equal(workspace.getRadioWriteSnapshot(), null)
  transport.assertComplete()
})

test("persists Write Outcome Unknown and restores it after a workspace reload", async () => {
  const baselineBytes = radioBytes()
  const editedCodeplug = createCodeplug(baselineBytes).editDisplaySettings({
    systemTheme: "dark",
  })
  const intendedBytes = (
    await editedCodeplug.materializeWriteImage(CODEPLUG_LAYOUT_3_07_23.id)
  ).toBytes()
  const interruptedWrite = writeSessionSteps(intendedBytes).slice(0, 3)
  interruptedWrite[2] = { ...interruptedWrite[2], responseChunks: [] }
  const transport = new ScriptedTransport([
    ...readSessionSteps(baselineBytes),
    ...interruptedWrite,
  ])
  const store = new InMemoryRadioWriteStore()
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 5,
    radioWriteStore: store,
  })

  await workspace.connect()
  const completedRead = await workspace.read()
  await workspace.prepareRadioWrite({
    workingCodeplug: {
      ...completedRead.workingCodeplug,
      codeplug: editedCodeplug,
    },
    changeSet: [{ kind: "edit-display-setting", field: "systemTheme" }],
  })
  await assert.rejects(workspace.executePreparedRadioWrite(), {
    code: "response-timeout",
  })

  assert.equal((await store.load())?.recovery.phase, "write-outcome-unknown")
  assert.equal(
    workspace.getRadioWriteSnapshot()?.phase,
    "write-outcome-unknown"
  )

  const reloaded = createCpsWorkspace(new ScriptedTransport([]), {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })
  const restored = await reloaded.restoreRadioWriteRecovery()

  assert.equal(restored?.phase, "write-outcome-unknown")
  assert.equal(reloaded.getRadioWriteSnapshot()?.phase, "write-outcome-unknown")
  await reloaded.discardRadioWriteOperation()
  assert.equal(reloaded.getRadioWriteSnapshot(), null)
  assert.equal(await store.load(), null)
  transport.assertComplete()
})

test("rejects a different Radio before E3 and retains the reviewed operation", async () => {
  const baselineBytes = radioBytes()
  const transport = new ScriptedTransport([
    ...readSessionSteps(baselineBytes),
    handshakeStep({ serialNumber: "UVL15W-TEST-0002" }),
  ])
  const store = new InMemoryRadioWriteStore()
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })

  await workspace.connect()
  const completedRead = await workspace.read()
  await workspace.prepareRadioWrite(changedWorkingCodeplug(completedRead))
  await assert.rejects(
    workspace.executePreparedRadioWrite(),
    /not the Source Radio/
  )

  assert.equal((await store.load())?.recovery.phase, "review-required")
  assert.equal(workspace.getRadioWriteSnapshot()?.phase, "review-required")
  transport.assertComplete()
})

test("restores only an interrupted data transfer as Write Outcome Unknown", async () => {
  const baselineBytes = radioBytes()
  const setupTransport = new ScriptedTransport([
    ...readSessionSteps(baselineBytes),
  ])
  const setupStore = new InMemoryRadioWriteStore()
  const setupWorkspace = createCpsWorkspace(setupTransport, {
    responseTimeoutMs: 100,
    radioWriteStore: setupStore,
  })
  await setupWorkspace.connect()
  const completedRead = await setupWorkspace.read()
  await setupWorkspace.prepareRadioWrite(changedWorkingCodeplug(completedRead))
  const prepared = await setupStore.load()
  assert.ok(prepared)

  for (const phase of ["writing"] as const) {
    const store = new InMemoryRadioWriteStore()
    store.value = {
      ...prepared,
      recovery: { ...prepared.recovery, phase },
    }
    const reloaded = createCpsWorkspace(new ScriptedTransport([]), {
      radioWriteStore: store,
    })

    const restored = await reloaded.restoreRadioWriteRecovery()

    assert.equal(restored?.phase, "write-outcome-unknown")
    assert.equal((await store.load())?.recovery.phase, "write-outcome-unknown")
  }

  const reviewStore = new InMemoryRadioWriteStore()
  reviewStore.value = prepared
  const reviewReload = createCpsWorkspace(new ScriptedTransport([]), {
    radioWriteStore: reviewStore,
  })
  assert.equal(
    (await reviewReload.restoreRadioWriteRecovery())?.phase,
    "review-required"
  )

  const preBlockStore = new InMemoryRadioWriteStore()
  preBlockStore.value = {
    ...prepared,
    recovery: { ...prepared.recovery, phase: "writing-before-first-block" },
  }
  const preBlockReload = createCpsWorkspace(new ScriptedTransport([]), {
    radioWriteStore: preBlockStore,
  })
  assert.equal(
    (await preBlockReload.restoreRadioWriteRecovery())?.phase,
    "review-required"
  )
  setupTransport.assertComplete()
})

test("resumes a durably reviewed operation after reload without reconstructing it from UI state", async () => {
  const baselineBytes = radioBytes()
  const setupTransport = new ScriptedTransport([
    ...readSessionSteps(baselineBytes),
  ])
  const store = new InMemoryRadioWriteStore()
  const setupWorkspace = createCpsWorkspace(setupTransport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })
  await setupWorkspace.connect()
  const completedRead = await setupWorkspace.read()
  await setupWorkspace.prepareRadioWrite(changedWorkingCodeplug(completedRead))
  const prepared = await store.load()
  assert.ok(prepared)

  const intendedBytes = prepared.artifacts.intendedWriteImage.bytes
  const resumedTransport = new ScriptedTransport([
    ...writeSessionSteps(intendedBytes),
  ])
  const reloaded = createCpsWorkspace(resumedTransport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })
  assert.equal(
    (await reloaded.restoreRadioWriteRecovery())?.phase,
    "review-required"
  )
  const result = await reloaded.executePreparedRadioWrite()

  assert.deepEqual(result.baselineBackup.codeplug.toBytes(), intendedBytes)
  assert.equal(result.backupHistory.length, 2)
  assert.equal(await store.load(), null)
  setupTransport.assertComplete()
  resumedTransport.assertComplete()
})

test("rejects corrupted durable artifacts before opening a write session", async () => {
  const baselineBytes = radioBytes()
  const transport = new ScriptedTransport([...readSessionSteps(baselineBytes)])
  const store = new InMemoryRadioWriteStore()
  const workspace = createCpsWorkspace(transport, {
    responseTimeoutMs: 100,
    radioWriteStore: store,
  })

  await workspace.connect()
  const completedRead = await workspace.read()
  await workspace.prepareRadioWrite(changedWorkingCodeplug(completedRead))
  const persisted = await store.load()
  assert.ok(persisted)
  persisted.artifacts.intendedWriteImage.bytes[0] ^= 0xff

  await assert.rejects(
    workspace.executePreparedRadioWrite(),
    /artifact .* is invalid/
  )

  assert.equal((await store.load())?.recovery.phase, "review-required")
  transport.assertComplete()
})

function radioBytes() {
  const bytes = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 17 + 3) & 0xff
  )
  bytes[0x15425 - CODEPLUG_START_ADDRESS] = 0
  return bytes
}

function changedWorkingCodeplug(completedRead: CompletedRadioRead) {
  return {
    workingCodeplug: {
      ...completedRead.workingCodeplug,
      codeplug: completedRead.workingCodeplug.codeplug.editDisplaySettings({
        systemTheme: "dark",
      }),
    },
    changeSet: [
      { kind: "edit-display-setting" as const, field: "systemTheme" as const },
    ],
  }
}

function readSessionSteps(bytes: Uint8Array) {
  const steps: ScriptStep[] = [handshakeStep(), beginReadStep()]

  for (let offset = 0; offset < bytes.byteLength; offset += 128) {
    const address = CODEPLUG_START_ADDRESS + offset
    const block = bytes.slice(offset, offset + 128)
    steps.push({
      expectedWrite: encodeRequestFrame(
        0xe6,
        addressAndLengthPayload(address, block.byteLength)
      ),
      responseChunks: [
        encodeResponseFrame(0xe4, readResponsePayload(address, block)),
      ],
    })
  }

  steps.push({
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Read Complete")),
    responseChunks: [encodeResponseFrame(0xe5, encoder.encode("Reboot"))],
  })
  return steps
}

function writeSessionSteps(bytes: Uint8Array) {
  const steps: ScriptStep[] = [
    handshakeStep(),
    {
      expectedWrite: encodeRequestFrame(0xe3, addressRangePayload()),
      responseChunks: [
        encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
      ],
    },
  ]

  for (let offset = 0; offset < bytes.byteLength; offset += 512) {
    const address = CODEPLUG_START_ADDRESS + offset
    const block = bytes.slice(offset, offset + 512)
    steps.push({
      expectedWrite: encodeRequestFrame(
        0xe4,
        writeRequestPayload(address, block)
      ),
      responseChunks: [
        encodeResponseFrame(
          0xe6,
          writeAcknowledgementPayload(address, block.byteLength)
        ),
      ],
    })
  }

  steps.push({
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Write Complete")),
    responseChunks: [encodeResponseFrame(0xe5, encoder.encode("Reboot"))],
  })
  return steps
}

function handshakeStep(
  options: { readonly serialNumber?: string } = {}
): ScriptStep {
  return {
    expectedWrite: encodeRequestFrame(0xe0, encoder.encode("UVL-15W")),
    responseChunks: [
      encodeResponseFrame(0xe1, deviceInformationPayload(options)),
    ],
  }
}

function beginReadStep(): ScriptStep {
  return {
    expectedWrite: encodeRequestFrame(0xe2, addressRangePayload()),
    responseChunks: [
      encodeResponseFrame(0xe2, encoder.encode("READ START OK")),
    ],
  }
}

function addressRangePayload() {
  const payload = new Uint8Array(8)
  const view = new DataView(payload.buffer)
  view.setUint32(0, CODEPLUG_LAYOUT_3_07_23.startAddress, false)
  view.setUint32(4, CODEPLUG_LAYOUT_3_07_23.endAddress, false)
  return payload
}

function addressAndLengthPayload(address: number, length: number) {
  const payload = new Uint8Array(6)
  const view = new DataView(payload.buffer)
  view.setUint32(0, address, false)
  view.setUint16(4, length, false)
  return payload
}

function readResponsePayload(address: number, block: Uint8Array) {
  const payload = new Uint8Array(6 + block.byteLength)
  payload.set(addressAndLengthPayload(address, block.byteLength), 0)
  payload.set(block, 6)
  return payload
}

function writeRequestPayload(address: number, block: Uint8Array) {
  const payload = new Uint8Array(6 + block.byteLength)
  payload.set(addressAndLengthPayload(address, block.byteLength), 0)
  payload.set(block, 6)
  return payload
}

function writeAcknowledgementPayload(address: number, length: number) {
  const payload = new Uint8Array(11)
  payload.set(encoder.encode("WF OK"), 0)
  const view = new DataView(payload.buffer)
  view.setUint32(5, address, false)
  view.setUint16(9, length, false)
  return payload
}

function deviceInformationPayload(
  options: { readonly serialNumber?: string } = {}
) {
  const payload = new Uint8Array(81)
  writeAscii(payload, 0, "UVL-15W")
  payload[7] = 0x5f
  payload[8] = 1
  payload[9] = 0x5f
  writeAscii(payload, 12, "V3.07.23")
  payload[20] = 0x5f
  payload.set(Uint8Array.of(1, 2, 3), 21)
  payload.set(
    Uint8Array.from({ length: 12 }, (_, index) => index + 1),
    24
  )
  writeAscii(payload, 36, "BOOT-TEST")
  writeAscii(payload, 52, "HW-TEST")
  writeAscii(payload, 61, options.serialNumber ?? "UVL15W-TEST-0001")
  return payload
}

function writeAscii(target: Uint8Array, offset: number, value: string) {
  target.set(encoder.encode(value), offset)
}
