const CODEPLUG_LAYOUT_3_07_23 = Object.freeze({
  id: "uvl15w-3.07.23" as const,
  firmwareVersion: "3.07.23" as const,
  startAddress: 0x8000,
  endAddress: 0x21000,
  byteLength: 0x19000,
  writeBlockSize: 512,
})

type CodeplugLayout = typeof CODEPLUG_LAYOUT_3_07_23
type CodeplugLayoutId = CodeplugLayout["id"]

export { CODEPLUG_LAYOUT_3_07_23 }
export type { CodeplugLayout, CodeplugLayoutId }
