import { MEMBERSHIP_GROUP_COUNT } from "./memory-map.ts"
import type { RadioBand } from "./band-zone-selection.ts"
import { CODEPLUG_MEMORY_MAP_3_07_23 } from "./layout.ts"
import type { CodeplugMemoryMap } from "./layout.ts"

interface BandScanListSelections {
  readonly A: readonly number[]
  readonly B: readonly number[]
}

const LOWER_SCAN_LIST_BITS_MASK = 0x0000ffff

function decodeBandScanListSelections(
  bytes: Uint8Array,
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
): BandScanListSelections {
  return Object.freeze({
    A: decodeSelection(bytes, memoryMap.bandAScanListSelectionOffset),
    B: decodeSelection(bytes, memoryMap.bandBScanListSelectionOffset),
  })
}

function decodeSelection(bytes: Uint8Array, offset: number) {
  const mask = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getUint32(offset, true)

  return Object.freeze(
    Array.from(
      { length: MEMBERSHIP_GROUP_COUNT },
      (_, index) => index + 1
    ).filter((number) => (mask & (1 << (number - 1))) !== 0)
  )
}

function editBandScanListSelectionBytes(
  source: Uint8Array,
  band: RadioBand,
  scanListNumbers: readonly number[],
  memoryMap: CodeplugMemoryMap = CODEPLUG_MEMORY_MAP_3_07_23
) {
  const result = source.slice()
  const offset = bandOffset(band, memoryMap)
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength)
  const current = view.getUint32(offset, true)
  const selectedMask = encodeSelection(scanListNumbers)
  const preservedUpperBits = current & ~LOWER_SCAN_LIST_BITS_MASK

  view.setUint32(offset, (preservedUpperBits | selectedMask) >>> 0, true)
  return result
}

function encodeSelection(scanListNumbers: readonly number[]) {
  const unique = new Set<number>()
  let mask = 0

  for (const number of scanListNumbers) {
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > MEMBERSHIP_GROUP_COUNT
    ) {
      throw new RangeError(
        `Scan List number must be between 1 and ${MEMBERSHIP_GROUP_COUNT}`
      )
    }
    if (unique.has(number)) {
      throw new RangeError(
        "A Band Scan List selection cannot contain the same Scan List twice"
      )
    }
    unique.add(number)
    mask |= 1 << (number - 1)
  }

  return mask & LOWER_SCAN_LIST_BITS_MASK
}

function bandOffset(band: RadioBand, memoryMap: CodeplugMemoryMap) {
  if (band === "A") return memoryMap.bandAScanListSelectionOffset
  if (band === "B") return memoryMap.bandBScanListSelectionOffset
  throw new RangeError("Radio band must be A or B")
}

export { decodeBandScanListSelections, editBandScanListSelectionBytes }
export type { BandScanListSelections }
