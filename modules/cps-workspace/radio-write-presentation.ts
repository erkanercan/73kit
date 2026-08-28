import { CODEPLUG_LAYOUT_3_07_23 } from "../codeplug/index.ts"
import type { RadioWritePhase } from "./radio-write-policy.ts"

const RADIO_WRITE_STAGES = Object.freeze([
  "radio-check",
  "write",
  "reboot",
] as const)

function radioWritePresentation(
  phase: RadioWritePhase,
  bytesAcknowledged: number
) {
  const activeStage =
    phase === "review-required" || phase === "checking-radio"
      ? 0
      : phase === "writing-before-first-block" || phase === "writing"
        ? 1
        : 2
  const byteLength = CODEPLUG_LAYOUT_3_07_23.byteLength
  const blockSize = CODEPLUG_LAYOUT_3_07_23.writeBlockSize
  const acknowledged = Math.max(0, Math.min(bytesAcknowledged, byteLength))

  return Object.freeze({
    activeStage,
    destructive: phase === "writing",
    progress: Object.freeze({
      percent: Math.floor((acknowledged / byteLength) * 100),
      completedBlocks: Math.floor(acknowledged / blockSize),
      totalBlocks: byteLength / blockSize,
    }),
  })
}

export { RADIO_WRITE_STAGES, radioWritePresentation }
