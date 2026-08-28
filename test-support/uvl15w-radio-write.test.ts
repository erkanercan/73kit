import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_SIZE,
  createCodeplug,
  type CodeplugWriteImage,
} from "../modules/codeplug/index.ts"
import {
  CODEPLUG_START_ADDRESS,
  RadioWriteError,
  createUvl15wRadio,
} from "../modules/uvl15w-radio/index.ts"
import {
  encodeRequestFrame,
  encodeResponseFrame,
} from "../modules/uvl15w-radio/protocol.ts"
import {
  ScriptedTransport,
  type ScriptStep,
} from "./scripted-transport/index.ts"

const encoder = new TextEncoder()

test("writes the complete firmware 3.07.23 image in 200 acknowledged blocks", async () => {
  const image = await createWriteImage()
  const steps = successfulWriteSteps(image)
  const transport = new ScriptedTransport(steps)
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })
  const progress: number[] = []

  await radio.connect()
  const result = await radio.write(image, {
    onProgress: ({ bytesWritten }) => progress.push(bytesWritten),
  })

  assert.deepEqual(result, {
    bytesWritten: CODEPLUG_SIZE,
    totalBytes: CODEPLUG_SIZE,
  })
  assert.equal(progress.length, 200)
  assert.equal(progress.at(-1), CODEPLUG_SIZE)
  await assert.rejects(radio.read(), { code: "not-connected" })
  transport.assertComplete()
})

test("rejects write-protected Radios before starting a write session", async () => {
  const image = await createWriteImage()
  const transport = new ScriptedTransport([
    handshakeStep({ writeProtected: true }),
  ])
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await radio.connect()
  await assert.rejects(radio.write(image), {
    code: "write-password-required",
  })
  await radio.disconnect()
  transport.assertComplete()
})

test("strictly rejects E3 failures before the destructive boundary", async (context) => {
  const image = await createWriteImage()
  const cases = [
    {
      name: "wrong command",
      frame: encodeResponseFrame(0xe2, encoder.encode("WRITE START OK")),
    },
    {
      name: "wrong payload",
      frame: encodeResponseFrame(0xe3, encoder.encode("WRITE START NO")),
    },
  ]

  for (const testCase of cases) {
    await context.test(testCase.name, async () => {
      const transport = new ScriptedTransport([
        handshakeStep(),
        {
          expectedWrite: encodeRequestFrame(0xe3, addressRangePayload()),
          responseChunks: [testCase.frame],
        },
      ])
      const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

      await radio.connect()
      await assert.rejects(radio.write(image), (error) => {
        assert.ok(error instanceof RadioWriteError)
        assert.equal(error.disposition, "ordinary-failure")
        assert.equal(error.bytesAcknowledged, 0)
        return true
      })
      transport.assertComplete()
    })
  }
})

test("strictly rejects malformed E6 write acknowledgements without sending the next block", async (context) => {
  const image = await createWriteImage()
  const firstAddress = CODEPLUG_START_ADDRESS
  const cases = [
    {
      name: "wrong command",
      frame: encodeResponseFrame(
        0xe5,
        writeAcknowledgementPayload(firstAddress, 512)
      ),
    },
    {
      name: "wrong marker",
      frame: encodeResponseFrame(
        0xe6,
        Uint8Array.of(
          ...encoder.encode("NO OK"),
          ...writeAcknowledgementPayload(firstAddress, 512).slice(5)
        )
      ),
    },
    {
      name: "wrong address",
      frame: encodeResponseFrame(
        0xe6,
        writeAcknowledgementPayload(firstAddress + 512, 512)
      ),
    },
    {
      name: "wrong length",
      frame: encodeResponseFrame(
        0xe6,
        writeAcknowledgementPayload(firstAddress, 511)
      ),
    },
    {
      name: "extra payload byte",
      frame: encodeResponseFrame(
        0xe6,
        Uint8Array.of(...writeAcknowledgementPayload(firstAddress, 512), 0)
      ),
    },
  ]

  for (const testCase of cases) {
    await context.test(testCase.name, async () => {
      const progress: number[] = []
      const transport = new ScriptedTransport([
        handshakeStep(),
        beginWriteStep(),
        firstWriteStep(image, { responseChunks: [testCase.frame] }),
      ])
      const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

      await radio.connect()
      await assert.rejects(
        radio.write(image, {
          onProgress: ({ bytesWritten }) => progress.push(bytesWritten),
        }),
        (error) => {
          assert.ok(error instanceof RadioWriteError)
          assert.equal(error.disposition, "write-outcome-unknown")
          assert.equal(error.bytesAcknowledged, 0)
          return true
        }
      )
      assert.deepEqual(progress, [])
      transport.assertComplete()
    })
  }
})

test("retries the exact E4 block only after the Radio reports Frame Lrc Error", async () => {
  const image = await createWriteImage()
  const steps = successfulWriteSteps(image)
  const acceptedFirstBlock = steps[2]
  assert.ok(acceptedFirstBlock)
  steps.splice(
    2,
    1,
    firstWriteStep(image, {
      responseChunks: [
        encodeResponseFrame(0xee, encoder.encode("Frame Lrc Error")),
      ],
    }),
    acceptedFirstBlock
  )
  const transport = new ScriptedTransport(steps)
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await radio.connect()
  const result = await radio.write(image)

  assert.equal(result.bytesWritten, CODEPLUG_SIZE)
  transport.assertComplete()
})

test("bounds explicit Frame Lrc Error retries without advancing the block", async () => {
  const image = await createWriteImage()
  const lrcError = {
    responseChunks: [
      encodeResponseFrame(0xee, encoder.encode("Frame Lrc Error")),
    ],
  }
  const transport = new ScriptedTransport([
    handshakeStep(),
    beginWriteStep(),
    firstWriteStep(image, lrcError),
    firstWriteStep(image, lrcError),
    firstWriteStep(image, lrcError),
  ])
  const radio = createUvl15wRadio(transport, {
    checksumRetries: 2,
    responseTimeoutMs: 100,
  })

  await radio.connect()
  await assert.rejects(radio.write(image), (error) => {
    assert.ok(error instanceof RadioWriteError)
    assert.equal(error.disposition, "write-outcome-unknown")
    assert.equal(error.bytesAcknowledged, 0)
    return true
  })
  transport.assertComplete()
})

test("does not retry after a corrupt acknowledgement, timeout, or disconnect", async (context) => {
  const image = await createWriteImage()
  const validAcknowledgement = encodeResponseFrame(
    0xe6,
    writeAcknowledgementPayload(CODEPLUG_START_ADDRESS, 512)
  )
  const corruptAcknowledgement = validAcknowledgement.slice()
  corruptAcknowledgement[corruptAcknowledgement.byteLength - 2] ^= 0x01
  const cases: Array<{
    name: string
    responseTimeoutMs: number
    stepOptions: Pick<ScriptStep, "responseChunks" | "closeAfterWrite">
    expectedCode: string
  }> = [
    {
      name: "corrupt acknowledgement",
      responseTimeoutMs: 100,
      stepOptions: { responseChunks: [corruptAcknowledgement] },
      expectedCode: "protocol",
    },
    {
      name: "timeout",
      responseTimeoutMs: 5,
      stepOptions: { responseChunks: [] },
      expectedCode: "response-timeout",
    },
    {
      name: "disconnect",
      responseTimeoutMs: 100,
      stepOptions: { closeAfterWrite: true },
      expectedCode: "connection-closed",
    },
  ]

  for (const testCase of cases) {
    await context.test(testCase.name, async () => {
      const transport = new ScriptedTransport([
        handshakeStep(),
        beginWriteStep(),
        firstWriteStep(image, testCase.stepOptions),
      ])
      const radio = createUvl15wRadio(transport, {
        responseTimeoutMs: testCase.responseTimeoutMs,
      })

      await radio.connect()
      await assert.rejects(radio.write(image), (error) => {
        assert.ok(error instanceof RadioWriteError)
        assert.equal(error.code, testCase.expectedCode)
        assert.equal(error.disposition, "write-outcome-unknown")
        assert.equal(error.bytesAcknowledged, 0)
        return true
      })
      transport.assertComplete()
    })
  }
})

test("classifies a failed Write Complete response as outcome unknown", async () => {
  const image = await createWriteImage()
  const steps = successfulWriteSteps(image)
  steps[steps.length - 1] = {
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Write Complete")),
    responseChunks: [encodeResponseFrame(0xe5, encoder.encode("Not Reboot"))],
  }
  const transport = new ScriptedTransport(steps)
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await radio.connect()
  await assert.rejects(radio.write(image), (error) => {
    assert.ok(error instanceof RadioWriteError)
    assert.equal(error.disposition, "write-outcome-unknown")
    assert.equal(error.bytesAcknowledged, CODEPLUG_SIZE)
    return true
  })
  transport.assertComplete()
})

test("strictly validates the Write Complete response command", async () => {
  const image = await createWriteImage()
  const steps = successfulWriteSteps(image)
  steps[steps.length - 1] = {
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Write Complete")),
    responseChunks: [encodeResponseFrame(0xe3, encoder.encode("Reboot"))],
  }
  const transport = new ScriptedTransport(steps)
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await radio.connect()
  await assert.rejects(radio.write(image), (error) => {
    assert.ok(error instanceof RadioWriteError)
    assert.equal(error.disposition, "write-outcome-unknown")
    assert.equal(error.bytesAcknowledged, CODEPLUG_SIZE)
    return true
  })
  transport.assertComplete()
})

test("rejects a duplicated stale acknowledgement after the next block is sent", async () => {
  const image = await createWriteImage()
  const bytes = image.toBytes()
  const firstAddress = CODEPLUG_START_ADDRESS
  const secondAddress = firstAddress + 512
  const firstAcknowledgement = encodeResponseFrame(
    0xe6,
    writeAcknowledgementPayload(firstAddress, 512)
  )
  const transport = new ScriptedTransport([
    handshakeStep(),
    beginWriteStep(),
    firstWriteStep(image, {
      responseChunks: [firstAcknowledgement, firstAcknowledgement],
    }),
    {
      expectedWrite: encodeRequestFrame(
        0xe4,
        writeRequestPayload(secondAddress, bytes.slice(512, 1024))
      ),
    },
  ])
  const radio = createUvl15wRadio(transport, { responseTimeoutMs: 100 })

  await radio.connect()
  await assert.rejects(radio.write(image), (error) => {
    assert.ok(error instanceof RadioWriteError)
    assert.equal(error.disposition, "write-outcome-unknown")
    assert.equal(error.bytesAcknowledged, 512)
    return true
  })
  transport.assertComplete()
})

async function createWriteImage() {
  const codeplug = createCodeplug(
    Uint8Array.from(
      { length: CODEPLUG_SIZE },
      (_, index) => (index * 31 + 7) & 0xff
    )
  )
  return codeplug.materializeWriteImage("uvl15w-3.07.23")
}

function successfulWriteSteps(image: CodeplugWriteImage) {
  const bytes = image.toBytes()
  const steps: ScriptStep[] = [handshakeStep(), beginWriteStep()]

  for (
    let offset = 0;
    offset < CODEPLUG_LAYOUT_3_07_23.byteLength;
    offset += CODEPLUG_LAYOUT_3_07_23.writeBlockSize
  ) {
    const address = CODEPLUG_START_ADDRESS + offset
    const block = bytes.slice(
      offset,
      offset + CODEPLUG_LAYOUT_3_07_23.writeBlockSize
    )
    steps.push({
      expectedWrite: encodeRequestFrame(
        0xe4,
        writeRequestPayload(address, block)
      ),
      responseChunks: splitFrame(
        encodeResponseFrame(0xe6, writeAcknowledgementPayload(address, 512))
      ),
    })
  }

  steps.push({
    expectedWrite: encodeRequestFrame(0xe5, encoder.encode("Write Complete")),
    responseChunks: [encodeResponseFrame(0xe5, encoder.encode("Reboot"))],
  })

  return steps
}

function handshakeStep(options: { writeProtected?: boolean } = {}): ScriptStep {
  return {
    expectedWrite: encodeRequestFrame(0xe0, encoder.encode("UVL-15W")),
    responseChunks: [
      encodeResponseFrame(
        0xe1,
        deviceInformationPayload(options.writeProtected ?? false)
      ),
    ],
  }
}

function beginWriteStep(): ScriptStep {
  return {
    expectedWrite: encodeRequestFrame(0xe3, addressRangePayload()),
    responseChunks: [
      encodeResponseFrame(0xe3, encoder.encode("WRITE START OK")),
    ],
  }
}

function firstWriteStep(
  image: CodeplugWriteImage,
  options: Pick<ScriptStep, "responseChunks" | "closeAfterWrite">
): ScriptStep {
  const block = image.toBytes().slice(0, CODEPLUG_LAYOUT_3_07_23.writeBlockSize)
  return {
    expectedWrite: encodeRequestFrame(
      0xe4,
      writeRequestPayload(CODEPLUG_START_ADDRESS, block)
    ),
    ...options,
  }
}

function addressRangePayload() {
  const payload = new Uint8Array(8)
  const view = new DataView(payload.buffer)
  view.setUint32(0, CODEPLUG_LAYOUT_3_07_23.startAddress, false)
  view.setUint32(4, CODEPLUG_LAYOUT_3_07_23.endAddress, false)
  return payload
}

function writeRequestPayload(address: number, block: Uint8Array) {
  const payload = new Uint8Array(6 + block.byteLength)
  const view = new DataView(payload.buffer)
  view.setUint32(0, address, false)
  view.setUint16(4, block.byteLength, false)
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

function deviceInformationPayload(writeProtected = false) {
  const payload = new Uint8Array(81)
  writeAscii(payload, 0, "UVL-15W")
  payload[7] = 0x5f
  payload[8] = 0x01
  payload[9] = 0x5f
  payload[10] = 0
  payload[11] = writeProtected ? 1 : 0
  writeAscii(payload, 12, "V3.07.23")
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
  return [
    frame.slice(0, 1),
    frame.slice(1, 4),
    frame.slice(4, frame.byteLength - 2),
    frame.slice(frame.byteLength - 2),
  ]
}
