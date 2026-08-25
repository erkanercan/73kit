import assert from "node:assert/strict"
import test from "node:test"

import {
  createWebSerialTransport,
  detectRadioCapability,
} from "../adapters/web-serial/index.ts"

test("detects secure-context Web Serial capability without user-agent checks", () => {
  assert.equal(
    detectRadioCapability(true, { requestPort: async () => undefined }),
    "available"
  )
  assert.equal(
    detectRadioCapability(false, { requestPort: async () => undefined }),
    "insecure-context"
  )
  assert.equal(detectRadioCapability(true, undefined), "unsupported")
  assert.equal(detectRadioCapability(true, {}), "unsupported")
})

test("requests and closes a freshly selected Web Serial port for every operation", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const ports = [createPort(), createPort()]
  let requestCount = 0

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serial: {
        requestPort: async () => ports[requestCount++],
      },
    },
  })

  try {
    const transport = createWebSerialTransport({ baudRate: 115_200 })

    const first = await transport.open()
    await first.close()
    await first.close()
    const second = await transport.open()
    await second.close()

    assert.equal(requestCount, 2)
    assert.equal(ports[0].openCount, 1)
    assert.equal(ports[0].closeCount, 1)
    assert.equal(ports[1].openCount, 1)
    assert.equal(ports[1].closeCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("closes a selected port when required Web Serial streams are unavailable", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  let closeCount = 0
  const port = {
    readable: null,
    writable: null,
    async open() {},
    async close() {
      closeCount += 1
    },
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serial: { requestPort: async () => port } },
  })

  try {
    const transport = createWebSerialTransport({ baudRate: 115_200 })

    await assert.rejects(transport.open(), { code: "streams-unavailable" })
    assert.equal(closeCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("closes a selected port after an open failure", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const openError = new Error("open failed")
  let closeCount = 0
  const port = {
    readable: null,
    writable: null,
    async open() {
      throw openError
    },
    async close() {
      closeCount += 1
    },
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serial: { requestPort: async () => port } },
  })

  try {
    const transport = createWebSerialTransport({ baudRate: 115_200 })

    await assert.rejects(transport.open(), openError)
    assert.equal(closeCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("releases the port when reader cancellation fails", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const cancelError = new Error("cancel failed")
  let closeCount = 0
  const port = {
    readable: new ReadableStream<Uint8Array>({
      cancel() {
        throw cancelError
      },
    }),
    writable: new WritableStream<Uint8Array>(),
    async open() {},
    async close() {
      closeCount += 1
    },
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serial: { requestPort: async () => port } },
  })

  try {
    const transport = createWebSerialTransport({ baudRate: 115_200 })
    const connection = await transport.open()

    await assert.rejects(connection.close(), cancelError)
    await connection.close()
    assert.equal(closeCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

function createPort() {
  let openCount = 0
  let closeCount = 0

  return {
    readable: new ReadableStream<Uint8Array>(),
    writable: new WritableStream<Uint8Array>(),
    get openCount() {
      return openCount
    },
    get closeCount() {
      return closeCount
    },
    async open() {
      openCount += 1
    },
    async close() {
      closeCount += 1
    },
  }
}
