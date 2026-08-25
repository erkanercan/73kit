import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import { createCpsWorkspace } from "../modules/cps-workspace/index.ts"
import { CODEPLUG_START_ADDRESS } from "../modules/uvl15w-radio/index.ts"
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

function deviceInformationPayload() {
  const payload = new Uint8Array(81)
  writeAscii(payload, 0, "UVL-15W")
  payload[7] = 0x5f
  payload[8] = 0x01
  payload[9] = 0x5f
  payload[10] = 0
  payload[11] = 0
  writeAscii(payload, 12, "FW1.0")
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
