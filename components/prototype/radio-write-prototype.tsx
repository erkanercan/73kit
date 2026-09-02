"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { RadioWriteWorkflow } from "@/components/radio-write/radio-write-workflow"
import { Button } from "@/components/ui/button"
import type {
  PreparedRadioWrite,
  RadioWriteOperationSnapshot,
  RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import { CODEPLUG_LAYOUT_3_07_23 } from "@/modules/codeplug/index"

type Variant = "locked" | "review" | "writing" | "completed" | "unknown"

const variants: readonly Variant[] = [
  "locked",
  "review",
  "writing",
  "completed",
  "unknown",
]

function RadioWritePrototype() {
  const searchParams = useSearchParams()
  const initial = searchParams.get("state")
  const [variant, setVariant] = React.useState<Variant>(
    variants.includes(initial as Variant) ? (initial as Variant) : "review"
  )

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-8">
      <PageHeader title="Radio Write workflow prototype" />
      <div className="flex flex-wrap gap-2" aria-label="Radio Write state">
        {variants.map((candidate) => (
          <Button
            key={candidate}
            variant={candidate === variant ? "default" : "outline"}
            size="sm"
            onClick={() => setVariant(candidate)}
          >
            {candidate}
          </Button>
        ))}
      </div>
      <RadioWriteWorkflow
        released={variant !== "locked"}
        hasWorkingCodeplug
        changeCount={2}
        snapshot={snapshotFor(variant)}
        review={review}
        busy={false}
        onPrepare={() => setVariant("review")}
        onConfirm={() => setVariant("writing")}
        onDiscardStatus={() => setVariant("review")}
        onDownloadReport={() => undefined}
      />
    </div>
  )
}

function snapshotFor(variant: Variant): RadioWriteOperationSnapshot | null {
  switch (variant) {
    case "locked":
      return null
    case "review":
      return { phase: "review-required", preparedWrite }
    case "writing":
      return { phase: "writing", preparedWrite, bytesAcknowledged: 51_200 }
    case "completed":
      return {
        phase: "completed",
        preparedWrite,
        completedBackup: preparedWrite.intendedWriteImage,
        completedAt: "2026-08-28T10:00:00.000Z",
      }
    case "unknown":
      return {
        phase: "write-outcome-unknown",
        recovery: {
          schemaVersion: 1,
          preparedWrite,
          phase: "write-outcome-unknown",
          updatedAt: "2026-08-28T10:00:00.000Z",
          reason: "The Radio disconnected after block 100",
        },
      }
  }
}

const artifact = Object.freeze({
  id: "prototype",
  sha256: "0".repeat(64),
  byteLength: 102_400,
})
const preparedWrite: PreparedRadioWrite = Object.freeze({
  schemaVersion: 1,
  sourceRadioIdentity: {
    model: "UVL-15W" as const,
    subModel: 0,
    cpuId: "PROTOTYPE",
    serialNumber: "PROTOTYPE",
  },
  supportProfileId: "tyt-uvl15w-3.07.23",
  firmwareVersion: "3.07.23",
  layout: CODEPLUG_LAYOUT_3_07_23,
  baselineBackup: artifact,
  recoveryBackup: artifact,
  intendedWriteImage: artifact,
  changeSetSha256: "0".repeat(64),
  preparedAt: "2026-08-28T10:00:00.000Z",
})
const review: readonly RadioWriteReviewItem[] = Object.freeze([
  {
    id: "display-theme",
    subject: "Display settings",
    field: "System theme",
    before: "light",
    after: "dark",
  },
  {
    id: "channel-name",
    subject: "Memory channel 1",
    field: "Name",
    before: "Local",
    after: "Local repeater",
  },
])

export { RadioWritePrototype }
