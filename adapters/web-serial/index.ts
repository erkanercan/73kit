import type {
  RadioConnection,
  RadioTransport,
} from "../../modules/uvl15w-radio/transport.ts"

const POC_VERIFIED_BAUD_RATE = 115_200

type WebSerialTransportErrorCode =
  "connection-closed" | "unavailable" | "streams-unavailable"

class WebSerialTransportError extends Error {
  readonly code: WebSerialTransportErrorCode

  constructor(code: WebSerialTransportErrorCode, message: string) {
    super(message)
    this.name = "WebSerialTransportError"
    this.code = code
  }
}

interface SerialPortFilter {
  readonly usbVendorId?: number
  readonly usbProductId?: number
  readonly bluetoothServiceClassId?: string
}

interface SerialOpenOptions {
  readonly baudRate: number
  readonly dataBits?: 7 | 8
  readonly stopBits?: 1 | 2
  readonly parity?: "none" | "even" | "odd"
  readonly bufferSize?: number
  readonly flowControl?: "none" | "hardware"
}

interface BrowserSerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: SerialOpenOptions): Promise<void>
  close(): Promise<void>
}

interface BrowserSerial {
  requestPort(options?: {
    readonly filters?: readonly SerialPortFilter[]
  }): Promise<BrowserSerialPort>
}

interface NavigatorWithSerial extends Navigator {
  readonly serial?: BrowserSerial
}

interface WebSerialTransportOptions extends SerialOpenOptions {
  readonly filters?: readonly SerialPortFilter[]
}

class WebSerialConnection implements RadioConnection {
  readonly #port: BrowserSerialPort
  readonly #reader: ReadableStreamDefaultReader<Uint8Array>
  readonly #writer: WritableStreamDefaultWriter<Uint8Array>
  #closed = false

  constructor(
    port: BrowserSerialPort,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    writer: WritableStreamDefaultWriter<Uint8Array>
  ) {
    this.#port = port
    this.#reader = reader
    this.#writer = writer
  }

  async read() {
    const result = await this.#reader.read()
    return result.done ? null : result.value
  }

  async write(bytes: Uint8Array) {
    if (this.#closed) {
      throw new WebSerialTransportError(
        "connection-closed",
        "The Web Serial connection is closed"
      )
    }

    await this.#writer.write(bytes)
  }

  async close() {
    if (this.#closed) {
      return
    }

    this.#closed = true

    try {
      await this.#reader.cancel()
    } finally {
      this.#reader.releaseLock()
      this.#writer.releaseLock()
      await this.#port.close()
    }
  }
}

class WebSerialTransport implements RadioTransport {
  readonly #options: WebSerialTransportOptions

  constructor(options: WebSerialTransportOptions) {
    if (!Number.isInteger(options.baudRate) || options.baudRate <= 0) {
      throw new RangeError("baudRate must be a positive integer")
    }

    this.#options = options
  }

  async open() {
    const serial = (navigator as NavigatorWithSerial).serial

    if (!serial) {
      throw new WebSerialTransportError(
        "unavailable",
        "Web Serial is not available in this browser"
      )
    }

    const port = await serial.requestPort({ filters: this.#options.filters })
    const openOptions: SerialOpenOptions = {
      baudRate: this.#options.baudRate,
      dataBits: this.#options.dataBits,
      stopBits: this.#options.stopBits,
      parity: this.#options.parity,
      bufferSize: this.#options.bufferSize,
      flowControl: this.#options.flowControl,
    }
    await port.open(openOptions)

    if (!port.readable || !port.writable) {
      await port.close()
      throw new WebSerialTransportError(
        "streams-unavailable",
        "The selected serial port did not expose readable and writable streams"
      )
    }

    return new WebSerialConnection(
      port,
      port.readable.getReader(),
      port.writable.getWriter()
    )
  }
}

function createWebSerialTransport(options: WebSerialTransportOptions) {
  return new WebSerialTransport(options)
}

export {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
}
export type {
  SerialPortFilter,
  WebSerialTransportErrorCode,
  WebSerialTransportOptions,
}
