import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import { createCpsWorkspace } from "../modules/cps-workspace/index.ts"
import {
  CODEPLUG_START_ADDRESS,
  UnsupportedFirmwareError,
  createUvl15wRadio,
  evaluateFirmwareCompatibility,
} from "../modules/uvl15w-radio/index.ts"
import {
  ResponseFrameDecoder,
  encodeRequestFrame,
  encodeResponseFrame,
  escapeBytes,
  unescapeBytes,
} from "../modules/uvl15w-radio/protocol.ts"
import {
  ScriptedTransport,
  type ScriptStep,
} from "./scripted-transport/index.ts"

const encoder = new TextEncoder()

test("encodes the known-good E0 handshake frame", () => {
  const actual = encodeRequestFrame(0xe0, encoder.encode("UVL-15W"))

  assert.deepEqual(
    [...actual],
    hex("FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD")
  )
})

test("encodes the known-good E2 full-read frame with uint8 wrapping", () => {
  const payload = Uint8Array.of(0x00, 0x00, 0x80, 0x00, 0x00, 0x02, 0x10, 0x00)
  const actual = encodeRequestFrame(0xe2, payload)

  assert.deepEqual(
    [...actual],
    hex("FE FE EE EF E2 80 80 00 80 80 82 90 80 EE FD")
  )
})

test("round-trips every byte through TYT escaping", () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, index) => index)
  assert.deepEqual(unescapeBytes(escapeBytes(bytes)), bytes)
})

test("reassembles a response across arbitrary serial chunks", () => {
  const decoder = new ResponseFrameDecoder()
  const frame = encodeResponseFrame(0xe2, encoder.encode("READ START OK"))
  const events = [...frame].flatMap((byte) => decoder.push(Uint8Array.of(byte)))

  assert.equal(events.length, 1)
  assert.equal(events[0]?.type, "frame")
  if (events[0]?.type === "frame") {
    assert.equal(events[0].frame.command, 0xe2)
    assert.equal(
      new TextDecoder().decode(events[0].frame.payload),
      "READ START OK"
    )
  }
})

test("rejects Codeplugs that are not the complete documented region", () => {
  assert.throws(
    () => createCodeplug(new Uint8Array(CODEPLUG_SIZE - 1)),
    RangeError
  )
})

test("atomically creates a Baseline Backup and Working Codeplug after a complete read", async () => {
  const expectedCodeplug = Uint8Array.from(
    { length: CODEPLUG_SIZE },
    (_, index) => (index * 31) & 0xff
  )
  const steps: ScriptStep[] = [
    {
      expectedWrite: encodeRequestFrame(0xe0, encoder.encode("UVL-15W")),
      responseChunks: splitFrame(
        encodeResponseFrame(0xe1, deviceInformationPayload())
      ),
    },
    {
      expectedWrite: encodeRequestFrame(0xe2, addressRangePayload()),
      responseChunks: splitFrame(
        encodeResponseFrame(0xe2, encoder.encode("READ START OK"))
      ),
    },
  ]

  for (let offset = 0; offset < CODEPLUG_SIZE; offset += 128) {
    const length = Math.min(128, CODEPLUG_SIZE - offset)
    const address = CODEPLUG_START_ADDRESS + offset
    const block = expectedCodeplug.slice(offset, offset + length)

    steps.push({
      expectedWrite: encodeRequestFrame(
        0xe6,
        readRequestPayload(address, length)
      ),
      responseChunks: splitFrame(
        encodeResponseFrame(0xe4, readResponsePayload(address, block))
      ),
    })
  }

  steps.push({
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Read Complete")),
    responseChunks: splitFrame(
      encodeResponseFrame(
        0xe5,
        Uint8Array.of(...encoder.encode("Reboot"), 0, 0)
      )
    ),
  })

  const transport = new ScriptedTransport(steps)
  const workspace = createCpsWorkspace(transport, { responseTimeoutMs: 100 })
  const sourceRadio = await workspace.connect()
  const progress: number[] = []
  const result = await workspace.read({
    onProgress: ({ bytesRead }) => progress.push(bytesRead),
  })

  assert.equal(sourceRadio.serialNumber, "UVL15W-TEST-0001")
  assert.deepEqual(result.baselineBackup.codeplug.toBytes(), expectedCodeplug)
  assert.deepEqual(result.workingCodeplug.codeplug.toBytes(), expectedCodeplug)
  assert.notEqual(
    result.baselineBackup.codeplug,
    result.workingCodeplug.codeplug
  )
  assert.equal(workspace.getSnapshot().status, "ready")
  assert.equal(progress.at(-1), CODEPLUG_SIZE)
  transport.assertComplete()
})

test("starts a later Radio operation with clean receive state after a closed connection", async () => {
  const handshake = encodeRequestFrame(0xe0, encoder.encode("UVL-15W"))
  const transport = new ScriptedTransport([
    { expectedWrite: handshake, closeAfterWrite: true },
    {
      expectedWrite: handshake,
      responseChunks: [encodeResponseFrame(0xe1, deviceInformationPayload())],
    },
  ])
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await assert.rejects(radio.connect(), { code: "connection-closed" })
  const sourceRadio = await radio.connect()

  assert.equal(sourceRadio.serialNumber, "UVL15W-TEST-0001")
  await radio.disconnect()
  transport.assertComplete()
})

test("accepts the validated firmware with or without its V prefix", async () => {
  for (const firmwareVersion of ["V3.07.23", "3.07.23"]) {
    const transport = handshakeTransport(firmwareVersion)
    const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

    const sourceRadio = await radio.connect()

    assert.equal(sourceRadio.firmwareVersion, firmwareVersion)
    await radio.disconnect()
    transport.assertComplete()
  }
})

test("evaluates arbitrary firmware values without opening a Radio connection", () => {
  assert.deepEqual(evaluateFirmwareCompatibility("V3.07.23"), {
    status: "supported",
    detectedVersion: "V3.07.23",
    normalizedVersion: "3.07.23",
    validatedVersions: ["3.07.23"],
  })
  assert.equal(evaluateFirmwareCompatibility("3.07.9").status, "unsupported")
  assert.deepEqual(evaluateFirmwareCompatibility("3.08.00"), {
    status: "unsupported",
    detectedVersion: "3.08.00",
    normalizedVersion: "3.08.00",
    validatedVersions: ["3.07.23"],
    reason: "newer-unvalidated",
  })
  assert.deepEqual(evaluateFirmwareCompatibility("FW1.0"), {
    status: "unsupported",
    detectedVersion: "FW1.0",
    normalizedVersion: null,
    validatedVersions: ["3.07.23"],
    reason: "unrecognized",
  })
})

test("rejects firmware that is not validated before a Radio Read can start", async (context) => {
  const cases = [
    { version: "3.07.22", reason: "older" },
    { version: "3.07.9", reason: "older" },
    { version: "3.08.00", reason: "newer-unvalidated" },
    { version: "", reason: "unrecognized" },
    { version: "FW1.0", reason: "unrecognized" },
  ] as const

  for (const testCase of cases) {
    await context.test(testCase.version || "blank version", async () => {
      const transport = handshakeTransport(testCase.version)
      const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

      await assert.rejects(radio.connect(), (error) => {
        assert.ok(error instanceof UnsupportedFirmwareError)
        assert.equal(error.code, "unsupported-firmware")
        assert.equal(error.detectedVersion, testCase.version)
        assert.equal(error.validatedVersion, "3.07.23")
        assert.equal(error.reason, testCase.reason)
        return true
      })
      await assert.rejects(radio.read(), { code: "not-connected" })
      transport.assertComplete()
    })
  }
})

test("keeps the CPS Workspace disconnected when firmware is unsupported", async () => {
  const transport = handshakeTransport("3.07.22")
  const workspace = createCpsWorkspace(transport, { responseTimeoutMs: 100 })

  await assert.rejects(workspace.connect(), UnsupportedFirmwareError)

  assert.deepEqual(workspace.getSnapshot(), { status: "disconnected" })
  transport.assertComplete()
})

test("closes a timed-out operation before a later Radio operation starts", async () => {
  const handshake = encodeRequestFrame(0xe0, encoder.encode("UVL-15W"))
  const transport = new ScriptedTransport([
    { expectedWrite: handshake, responseChunks: [] },
    {
      expectedWrite: handshake,
      responseChunks: [encodeResponseFrame(0xe1, deviceInformationPayload())],
    },
  ])
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 5 })

  await assert.rejects(radio.connect(), { code: "response-timeout" })
  const sourceRadio = await radio.connect()

  assert.equal(sourceRadio.model, "UVL-15W")
  await radio.disconnect()
  transport.assertComplete()
})

function addressRangePayload() {
  const payload = new Uint8Array(8)
  const view = new DataView(payload.buffer)
  view.setUint32(0, 0x8000, false)
  view.setUint32(4, 0x21000, false)
  return payload
}

function readRequestPayload(address: number, length: number) {
  const payload = new Uint8Array(6)
  const view = new DataView(payload.buffer)
  view.setUint32(0, address, false)
  view.setUint16(4, length, false)
  return payload
}

function readResponsePayload(address: number, data: Uint8Array) {
  const payload = new Uint8Array(6 + data.byteLength)
  const view = new DataView(payload.buffer)
  view.setUint32(0, address, false)
  view.setUint16(4, data.byteLength, false)
  payload.set(data, 6)
  return payload
}

function handshakeTransport(firmwareVersion: string) {
  return new ScriptedTransport([
    {
      expectedWrite: encodeRequestFrame(0xe0, encoder.encode("UVL-15W")),
      responseChunks: [
        encodeResponseFrame(0xe1, deviceInformationPayload(firmwareVersion)),
      ],
    },
  ])
}

function deviceInformationPayload(firmwareVersion = "V3.07.23") {
  const payload = new Uint8Array(81)
  writeAscii(payload, 0, "UVL-15W")
  payload[7] = 0x5f
  payload[8] = 0x01
  payload[9] = 0x5f
  payload[10] = 0
  payload[11] = 0
  writeAscii(payload, 12, firmwareVersion)
  payload[20] = 0x5f
  payload.set(Uint8Array.of(1, 2, 3), 21)
  payload.set(
    Uint8Array.from({ length: 12 }, (_, index) => index + 1),
    24
  )
  writeAscii(payload, 36, "BOOT-TEST")
  writeAscii(payload, 52, "HW-TEST")
  writeAscii(payload, 61, "UVL15W-TEST-0001")
  return payload
}

function writeAscii(target: Uint8Array, offset: number, value: string) {
  target.set(encoder.encode(value), offset)
}

function splitFrame(frame: Uint8Array) {
  if (frame.byteLength < 10) {
    return [frame]
  }

  return [
    frame.slice(0, 1),
    frame.slice(1, 4),
    frame.slice(4, 9),
    frame.slice(9),
  ]
}

function hex(value: string) {
  return value.split(" ").map((byte) => Number.parseInt(byte, 16))
}
