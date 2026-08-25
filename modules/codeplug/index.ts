import { decodeChannels } from "./channel-codec.ts"
import type { Channel } from "./channel.ts"

const CODEPLUG_SIZE = 0x19000

class Codeplug {
  readonly #bytes: Uint8Array
  readonly #channels: readonly Channel[]

  constructor(bytes: Uint8Array) {
    if (bytes.byteLength !== CODEPLUG_SIZE) {
      throw new RangeError(
        `A Codeplug must contain exactly ${CODEPLUG_SIZE} bytes; received ${bytes.byteLength}`
      )
    }

    this.#bytes = bytes.slice()
    this.#channels = decodeChannels(this.#bytes)
  }

  get byteLength() {
    return this.#bytes.byteLength
  }

  toBytes() {
    return this.#bytes.slice()
  }

  getChannels() {
    return this.#channels
  }

  equals(other: Codeplug) {
    const otherBytes = other.#bytes

    return this.#bytes.every((byte, index) => byte === otherBytes[index])
  }
}

function createCodeplug(bytes: Uint8Array) {
  return new Codeplug(bytes)
}

export { CODEPLUG_SIZE, Codeplug, createCodeplug }
export type { Channel } from "./channel.ts"
