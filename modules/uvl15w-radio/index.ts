import {
  CODEPLUG_SIZE,
  type Codeplug,
  createCodeplug,
} from "../codeplug/index.ts"
import {
  ResponseFrameDecoder,
  encodeRequestFrame,
  type FrameDecodeEvent,
  type ProtocolFrame,
} from "./protocol.ts"
import type { RadioConnection, RadioTransport } from "./transport.ts"

const CODEPLUG_START_ADDRESS = 0x8000
const CODEPLUG_END_ADDRESS = 0x21000
const DEFAULT_READ_BLOCK_SIZE = 128
const DEFAULT_RESPONSE_TIMEOUT_MS = 5_000
const DEFAULT_CHECKSUM_RETRIES = 2

const COMMAND = {
  deviceInformationRequest: 0xe0,
  deviceInformationResponse: 0xe1,
  beginRead: 0xe2,
  readDataResponse: 0xe4,
  completeSession: 0xe5,
  readDataRequest: 0xe6,
  error: 0xee,
} as const

const MODEL_PAYLOAD = new TextEncoder().encode("UVL-15W")
const READ_START_OK = "READ START OK"
const READ_COMPLETE = new TextEncoder().encode("Read Complete")
const REBOOT = "Reboot"

type Uvl15wRadioErrorCode =
  | "already-connected"
  | "not-connected"
  | "operation-in-progress"
  | "connection-closed"
  | "response-timeout"
  | "protocol"
  | "incompatible-radio"
  | "read-password-required"
  | "unexpected-response"

class Uvl15wRadioError extends Error {
  readonly code: Uvl15wRadioErrorCode

  constructor(
    code: Uvl15wRadioErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "Uvl15wRadioError"
    this.code = code
  }
}

interface SourceRadio {
  readonly model: "UVL-15W"
  readonly subModel: number
  readonly firmwareVersion: string
  readonly imageResourceVersion: string
  readonly cpuId: string
  readonly bootloaderModel: string
  readonly hardwareVersion: string
  readonly serialNumber: string
  readonly readProtected: boolean
  readonly writeProtected: boolean
}

interface RadioReadProgress {
  readonly bytesRead: number
  readonly totalBytes: number
  readonly percent: number
}

interface RadioReadOptions {
  readonly onProgress?: (progress: RadioReadProgress) => void
}

interface Uvl15wRadioOptions {
  readonly readBlockSize?: number
  readonly responseTimeoutMs?: number
  readonly checksumRetries?: number
}

interface Uvl15wRadio {
  connect(): Promise<SourceRadio>
  read(options?: RadioReadOptions): Promise<Codeplug>
  disconnect(): Promise<void>
}

class FrameInbox {
  #events: FrameDecodeEvent[] = []
  #waiter:
    | {
        resolve(event: FrameDecodeEvent): void
        reject(error: Error): void
      }
    | undefined
  #fatalError: Error | undefined

  push(event: FrameDecodeEvent) {
    if (this.#waiter) {
      const waiter = this.#waiter
      this.#waiter = undefined
      waiter.resolve(event)
      return
    }

    this.#events.push(event)
  }

  fail(error: Error) {
    this.#fatalError = error

    if (this.#waiter) {
      const waiter = this.#waiter
      this.#waiter = undefined
      waiter.reject(error)
    }
  }

  next(timeoutMs: number) {
    const event = this.#events.shift()
    if (event) {
      return Promise.resolve(event)
    }

    if (this.#fatalError) {
      return Promise.reject(this.#fatalError)
    }

    return new Promise<FrameDecodeEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#waiter = undefined
        reject(
          new Uvl15wRadioError(
            "response-timeout",
            `The Radio did not respond within ${timeoutMs} ms`
          )
        )
      }, timeoutMs)

      this.#waiter = {
        resolve: (nextEvent) => {
          clearTimeout(timeout)
          resolve(nextEvent)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      }
    })
  }
}

class Uvl15wRadioImplementation implements Uvl15wRadio {
  readonly #transport: RadioTransport
  readonly #readBlockSize: number
  readonly #responseTimeoutMs: number
  readonly #checksumRetries: number
  readonly #decoder = new ResponseFrameDecoder()
  readonly #inbox = new FrameInbox()

  #connection: RadioConnection | undefined
  #sourceRadio: SourceRadio | undefined
  #operationInProgress = false

  constructor(transport: RadioTransport, options: Uvl15wRadioOptions) {
    this.#transport = transport
    this.#readBlockSize = options.readBlockSize ?? DEFAULT_READ_BLOCK_SIZE
    this.#responseTimeoutMs =
      options.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS
    this.#checksumRetries = options.checksumRetries ?? DEFAULT_CHECKSUM_RETRIES

    if (
      !Number.isInteger(this.#readBlockSize) ||
      this.#readBlockSize < 1 ||
      this.#readBlockSize > 0xffff
    ) {
      throw new RangeError(
        "readBlockSize must be an integer between 1 and 65535"
      )
    }
  }

  async connect() {
    if (this.#connection) {
      throw new Uvl15wRadioError(
        "already-connected",
        "A Radio is already connected"
      )
    }

    const connection = await this.#transport.open()
    this.#connection = connection
    void this.#receiveContinuously(connection)

    try {
      const response = await this.#exchange(
        COMMAND.deviceInformationRequest,
        MODEL_PAYLOAD
      )

      if (response.command !== COMMAND.deviceInformationResponse) {
        throw new Uvl15wRadioError(
          "unexpected-response",
          `Expected device information command 0xE1; received 0x${response.command.toString(16)}`
        )
      }

      this.#sourceRadio = parseSourceRadio(response.payload)
      return this.#sourceRadio
    } catch (error) {
      await this.disconnect()
      throw error
    }
  }

  async read(options: RadioReadOptions = {}) {
    const connection = this.#requireConnection()
    const sourceRadio = this.#sourceRadio

    if (!sourceRadio) {
      throw new Uvl15wRadioError(
        "not-connected",
        "Device information must be read before starting a Radio Read"
      )
    }

    if (sourceRadio.readProtected) {
      throw new Uvl15wRadioError(
        "read-password-required",
        "This Radio requires a read password, which is not supported yet"
      )
    }

    if (this.#operationInProgress) {
      throw new Uvl15wRadioError(
        "operation-in-progress",
        "Another Radio operation is already in progress"
      )
    }

    this.#operationInProgress = true

    try {
      const beginResponse = await this.#exchange(
        COMMAND.beginRead,
        encodeAddressRange(CODEPLUG_START_ADDRESS, CODEPLUG_END_ADDRESS)
      )
      expectAsciiPayload(beginResponse, READ_START_OK)

      const bytes = new Uint8Array(CODEPLUG_SIZE)
      let bytesRead = 0

      while (bytesRead < CODEPLUG_SIZE) {
        const length = Math.min(this.#readBlockSize, CODEPLUG_SIZE - bytesRead)
        const address = CODEPLUG_START_ADDRESS + bytesRead
        const response = await this.#exchange(
          COMMAND.readDataRequest,
          encodeReadRequest(address, length)
        )
        const block = parseReadBlock(response, address, length)

        bytes.set(block, bytesRead)
        bytesRead += block.byteLength
        options.onProgress?.({
          bytesRead,
          totalBytes: CODEPLUG_SIZE,
          percent: (bytesRead / CODEPLUG_SIZE) * 100,
        })
      }

      const completeResponse = await this.#exchange(
        COMMAND.completeSession,
        READ_COMPLETE
      )
      expectAsciiPayload(completeResponse, REBOOT)

      const codeplug = createCodeplug(bytes)
      this.#connection = undefined
      this.#sourceRadio = undefined
      await connection.close().catch(() => undefined)

      return codeplug
    } finally {
      this.#operationInProgress = false
    }
  }

  async disconnect() {
    const connection = this.#connection
    this.#connection = undefined
    this.#sourceRadio = undefined

    if (connection) {
      await connection.close()
    }
  }

  #requireConnection() {
    if (!this.#connection) {
      throw new Uvl15wRadioError("not-connected", "No Radio is connected")
    }

    return this.#connection
  }

  async #exchange(command: number, payload: Uint8Array) {
    const connection = this.#requireConnection()
    const request = encodeRequestFrame(command, payload)

    for (let attempt = 0; attempt <= this.#checksumRetries; attempt += 1) {
      await connection.write(request)
      const event = await this.#inbox.next(this.#responseTimeoutMs)

      if (event.type === "error") {
        if (
          event.error.code === "checksum" &&
          attempt < this.#checksumRetries
        ) {
          continue
        }

        throw new Uvl15wRadioError("protocol", event.error.message, {
          cause: event.error,
        })
      }

      if (event.frame.command === COMMAND.error) {
        const message = decodeAsciiResponse(event.frame.payload)

        if (message === "Frame Lrc Error" && attempt < this.#checksumRetries) {
          continue
        }

        throw new Uvl15wRadioError("protocol", `Radio error: ${message}`)
      }

      return event.frame
    }

    throw new Uvl15wRadioError("protocol", "Checksum retries were exhausted")
  }

  async #receiveContinuously(connection: RadioConnection) {
    try {
      while (this.#connection === connection) {
        const chunk = await connection.read()

        if (chunk === null) {
          if (this.#connection === connection) {
            this.#inbox.fail(
              new Uvl15wRadioError(
                "connection-closed",
                "The Radio connection closed"
              )
            )
          }
          return
        }

        for (const event of this.#decoder.push(chunk)) {
          this.#inbox.push(event)
        }
      }
    } catch (error) {
      this.#inbox.fail(
        error instanceof Error
          ? error
          : new Uvl15wRadioError(
              "connection-closed",
              "The Radio connection failed"
            )
      )
    }
  }
}

function createUvl15wRadio(
  transport: RadioTransport,
  options: Uvl15wRadioOptions = {}
) {
  return new Uvl15wRadioImplementation(transport, options)
}

function parseSourceRadio(payload: Uint8Array): SourceRadio {
  if (payload.byteLength < 81) {
    throw new Uvl15wRadioError(
      "protocol",
      `Device information must contain 81 bytes; received ${payload.byteLength}`
    )
  }

  const model = decodeAscii(payload.slice(0, 7))
  if (model !== "UVL-15W") {
    throw new Uvl15wRadioError(
      "incompatible-radio",
      `Expected a UVL-15W Radio; received ${model || "an unknown model"}`
    )
  }

  return Object.freeze({
    model,
    subModel: payload[8],
    readProtected: payload[10] === 1,
    writeProtected: payload[11] === 1,
    firmwareVersion: decodeField(payload.slice(12, 20)),
    imageResourceVersion: [...payload.slice(21, 24)].join("."),
    cpuId: toHex(payload.slice(24, 36)),
    bootloaderModel: decodeField(payload.slice(36, 52)),
    hardwareVersion: decodeField(payload.slice(52, 61)),
    serialNumber: decodeField(payload.slice(61, 81)),
  })
}

function parseReadBlock(
  frame: ProtocolFrame,
  expectedAddress: number,
  expectedLength: number
) {
  if (frame.command !== COMMAND.readDataResponse) {
    throw new Uvl15wRadioError(
      "unexpected-response",
      `Expected read-data command 0xE4; received 0x${frame.command.toString(16)}`
    )
  }

  if (frame.payload.byteLength !== expectedLength + 6) {
    throw new Uvl15wRadioError(
      "protocol",
      `Read response length mismatch: expected ${expectedLength + 6}, received ${frame.payload.byteLength}`
    )
  }

  const view = new DataView(
    frame.payload.buffer,
    frame.payload.byteOffset,
    frame.payload.byteLength
  )
  const address = view.getUint32(0, false)
  const length = view.getUint16(4, false)

  if (address !== expectedAddress || length !== expectedLength) {
    throw new Uvl15wRadioError(
      "protocol",
      `Read response echoed address/length ${address}/${length}; expected ${expectedAddress}/${expectedLength}`
    )
  }

  return frame.payload.slice(6)
}

function encodeAddressRange(startAddress: number, endAddress: number) {
  const payload = new Uint8Array(8)
  const view = new DataView(payload.buffer)
  view.setUint32(0, startAddress, false)
  view.setUint32(4, endAddress, false)
  return payload
}

function encodeReadRequest(address: number, length: number) {
  const payload = new Uint8Array(6)
  const view = new DataView(payload.buffer)
  view.setUint32(0, address, false)
  view.setUint16(4, length, false)
  return payload
}

function expectAsciiPayload(frame: ProtocolFrame, expected: string) {
  const actual = decodeAsciiResponse(frame.payload)
  if (actual !== expected) {
    throw new Uvl15wRadioError(
      "unexpected-response",
      `Expected Radio response ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`
    )
  }
}

function decodeAscii(bytes: Uint8Array) {
  return new TextDecoder("ascii").decode(bytes)
}

function decodeAsciiResponse(bytes: Uint8Array) {
  let end = bytes.byteLength

  while (end > 0 && bytes[end - 1] === 0) {
    end -= 1
  }

  return decodeAscii(bytes.slice(0, end))
}

function decodeField(bytes: Uint8Array) {
  let end = bytes.byteLength

  while (
    end > 0 &&
    (bytes[end - 1] === 0 || bytes[end - 1] === 0xff || bytes[end - 1] === 0x20)
  ) {
    end -= 1
  }

  return decodeAscii(bytes.slice(0, end))
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export {
  CODEPLUG_END_ADDRESS,
  CODEPLUG_START_ADDRESS,
  Uvl15wRadioError,
  createUvl15wRadio,
}
export type {
  RadioReadOptions,
  RadioReadProgress,
  SourceRadio,
  Uvl15wRadio,
  Uvl15wRadioErrorCode,
  Uvl15wRadioOptions,
}
export type { RadioConnection, RadioTransport } from "./transport.ts"
