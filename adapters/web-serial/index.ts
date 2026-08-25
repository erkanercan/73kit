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

    let firstError: unknown

    try {
      await this.#reader.cancel()
    } catch (error) {
      firstError = error
    }

    try {
      this.#reader.releaseLock()
    } catch (error) {
      firstError ??= error
    }

    try {
      this.#writer.releaseLock()
    } catch (error) {
      firstError ??= error
    }

    try {
      await this.#port.close()
    } catch (error) {
      firstError ??= error
    }

    if (firstError) {
      throw firstError
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
    try {
      await port.open(openOptions)
    } catch (error) {
      await port.close().catch(() => undefined)
      throw error
    }

    if (!port.readable || !port.writable) {
      const error = new WebSerialTransportError(
        "streams-unavailable",
        "The selected serial port did not expose readable and writable streams"
      )
      await port.close().catch(() => undefined)
      throw error
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    let writer: WritableStreamDefaultWriter<Uint8Array> | undefined
    try {
      reader = port.readable.getReader()
      writer = port.writable.getWriter()
    } catch (error) {
      try {
        reader?.releaseLock()
      } catch {}
      try {
        writer?.releaseLock()
      } catch {}
      await port.close().catch(() => undefined)
      throw error
    }

    return new WebSerialConnection(port, reader, writer)
  }
}

type RadioCapability = "available" | "insecure-context" | "unsupported"

function detectRadioCapability(
  secureContext: boolean,
  serial: unknown
): RadioCapability {
  if (!secureContext) {
    return "insecure-context"
  }

  return typeof serial === "object" &&
    serial !== null &&
    "requestPort" in serial &&
    typeof serial.requestPort === "function"
    ? "available"
    : "unsupported"
}

function createWebSerialTransport(options: WebSerialTransportOptions) {
  return new WebSerialTransport(options)
}

export {
  POC_VERIFIED_BAUD_RATE,
  WebSerialTransportError,
  createWebSerialTransport,
  detectRadioCapability,
}
export type {
  SerialPortFilter,
  RadioCapability,
  WebSerialTransportErrorCode,
  WebSerialTransportOptions,
}
