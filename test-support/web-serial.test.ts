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

test("reuses the selected Web Serial port for later operations", async () => {
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

    assert.equal(requestCount, 1)
    assert.equal(ports[0].openCount, 2)
    assert.equal(ports[0].closeCount, 2)
    assert.equal(ports[1].openCount, 0)
    assert.equal(ports[1].closeCount, 0)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("replaces a stale selected port with the sole permitted port after a Radio reboot", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  let stale = false
  let staleOpenCount = 0
  let requestCount = 0
  const stalePort = {
    readable: new ReadableStream<Uint8Array>(),
    writable: new WritableStream<Uint8Array>(),
    async open() {
      staleOpenCount += 1
      if (stale) {
        throw new DOMException(
          "The port disconnected during reboot",
          "NetworkError"
        )
      }
    },
    async close() {
      stale = true
    },
  }
  const replacementPort = createPort()

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serial: {
        getPorts: async () => [replacementPort],
        requestPort: async () => {
          requestCount += 1
          return stalePort
        },
      },
    },
  })

  try {
    const transport = createWebSerialTransport({ baudRate: 115_200 })

    const first = await transport.open()
    await first.close()
    const second = await transport.open()
    await second.close()

    assert.equal(requestCount, 1)
    assert.equal(staleOpenCount, 2)
    assert.equal(replacementPort.openCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("opens a previously permitted Web Serial port without prompting", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const port = createPort()
  let requestCount = 0

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serial: {
        getPorts: async () => [port],
        requestPort: async () => {
          requestCount += 1
          return port
        },
      },
    },
  })

  try {
    const transport = createWebSerialTransport({
      baudRate: 115_200,
      preferPreviouslyGrantedPort: true,
    })
    const connection = await transport.open()
    await connection.close()

    assert.equal(requestCount, 0)
    assert.equal(port.openCount, 1)
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator)
    } else {
      Reflect.deleteProperty(globalThis, "navigator")
    }
  }
})

test("requires an explicit port request when no permitted port can be reused", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const port = createPort()
  let requestCount = 0

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serial: {
        getPorts: async () => [],
        requestPort: async () => {
          requestCount += 1
          return port
        },
      },
    },
  })

  try {
    const transport = createWebSerialTransport({
      baudRate: 115_200,
      preferPreviouslyGrantedPort: true,
    })

    await assert.rejects(transport.open(), { code: "port-selection-required" })
    assert.equal(requestCount, 0)

    await transport.requestPort()
    const connection = await transport.open()
    await connection.close()
    assert.equal(requestCount, 1)
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
