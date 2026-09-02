const COMMON_LAYOUT = Object.freeze({
  startAddress: 0x8000,
  endAddress: 0x21000,
  byteLength: 0x19000,
  writeBlockSize: 512,
})

interface CodeplugMemoryMap {
  readonly zoneNamesOffset: number
  readonly bandAZoneSelectionOffset: number
  readonly bandBZoneSelectionOffset: number
  readonly scanListNamesOffset: number
  readonly bandAScanListSelectionOffset: number
  readonly bandBScanListSelectionOffset: number
  readonly vfoScanEdgeHeaderOffset: number
  readonly vfoScanEdgeRecordsOffset: number
  readonly vfoScanEdgeCount: number
  readonly vfoScanEdgeVersion: 1 | 2
}

const CODEPLUG_LAYOUT_LEGACY = Object.freeze({
  ...COMMON_LAYOUT,
  id: "uvl15w-legacy-v1" as const,
  firmwareVersion: "2.07.03-3.05.26" as const,
})

const CODEPLUG_MEMORY_MAP_LEGACY: CodeplugMemoryMap = Object.freeze({
  zoneNamesOffset: 0x13000,
  bandAZoneSelectionOffset: 0x13342,
  bandBZoneSelectionOffset: 0x13346,
  scanListNamesOffset: 0x13400,
  bandAScanListSelectionOffset: 0x13722,
  bandBScanListSelectionOffset: 0x13726,
  vfoScanEdgeHeaderOffset: 0x13b00,
  vfoScanEdgeRecordsOffset: 0x13b10,
  vfoScanEdgeCount: 16,
  vfoScanEdgeVersion: 1,
})

const CODEPLUG_LAYOUT_3_07_23 = Object.freeze({
  ...COMMON_LAYOUT,
  id: "uvl15w-3.07.23" as const,
  firmwareVersion: "3.07.23" as const,
})

const CODEPLUG_MEMORY_MAP_3_07_23: CodeplugMemoryMap = Object.freeze({
  zoneNamesOffset: 0x16000,
  bandAZoneSelectionOffset: 0x16342,
  bandBZoneSelectionOffset: 0x16346,
  scanListNamesOffset: 0x16500,
  bandAScanListSelectionOffset: 0x16822,
  bandBScanListSelectionOffset: 0x16826,
  vfoScanEdgeHeaderOffset: 0x16b00,
  vfoScanEdgeRecordsOffset: 0x16b10,
  vfoScanEdgeCount: 32,
  vfoScanEdgeVersion: 2,
})

const CODEPLUG_LAYOUTS = Object.freeze([
  CODEPLUG_LAYOUT_LEGACY,
  CODEPLUG_LAYOUT_3_07_23,
])

type CodeplugLayout = (typeof CODEPLUG_LAYOUTS)[number]
type CodeplugLayoutId = CodeplugLayout["id"]

function getCodeplugLayout(id: CodeplugLayoutId): CodeplugLayout {
  const layout = CODEPLUG_LAYOUTS.find((candidate) => candidate.id === id)
  if (!layout) throw new RangeError(`Unsupported Codeplug layout: ${id}`)
  return layout
}

function getCodeplugMemoryMap(id: CodeplugLayoutId): CodeplugMemoryMap {
  return id === CODEPLUG_LAYOUT_LEGACY.id
    ? CODEPLUG_MEMORY_MAP_LEGACY
    : CODEPLUG_MEMORY_MAP_3_07_23
}

export {
  CODEPLUG_LAYOUTS,
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_LAYOUT_LEGACY,
  CODEPLUG_MEMORY_MAP_3_07_23,
  CODEPLUG_MEMORY_MAP_LEGACY,
  getCodeplugMemoryMap,
  getCodeplugLayout,
}
export type { CodeplugLayout, CodeplugLayoutId, CodeplugMemoryMap }
