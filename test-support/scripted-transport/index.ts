import type {
  RadioConnection,
  RadioTransport,
} from "../../modules/uvl15w-radio/transport.ts"

interface ScriptStep {
  readonly expectedWrite: Uint8Array
  readonly responseChunks?: readonly Uint8Array[]
  readonly closeAfterWrite?: boolean
}

class ScriptedTransport implements RadioTransport, RadioConnection {
  readonly #steps: ScriptStep[]
  readonly #queuedChunks: Uint8Array[] = []
  readonly #readWaiters: Array<(chunk: Uint8Array | null) => void> = []
  #stepIndex = 0
  #opened = false
  #closed = false

  constructor(steps: readonly ScriptStep[]) {
    this.#steps = [...steps]
  }

  async open() {
    if (this.#opened && !this.#closed) {
      throw new Error("The scripted Transport is already open")
    }

    this.#opened = true
    this.#closed = false
    return this
  }

  async read() {
    const chunk = this.#queuedChunks.shift()
    if (chunk) {
      return chunk.slice()
    }

    if (this.#closed) {
      return null
    }

    return new Promise<Uint8Array | null>((resolve) => {
      this.#readWaiters.push(resolve)
    })
  }

  async write(bytes: Uint8Array) {
    const step = this.#steps[this.#stepIndex]

    if (!step) {
      throw new Error(
        `Unexpected write after ${this.#stepIndex} completed script steps`
      )
    }

    if (!equalBytes(bytes, step.expectedWrite)) {
      throw new Error(
        `Write ${this.#stepIndex + 1} did not match the scripted request\nExpected: ${toHex(step.expectedWrite)}\nReceived: ${toHex(bytes)}`
      )
    }

    this.#stepIndex += 1

    for (const chunk of step.responseChunks ?? []) {
      const waiter = this.#readWaiters.shift()
      if (waiter) {
        waiter(chunk.slice())
      } else {
        this.#queuedChunks.push(chunk.slice())
      }
    }

    if (step.closeAfterWrite) {
      await this.close()
    }
  }

  async close() {
    this.#closed = true

    for (const waiter of this.#readWaiters.splice(0)) {
      waiter(null)
    }
  }

  assertComplete() {
    if (this.#stepIndex !== this.#steps.length) {
      throw new Error(
        `Script stopped after ${this.#stepIndex} of ${this.#steps.length} expected writes`
      )
    }
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  return (
    left.byteLength === right.byteLength &&
    left.every((byte, index) => byte === right[index])
  )
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(" ")
}

export { ScriptedTransport }
export type { ScriptStep }
