import { decodeNullPaddedUtf8 } from "./binary.ts"
import {
  VFO_SCAN_EDGE_COUNT,
  VFO_SCAN_EDGE_HEADER_OFFSET,
  VFO_SCAN_EDGE_RECORD_SIZE,
  VFO_SCAN_EDGE_RECORDS_OFFSET,
} from "./memory-map.ts"
import type { ChannelModulation, ChannelStepKHz } from "./channel.ts"
import type { RadioBand } from "./band-zone-selection.ts"

const MAGIC = [0x45, 0x44, 0x47, 0x31] as const
const CURRENT_VERSION = 2
const MIN_FREQUENCY_HZ = 108_000_000
const MAX_FREQUENCY_HZ = 660_000_000
const STEPS = [
  2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100,
] as const satisfies readonly Exclude<ChannelStepKHz, "unknown">[]
const MODES = [
  "fm",
  "fm-narrow",
  "am",
  "am-narrow",
] as const satisfies readonly Exclude<ChannelModulation, "unknown">[]

interface VfoScanEdge {
  readonly number: number
  readonly valid: boolean
  readonly name: string
  readonly lowFrequencyHz: number
  readonly highFrequencyHz: number
  readonly stepKHz: ChannelStepKHz
  readonly modulation: ChannelModulation
}

interface VfoScanEdgePatch {
  readonly name?: string
  readonly lowFrequencyHz?: number
  readonly highFrequencyHz?: number
  readonly stepKHz?: Exclude<ChannelStepKHz, "unknown">
  readonly modulation?: Exclude<ChannelModulation, "unknown">
}

interface VfoScanEdgeSelections {
  readonly A: readonly number[]
  readonly B: readonly number[]
}

function decodeVfoScanEdges(bytes: Uint8Array): readonly VfoScanEdge[] {
  const view = dataView(bytes)
  return Object.freeze(
    Array.from({ length: VFO_SCAN_EDGE_COUNT }, (_, index) => {
      const offset =
        VFO_SCAN_EDGE_RECORDS_OFFSET + index * VFO_SCAN_EDGE_RECORD_SIZE
      const lowFrequencyHz = view.getUint32(offset + 0x18, true)
      const highFrequencyHz = view.getUint32(offset + 0x1c, true)
      const stepIndex = bytes[offset + 0x20]
      const modeIndex = bytes[offset + 0x21]
      const stepKHz: ChannelStepKHz =
        stepIndex !== undefined && stepIndex < STEPS.length
          ? STEPS[stepIndex]
          : "unknown"
      const modulation: ChannelModulation =
        modeIndex !== undefined && modeIndex < MODES.length
          ? MODES[modeIndex]
          : "unknown"
      const valid =
        lowFrequencyHz >= MIN_FREQUENCY_HZ &&
        highFrequencyHz <= MAX_FREQUENCY_HZ &&
        highFrequencyHz >= lowFrequencyHz &&
        stepKHz !== "unknown" &&
        modulation !== "unknown"

      return Object.freeze({
        number: index + 1,
        valid,
        name: valid
          ? decodeNullPaddedUtf8(bytes.subarray(offset, offset + 0x18))
          : "",
        lowFrequencyHz: valid ? lowFrequencyHz : 0,
        highFrequencyHz: valid ? highFrequencyHz : 0,
        stepKHz,
        modulation,
      })
    })
  )
}

function decodeVfoScanEdgeSelections(bytes: Uint8Array): VfoScanEdgeSelections {
  if (!hasMagic(bytes)) return Object.freeze({ A: [], B: [] })
  const view = dataView(bytes)
  const version = view.getUint16(VFO_SCAN_EDGE_HEADER_OFFSET + 4, true)

  if (version >= CURRENT_VERSION) {
    return Object.freeze({
      A: decodeMask(view.getUint32(VFO_SCAN_EDGE_HEADER_OFFSET + 8, true)),
      B: decodeMask(view.getUint32(VFO_SCAN_EDGE_HEADER_OFFSET + 12, true)),
    })
  }

  return Object.freeze({
    A: decodeLegacySelection(bytes[VFO_SCAN_EDGE_HEADER_OFFSET + 6]),
    B: decodeLegacySelection(bytes[VFO_SCAN_EDGE_HEADER_OFFSET + 7]),
  })
}

function editVfoScanEdgeBytes(
  source: Uint8Array,
  number: number,
  patch: VfoScanEdgePatch
) {
  assertNumber(number)
  const current = decodeVfoScanEdges(source)[number - 1]
  const result = source.slice()
  ensureV2Header(result)
  const offset =
    VFO_SCAN_EDGE_RECORDS_OFFSET + (number - 1) * VFO_SCAN_EDGE_RECORD_SIZE
  const next = {
    name: patch.name ?? current.name,
    lowFrequencyHz: patch.lowFrequencyHz ?? current.lowFrequencyHz,
    highFrequencyHz: patch.highFrequencyHz ?? current.highFrequencyHz,
    stepKHz:
      patch.stepKHz ?? (current.stepKHz === "unknown" ? 12.5 : current.stepKHz),
    modulation:
      patch.modulation ??
      (current.modulation === "unknown" ? "fm" : current.modulation),
  }

  validateName(next.name)
  validateFrequency(next.lowFrequencyHz, "Low")
  validateFrequency(next.highFrequencyHz, "High")
  if (next.highFrequencyHz < next.lowFrequencyHz) {
    throw new RangeError(
      "High frequency must be greater than or equal to low frequency"
    )
  }
  if (
    next.stepKHz === 8.33 &&
    (next.modulation === "fm" || next.modulation === "fm-narrow")
  ) {
    throw new RangeError("8.33 kHz step is only available for AM modes")
  }

  const encodedName = new TextEncoder().encode(next.name)
  result.fill(0, offset, offset + 0x18)
  result.set(encodedName, offset)
  const view = dataView(result)
  view.setUint32(offset + 0x18, next.lowFrequencyHz, true)
  view.setUint32(offset + 0x1c, next.highFrequencyHz, true)
  result[offset + 0x20] = STEPS.indexOf(next.stepKHz)
  result[offset + 0x21] = MODES.indexOf(next.modulation)
  return result
}

function editVfoScanEdgeSelectionBytes(
  source: Uint8Array,
  band: RadioBand,
  numbers: readonly number[]
) {
  const result = source.slice()
  ensureV2Header(result)
  const mask = encodeMask(numbers)
  dataView(result).setUint32(
    VFO_SCAN_EDGE_HEADER_OFFSET + (band === "A" ? 8 : 12),
    mask,
    true
  )
  return result
}

function ensureV2Header(bytes: Uint8Array) {
  const previous = decodeVfoScanEdgeSelections(bytes)
  bytes.set(MAGIC, VFO_SCAN_EDGE_HEADER_OFFSET)
  const view = dataView(bytes)
  view.setUint16(VFO_SCAN_EDGE_HEADER_OFFSET + 4, CURRENT_VERSION, true)
  bytes[VFO_SCAN_EDGE_HEADER_OFFSET + 6] = 0xff
  bytes[VFO_SCAN_EDGE_HEADER_OFFSET + 7] = 0xff
  view.setUint32(VFO_SCAN_EDGE_HEADER_OFFSET + 8, encodeMask(previous.A), true)
  view.setUint32(VFO_SCAN_EDGE_HEADER_OFFSET + 12, encodeMask(previous.B), true)
}

function hasMagic(bytes: Uint8Array) {
  return MAGIC.every(
    (byte, index) => bytes[VFO_SCAN_EDGE_HEADER_OFFSET + index] === byte
  )
}

function decodeLegacySelection(value: number | undefined): readonly number[] {
  return value === undefined || value === 0xff || value >= VFO_SCAN_EDGE_COUNT
    ? Object.freeze([])
    : Object.freeze([value + 1])
}

function decodeMask(mask: number): readonly number[] {
  return Object.freeze(
    Array.from({ length: VFO_SCAN_EDGE_COUNT }, (_, index) => index + 1).filter(
      (number) => (mask & (1 << (number - 1))) !== 0
    )
  )
}

function encodeMask(numbers: readonly number[]) {
  const unique = new Set<number>()
  let mask = 0
  for (const number of numbers) {
    assertNumber(number)
    if (unique.has(number))
      throw new RangeError(
        "A VFO Scan Edge selection cannot contain duplicates"
      )
    unique.add(number)
    mask = (mask | (1 << (number - 1))) >>> 0
  }
  return mask
}

function assertNumber(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > VFO_SCAN_EDGE_COUNT) {
    throw new RangeError(
      `VFO Scan Edge number must be between 1 and ${VFO_SCAN_EDGE_COUNT}`
    )
  }
}

function validateName(name: string) {
  if (name.includes("\0"))
    throw new RangeError("VFO Scan Edge name cannot contain a null character")
  if (new TextEncoder().encode(name).byteLength > 24) {
    throw new RangeError("VFO Scan Edge name must fit in 24 UTF-8 bytes")
  }
}

function validateFrequency(value: number, label: string) {
  if (
    !Number.isInteger(value) ||
    value < MIN_FREQUENCY_HZ ||
    value > MAX_FREQUENCY_HZ
  ) {
    throw new RangeError(`${label} frequency must be between 108 and 660 MHz`)
  }
}

function dataView(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export {
  MAX_FREQUENCY_HZ,
  MIN_FREQUENCY_HZ,
  MODES as VFO_SCAN_EDGE_MODES,
  STEPS as VFO_SCAN_EDGE_STEPS,
  decodeVfoScanEdgeSelections,
  decodeVfoScanEdges,
  editVfoScanEdgeBytes,
  editVfoScanEdgeSelectionBytes,
}
export type { VfoScanEdge, VfoScanEdgePatch, VfoScanEdgeSelections }
