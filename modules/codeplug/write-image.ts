import {
  CHANNEL_RECORD_SIZE,
  TEMPORARY_CHANNEL_RECORDS_OFFSET,
  VFO_RECORDS_OFFSET,
  WEATHER_CHANNEL_RECORDS_OFFSET,
} from "./memory-map.ts"
import type { CodeplugLayoutId } from "./layout.ts"

const FIXED_WEATHER_CHANNELS_3_07_23 = fromHex(
  "09B050F009B050F057582D303100000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AE070009AE070057582D303200000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AF2BF809AF2BF857582D303300000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AE68A809AE68A857582D303400000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AECA5009AECA5057582D303500000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AF8DA009AF8DA057582D303600000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09AFEF4809AFEF4857582D303700000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09A2955009A2955057582D303800000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09A47D9809A47D9857582D303900000000000000000000000000000000000000000927C010200000000000FF00FFFEFF" +
    "09BB60F809BB60F857582D313000000000000000000000000000000000000000000927C010200000000000FF00FFFEFF"
)

type CodeplugWriteDerivedChange =
  "mirror-vfo-temporary-channels" | "restore-fixed-weather-channels"

class CodeplugWriteImage {
  readonly #bytes: Uint8Array
  readonly layoutId: CodeplugLayoutId
  readonly byteLength: number
  readonly sha256: string
  readonly derivedChanges: readonly CodeplugWriteDerivedChange[]

  constructor(
    bytes: Uint8Array,
    layoutId: CodeplugLayoutId,
    sha256: string,
    derivedChanges: readonly CodeplugWriteDerivedChange[]
  ) {
    this.#bytes = bytes.slice()
    this.layoutId = layoutId
    this.byteLength = bytes.byteLength
    this.sha256 = sha256
    this.derivedChanges = Object.freeze([...derivedChanges])
    Object.freeze(this)
  }

  toBytes() {
    return this.#bytes.slice()
  }
}

async function materializeCodeplugWriteImage(
  source: Uint8Array,
  layoutId: CodeplugLayoutId
) {
  if (layoutId === "uvl15w-legacy-v1") {
    return new CodeplugWriteImage(source, layoutId, await digestHex(source), [])
  }

  const bytes = source.slice()
  const derivedChanges: CodeplugWriteDerivedChange[] = []
  if (
    !rangesEqual(
      source,
      VFO_RECORDS_OFFSET,
      TEMPORARY_CHANNEL_RECORDS_OFFSET,
      2 * CHANNEL_RECORD_SIZE
    )
  ) {
    derivedChanges.push("mirror-vfo-temporary-channels")
  }
  if (
    !bytesEqual(
      source.slice(
        WEATHER_CHANNEL_RECORDS_OFFSET,
        WEATHER_CHANNEL_RECORDS_OFFSET +
          FIXED_WEATHER_CHANNELS_3_07_23.byteLength
      ),
      FIXED_WEATHER_CHANNELS_3_07_23
    )
  ) {
    derivedChanges.push("restore-fixed-weather-channels")
  }
  bytes.set(
    bytes.slice(VFO_RECORDS_OFFSET, VFO_RECORDS_OFFSET + CHANNEL_RECORD_SIZE),
    TEMPORARY_CHANNEL_RECORDS_OFFSET
  )
  bytes.set(
    bytes.slice(
      VFO_RECORDS_OFFSET + CHANNEL_RECORD_SIZE,
      VFO_RECORDS_OFFSET + 2 * CHANNEL_RECORD_SIZE
    ),
    TEMPORARY_CHANNEL_RECORDS_OFFSET + CHANNEL_RECORD_SIZE
  )
  bytes.set(FIXED_WEATHER_CHANNELS_3_07_23, WEATHER_CHANNEL_RECORDS_OFFSET)

  return new CodeplugWriteImage(
    bytes,
    layoutId,
    await digestHex(bytes),
    derivedChanges
  )
}

function fromHex(value: string) {
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16)
  )
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function rangesEqual(
  bytes: Uint8Array,
  leftOffset: number,
  rightOffset: number,
  length: number
) {
  for (let index = 0; index < length; index += 1) {
    if (bytes[leftOffset + index] !== bytes[rightOffset + index]) return false
  }
  return true
}

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  return (
    left.byteLength === right.byteLength &&
    left.every((byte, index) => byte === right[index])
  )
}

export { materializeCodeplugWriteImage }
export type { CodeplugWriteDerivedChange, CodeplugWriteImage }
