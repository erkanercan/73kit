import type { ChannelModulation, ChannelStepKHz } from "./channel.ts"
import type { UnknownSettingValue } from "./function-settings.ts"

const CODEPLUG_FLASH_START = 0x8000
const SPECTRUM_SETTINGS_ADDRESS = 0x1531a
const SPECTRUM_SETTINGS_OFFSET =
  SPECTRUM_SETTINGS_ADDRESS - CODEPLUG_FLASH_START
const MIN_FREQUENCY_HZ = 108_000_000
const MAX_FREQUENCY_HZ = 660_000_000
const COLLECTION_COUNT = 16
const LOWER_COLLECTION_BITS_MASK = 0x0000ffff

const SPECTRUM_MODES = ["center", "edge", "zone", "scan-list"] as const
const SPECTRUM_SCAN_SPEEDS = [
  "slow",
  "mid",
  "high",
  "very-high",
  "turbo",
] as const
const SPECTRUM_STEPS = [
  2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100,
] as const satisfies readonly Exclude<ChannelStepKHz, "unknown">[]
const SPECTRUM_MODULATIONS = [
  "fm",
  "fm-narrow",
  "am",
  "am-narrow",
] as const satisfies readonly Exclude<ChannelModulation, "unknown">[]

type SpectrumMode = (typeof SPECTRUM_MODES)[number]
type SpectrumScanSpeed = (typeof SPECTRUM_SCAN_SPEEDS)[number]
type SpectrumStepKHz = (typeof SPECTRUM_STEPS)[number]
type SpectrumModulation = (typeof SPECTRUM_MODULATIONS)[number]
type SettingValue<Value> = Value | UnknownSettingValue

interface SpectrumSettings {
  readonly mode: SettingValue<SpectrumMode>
  readonly lowerFrequencyHz: number
  readonly upperFrequencyHz: number
  readonly stepKHz: SettingValue<SpectrumStepKHz>
  readonly modulation: SettingValue<SpectrumModulation>
  readonly scanSpeed: SettingValue<SpectrumScanSpeed>
  readonly zoneNumbers: readonly number[]
  readonly scanListNumbers: readonly number[]
}

interface SpectrumSettingsPatch {
  readonly mode?: SpectrumMode
  readonly lowerFrequencyHz?: number
  readonly upperFrequencyHz?: number
  readonly stepKHz?: SettingValue<SpectrumStepKHz>
  readonly modulation?: SettingValue<SpectrumModulation>
  readonly scanSpeed?: SpectrumScanSpeed
  readonly zoneNumbers?: readonly number[]
  readonly scanListNumbers?: readonly number[]
}

function createSpectrumModeChangePatch(
  current: SpectrumSettings,
  baseline: SpectrumSettings,
  mode: SpectrumMode
): SpectrumSettingsPatch {
  if (current.mode === mode) return { mode }

  if (current.mode === "zone") {
    return { mode, zoneNumbers: baseline.zoneNumbers }
  }
  if (current.mode === "scan-list") {
    return { mode, scanListNumbers: baseline.scanListNumbers }
  }
  if (current.mode === "edge") {
    return {
      mode,
      lowerFrequencyHz: baseline.lowerFrequencyHz,
      upperFrequencyHz: baseline.upperFrequencyHz,
      stepKHz: baseline.stepKHz,
      modulation: baseline.modulation,
    }
  }

  return { mode }
}

const ADDRESS = {
  mode: SPECTRUM_SETTINGS_ADDRESS,
  reserved: 0x1531b,
  lowerFrequencyHz: 0x1531c,
  upperFrequencyHz: 0x15320,
  stepKHz: 0x15324,
  modulation: 0x15325,
  scanSpeed: 0x15326,
  zoneMask: 0x1532c,
  scanListMask: 0x15330,
} as const

const SPECTRUM_SETTING_OPTIONS = Object.freeze({
  modes: SPECTRUM_MODES,
  scanSpeeds: SPECTRUM_SCAN_SPEEDS,
  stepsKHz: SPECTRUM_STEPS,
  modulations: SPECTRUM_MODULATIONS,
})

function decodeSpectrumSettings(bytes: Uint8Array): SpectrumSettings {
  const view = dataView(bytes)

  return Object.freeze({
    mode: decodeIndex(read(bytes, ADDRESS.mode), SPECTRUM_MODES),
    lowerFrequencyHz: view.getUint32(offset(ADDRESS.lowerFrequencyHz)),
    upperFrequencyHz: view.getUint32(offset(ADDRESS.upperFrequencyHz)),
    stepKHz: decodeIndex(read(bytes, ADDRESS.stepKHz), SPECTRUM_STEPS),
    modulation: decodeIndex(
      read(bytes, ADDRESS.modulation),
      SPECTRUM_MODULATIONS
    ),
    scanSpeed: decodeIndex(
      read(bytes, ADDRESS.scanSpeed),
      SPECTRUM_SCAN_SPEEDS
    ),
    zoneNumbers: decodeCollectionMask(view.getUint32(offset(ADDRESS.zoneMask))),
    scanListNumbers: decodeCollectionMask(
      view.getUint32(offset(ADDRESS.scanListMask))
    ),
  })
}

function editSpectrumSettingsBytes(
  source: Uint8Array,
  patch: SpectrumSettingsPatch
) {
  const current = decodeSpectrumSettings(source)
  const bytes = source.slice()
  const view = dataView(bytes)
  const lowerFrequencyHz = patch.lowerFrequencyHz ?? current.lowerFrequencyHz
  const upperFrequencyHz = patch.upperFrequencyHz ?? current.upperFrequencyHz
  const stepKHz =
    patch.stepKHz ?? (isUnknown(current.stepKHz) ? undefined : current.stepKHz)
  const modulation =
    patch.modulation ??
    (isUnknown(current.modulation) ? undefined : current.modulation)

  if (
    patch.lowerFrequencyHz !== undefined ||
    patch.upperFrequencyHz !== undefined
  ) {
    validateFrequency(lowerFrequencyHz, "Lower")
    validateFrequency(upperFrequencyHz, "Upper")
    if (upperFrequencyHz < lowerFrequencyHz) {
      throw new RangeError(
        "Upper frequency must be greater than or equal to lower frequency"
      )
    }
  }
  if (
    (patch.stepKHz !== undefined || patch.modulation !== undefined) &&
    stepKHz === 8.33 &&
    (modulation === "fm" || modulation === "fm-narrow")
  ) {
    throw new RangeError("8.33 kHz step is only available for AM modes")
  }

  if (patch.mode !== undefined) {
    writeIndex(bytes, ADDRESS.mode, SPECTRUM_MODES, patch.mode, "mode")
  }
  if (patch.lowerFrequencyHz !== undefined) {
    view.setUint32(offset(ADDRESS.lowerFrequencyHz), lowerFrequencyHz)
  }
  if (patch.upperFrequencyHz !== undefined) {
    view.setUint32(offset(ADDRESS.upperFrequencyHz), upperFrequencyHz)
  }
  if (patch.stepKHz !== undefined) {
    writeSettingIndex(
      bytes,
      ADDRESS.stepKHz,
      SPECTRUM_STEPS,
      patch.stepKHz,
      "step"
    )
  }
  if (patch.modulation !== undefined) {
    writeSettingIndex(
      bytes,
      ADDRESS.modulation,
      SPECTRUM_MODULATIONS,
      patch.modulation,
      "modulation"
    )
  }
  if (patch.scanSpeed !== undefined) {
    writeIndex(
      bytes,
      ADDRESS.scanSpeed,
      SPECTRUM_SCAN_SPEEDS,
      patch.scanSpeed,
      "scan speed"
    )
  }
  if (patch.zoneNumbers !== undefined) {
    writeCollectionMask(bytes, ADDRESS.zoneMask, patch.zoneNumbers, "Zone")
  }
  if (patch.scanListNumbers !== undefined) {
    writeCollectionMask(
      bytes,
      ADDRESS.scanListMask,
      patch.scanListNumbers,
      "Scan List"
    )
  }

  return bytes
}

function decodeIndex<const Values extends readonly unknown[]>(
  raw: number,
  values: Values
): SettingValue<Values[number]> {
  return values[raw] ?? Object.freeze({ kind: "unknown", raw })
}

function writeIndex<const Values extends readonly unknown[]>(
  bytes: Uint8Array,
  address: number,
  values: Values,
  value: unknown,
  label: string
) {
  const index = values.indexOf(value as never)
  if (index === -1) throw new RangeError(`Unsupported Spectrum ${label}`)
  bytes[offset(address)] = index
}

function writeSettingIndex<const Values extends readonly unknown[]>(
  bytes: Uint8Array,
  address: number,
  values: Values,
  value: SettingValue<Values[number]>,
  label: string
) {
  if (isUnknown(value)) {
    bytes[offset(address)] = value.raw
    return
  }
  writeIndex(bytes, address, values, value, label)
}

function decodeCollectionMask(mask: number) {
  return Object.freeze(
    Array.from({ length: COLLECTION_COUNT }, (_, index) => index + 1).filter(
      (number) => (mask & (1 << (number - 1))) !== 0
    )
  )
}

function writeCollectionMask(
  bytes: Uint8Array,
  address: number,
  numbers: readonly number[],
  label: string
) {
  const unique = new Set<number>()
  let selectedMask = 0
  for (const number of numbers) {
    if (!Number.isInteger(number) || number < 1 || number > COLLECTION_COUNT) {
      throw new RangeError(
        `Spectrum ${label} number must be between 1 and ${COLLECTION_COUNT}`
      )
    }
    if (unique.has(number)) {
      throw new RangeError(
        `Spectrum ${label} selection cannot contain duplicates`
      )
    }
    unique.add(number)
    selectedMask |= 1 << (number - 1)
  }

  const view = dataView(bytes)
  const targetOffset = offset(address)
  const current = view.getUint32(targetOffset)
  const preservedUpperBits = current & ~LOWER_COLLECTION_BITS_MASK
  view.setUint32(targetOffset, (preservedUpperBits | selectedMask) >>> 0)
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

function isUnknown(value: unknown): value is UnknownSettingValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "unknown"
  )
}

function read(bytes: Uint8Array, address: number) {
  return bytes[offset(address)]
}

function dataView(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function offset(address: number) {
  return address - CODEPLUG_FLASH_START
}

export {
  MAX_FREQUENCY_HZ,
  MIN_FREQUENCY_HZ,
  SPECTRUM_SETTING_OPTIONS,
  SPECTRUM_SETTINGS_ADDRESS,
  SPECTRUM_SETTINGS_OFFSET,
  createSpectrumModeChangePatch,
  decodeSpectrumSettings,
  editSpectrumSettingsBytes,
}
export type {
  SpectrumMode,
  SpectrumModulation,
  SpectrumScanSpeed,
  SpectrumSettings,
  SpectrumSettingsPatch,
  SpectrumStepKHz,
}
