import {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_LAYOUT_LEGACY,
  CODEPLUG_MEMORY_MAP_3_07_23,
  CODEPLUG_MEMORY_MAP_LEGACY,
} from "./layout.ts"
import type { CodeplugLayoutId } from "./layout.ts"

const PF_RECORD_SIZE = 32
const PF_RECORD_COUNT = 3_200
const PF_LINE_LENGTH = 76
const PF_START_ADDRESS = 0x8000
const PF_BYTE_LENGTH = PF_RECORD_SIZE * PF_RECORD_COUNT
const KNOWN_LEGACY_DEFAULT_HASHES = new Set([
  "da46623ca3c71657b018749a9c0ef5ea284a57ded467476191c37eb862498c81",
  "185e6039ed777a67aedca2515d4a0ea9361d14b6396f45a09a4fe1b9bdb27a3c",
  "2b52234676461d8d9bbd5477eb78446f5e38fb25a03985facaa80775ca357342",
  "26ee4259ec35db6e768e8dcadd09a0c3e00bb04ac468c6227dda7c5417d24d16",
  "431769774eee4d604b0cccb3365c67ee2bd9476e66905387e2ae8fdf3d02f1c8",
  "9d387a696aaed879445926ff4e1cb1c3085dcea19050122385894d0539698f24",
])

type PfGeneration = "legacy-beta" | "3.07"

interface ParsedPfFile {
  readonly bytes: Uint8Array
  readonly generation: PfGeneration
  readonly layoutId: CodeplugLayoutId
}

class PfFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PfFileError"
  }
}

async function parsePfFile(text: string): Promise<ParsedPfFile> {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n")

  if (lines.length !== PF_RECORD_COUNT) {
    throw new PfFileError(
      `A UVL-15W PF file must contain ${PF_RECORD_COUNT.toLocaleString("en-US")} records; selected file contains ${lines.length.toLocaleString("en-US")}`
    )
  }

  const bytes = new Uint8Array(PF_BYTE_LENGTH)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.length !== PF_LINE_LENGTH || !/^[0-9a-fA-F]+$/.test(line)) {
      throw new PfFileError(
        `PF record ${index + 1} is not valid hexadecimal data`
      )
    }
    const address = Number.parseInt(line.slice(0, 8), 16)
    const byteCount = Number.parseInt(line.slice(8, 12), 16)
    const expectedAddress = PF_START_ADDRESS + index * PF_RECORD_SIZE
    if (address !== expectedAddress || byteCount !== PF_RECORD_SIZE) {
      throw new PfFileError(
        `PF record ${index + 1} does not match the expected UVL-15W address map`
      )
    }
    for (let offset = 0; offset < PF_RECORD_SIZE; offset += 1) {
      bytes[index * PF_RECORD_SIZE + offset] = Number.parseInt(
        line.slice(12 + offset * 2, 14 + offset * 2),
        16
      )
    }
  }

  const currentMap = CODEPLUG_MEMORY_MAP_3_07_23
  const isCurrent =
    hasMarker(
      bytes,
      currentMap.vfoScanEdgeHeaderOffset,
      [0x45, 0x44, 0x47, 0x31, 0x02, 0x00]
    ) || hasMarker(bytes, 0xff00, [0x52, 0x43, 0x46, 0x47, 0x02, 0x00])
  const isLegacy =
    hasMarker(
      bytes,
      CODEPLUG_MEMORY_MAP_LEGACY.vfoScanEdgeHeaderOffset,
      [0x45, 0x44, 0x47, 0x31, 0x01, 0x00]
    ) || KNOWN_LEGACY_DEFAULT_HASHES.has(await digestHex(bytes))

  if (isCurrent === isLegacy) {
    throw new PfFileError(
      isCurrent
        ? "The PF file contains conflicting Codeplug generation markers"
        : "The PF file does not identify a supported Codeplug generation"
    )
  }
  return Object.freeze({
    bytes,
    generation: isCurrent ? "3.07" : "legacy-beta",
    layoutId: isCurrent
      ? CODEPLUG_LAYOUT_3_07_23.id
      : CODEPLUG_LAYOUT_LEGACY.id,
  })
}

async function digestHex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function serializePfFile(bytes: Uint8Array) {
  if (bytes.byteLength !== PF_BYTE_LENGTH) {
    throw new PfFileError(
      `A UVL-15W Codeplug must contain exactly ${PF_BYTE_LENGTH.toLocaleString("en-US")} bytes`
    )
  }
  const lines: string[] = []
  for (let index = 0; index < PF_RECORD_COUNT; index += 1) {
    const address = (PF_START_ADDRESS + index * PF_RECORD_SIZE)
      .toString(16)
      .toUpperCase()
      .padStart(8, "0")
    const data = Array.from(
      bytes.subarray(index * PF_RECORD_SIZE, (index + 1) * PF_RECORD_SIZE),
      (byte) => byte.toString(16).toUpperCase().padStart(2, "0")
    ).join("")
    lines.push(`${address}0020${data}`)
  }
  return `${lines.join("\n")}\n`
}

function hasMarker(
  bytes: Uint8Array,
  offset: number,
  marker: readonly number[]
) {
  return marker.every((byte, index) => bytes[offset + index] === byte)
}

export { PfFileError, parsePfFile, serializePfFile }
export type { ParsedPfFile, PfGeneration }
