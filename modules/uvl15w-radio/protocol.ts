const REQUEST_HEADER = Uint8Array.of(0xfe, 0xfe, 0xee, 0xef)
const RESPONSE_HEADER = Uint8Array.of(0xfe, 0xfe, 0xef, 0xee)
const FRAME_TAIL = 0xfd
const ESCAPE = 0xff

interface ProtocolFrame {
  readonly command: number
  readonly payload: Uint8Array
}

type FrameDecodeEvent =
  | { readonly type: "frame"; readonly frame: ProtocolFrame }
  | { readonly type: "error"; readonly error: ProtocolFrameError }

class ProtocolFrameError extends Error {
  readonly code: "checksum" | "escape" | "length"

  constructor(code: ProtocolFrameError["code"], message: string) {
    super(message)
    this.name = "ProtocolFrameError"
    this.code = code
  }
}

function calculateLrc(payload: Uint8Array) {
  let sum = 0

  for (const byte of payload) {
    sum = (sum + byte) & 0xff
  }

  return -sum & 0xff
}

function escapeByte(byte: number) {
  const shifted = (byte + 0x80) & 0xff

  return shifted > 0xf9
    ? Uint8Array.of(ESCAPE, shifted & 0x0f)
    : Uint8Array.of(shifted)
}

function escapeBytes(bytes: Uint8Array) {
  const output: number[] = []

  for (const byte of bytes) {
    output.push(...escapeByte(byte))
  }

  return Uint8Array.from(output)
}

function unescapeBytes(bytes: Uint8Array) {
  const output: number[] = []

  for (let index = 0; index < bytes.byteLength; index += 1) {
    const byte = bytes[index]

    if (byte !== ESCAPE) {
      output.push((byte + 0x80) & 0xff)
      continue
    }

    const lowNibble = bytes[index + 1]

    if (lowNibble === undefined || lowNibble > 0x0f) {
      throw new ProtocolFrameError("escape", "Invalid escaped byte sequence")
    }

    output.push((0xf0 + lowNibble + 0x80) & 0xff)
    index += 1
  }

  return Uint8Array.from(output)
}

function encodeFrame(header: Uint8Array, command: number, payload: Uint8Array) {
  const encodedPayload = escapeBytes(payload)
  const encodedLrc = escapeByte(calculateLrc(payload))
  const frame = new Uint8Array(
    header.byteLength +
      1 +
      encodedPayload.byteLength +
      encodedLrc.byteLength +
      1
  )

  let offset = 0
  frame.set(header, offset)
  offset += header.byteLength
  frame[offset] = command
  offset += 1
  frame.set(encodedPayload, offset)
  offset += encodedPayload.byteLength
  frame.set(encodedLrc, offset)
  frame[frame.byteLength - 1] = FRAME_TAIL

  return frame
}

function encodeRequestFrame(
  command: number,
  payload: Uint8Array = new Uint8Array()
) {
  return encodeFrame(REQUEST_HEADER, command, payload)
}

/** Test-support helper for building radio responses. */
function encodeResponseFrame(
  command: number,
  payload: Uint8Array = new Uint8Array()
) {
  return encodeFrame(RESPONSE_HEADER, command, payload)
}

class ResponseFrameDecoder {
  #buffer: number[] = []

  pendingBytes() {
    return Uint8Array.from(this.#buffer)
  }

  push(chunk: Uint8Array): FrameDecodeEvent[] {
    this.#buffer.push(...chunk)
    const events: FrameDecodeEvent[] = []

    while (true) {
      const headerIndex = findResponseHeader(this.#buffer)

      if (headerIndex === -1) {
        this.#buffer = this.#buffer.slice(-3)
        break
      }

      if (headerIndex > 0) {
        this.#buffer.splice(0, headerIndex)
      }

      const tailIndex = this.#buffer.indexOf(
        FRAME_TAIL,
        RESPONSE_HEADER.byteLength + 1
      )

      if (tailIndex === -1) {
        if (this.#buffer.length > 0x40000) {
          events.push({
            type: "error",
            error: new ProtocolFrameError(
              "length",
              "Response frame exceeded the safety limit"
            ),
          })
          this.#buffer = []
        }
        break
      }

      const frameBytes = this.#buffer.splice(0, tailIndex + 1)
      const command = frameBytes[RESPONSE_HEADER.byteLength]
      const encodedBody = Uint8Array.from(
        frameBytes.slice(RESPONSE_HEADER.byteLength + 1, -1)
      )

      try {
        const decodedBody = unescapeBytes(encodedBody)

        if (decodedBody.byteLength < 1) {
          throw new ProtocolFrameError(
            "length",
            "Response frame has no checksum"
          )
        }

        let sum = 0
        for (const byte of decodedBody) {
          sum = (sum + byte) & 0xff
        }

        if (sum !== 0) {
          throw new ProtocolFrameError(
            "checksum",
            "Response frame failed LRC validation"
          )
        }

        events.push({
          type: "frame",
          frame: {
            command,
            payload: decodedBody.slice(0, -1),
          },
        })
      } catch (error) {
        events.push({
          type: "error",
          error:
            error instanceof ProtocolFrameError
              ? error
              : new ProtocolFrameError(
                  "length",
                  "Response frame could not be decoded"
                ),
        })
      }
    }

    return events
  }
}

function findResponseHeader(buffer: number[]) {
  for (
    let index = 0;
    index <= buffer.length - RESPONSE_HEADER.byteLength;
    index += 1
  ) {
    if (
      buffer[index] === RESPONSE_HEADER[0] &&
      buffer[index + 1] === RESPONSE_HEADER[1] &&
      buffer[index + 2] === RESPONSE_HEADER[2] &&
      buffer[index + 3] === RESPONSE_HEADER[3]
    ) {
      return index
    }
  }

  return -1
}

export {
  ProtocolFrameError,
  ResponseFrameDecoder,
  calculateLrc,
  encodeRequestFrame,
  encodeResponseFrame,
  escapeBytes,
  unescapeBytes,
}
export type { FrameDecodeEvent, ProtocolFrame }
