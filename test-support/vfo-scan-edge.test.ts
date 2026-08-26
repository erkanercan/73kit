import assert from "node:assert/strict"
import test from "node:test"

import { CODEPLUG_SIZE, createCodeplug } from "../modules/codeplug/index.ts"
import {
  reconcileVfoScanEdgeChanges,
  reconcileVfoScanEdgeSelectionChange,
} from "../modules/cps-workspace/change-set.ts"

const HEADER = 0x16b00
const RECORDS = 0x16b10
const RECORD_SIZE = 0x24

test("decodes all 32 current-format VFO Scan Edges and VFO selections", () => {
  const bytes = fixture()
  writeEdge(bytes, 1, "Air", 118_000_000, 136_975_000, 4, 2)
  writeEdge(bytes, 32, "UHF", 430_000_000, 440_000_000, 6, 1)
  const view = new DataView(bytes.buffer)
  view.setUint32(HEADER + 8, 0x8000_0001, true)
  view.setUint32(HEADER + 12, 0x8000_0000, true)

  const codeplug = createCodeplug(bytes)
  assert.equal(codeplug.getVfoScanEdges().length, 32)
  assert.deepEqual(codeplug.getVfoScanEdges()[0], {
    number: 1,
    valid: true,
    name: "Air",
    lowFrequencyHz: 118_000_000,
    highFrequencyHz: 136_975_000,
    stepKHz: 8.33,
    modulation: "am",
  })
  assert.equal(codeplug.getVfoScanEdges()[31]?.name, "UHF")
  assert.deepEqual(codeplug.getVfoScanEdgeSelections(), { A: [1, 32], B: [32] })
})

test("decodes legacy VFO A and B single-edge indices", () => {
  const bytes = fixture(1)
  bytes[HEADER + 6] = 0
  bytes[HEADER + 7] = 31
  assert.deepEqual(createCodeplug(bytes).getVfoScanEdgeSelections(), {
    A: [1],
    B: [32],
  })
})

test("edits a record in little-endian layout and preserves its reserved bytes", () => {
  const bytes = fixture()
  const offset = RECORDS + 4 * RECORD_SIZE
  bytes[offset + 0x22] = 0xa5
  bytes[offset + 0x23] = 0x5a

  const result = createCodeplug(bytes).editVfoScanEdge(5, {
    name: "Local VHF",
    lowFrequencyHz: 144_000_000,
    highFrequencyHz: 148_000_000,
    stepKHz: 12.5,
    modulation: "fm-narrow",
  })
  const written = result.toBytes()
  const view = new DataView(written.buffer)

  assert.equal(result.getVfoScanEdges()[4]?.name, "Local VHF")
  assert.equal(view.getUint32(offset + 0x18, true), 144_000_000)
  assert.equal(view.getUint32(offset + 0x1c, true), 148_000_000)
  assert.equal(written[offset + 0x20], 6)
  assert.equal(written[offset + 0x21], 1)
  assert.equal(written[offset + 0x22], 0xa5)
  assert.equal(written[offset + 0x23], 0x5a)
})

test("upgrades legacy selections to version 2 without losing the other band", () => {
  const bytes = fixture(1)
  bytes[HEADER + 6] = 2
  bytes[HEADER + 7] = 3
  const result = createCodeplug(bytes).editVfoScanEdgeSelection("A", [1, 32])
  const written = result.toBytes()
  const view = new DataView(written.buffer)

  assert.equal(view.getUint16(HEADER + 4, true), 2)
  assert.equal(written[HEADER + 6], 0xff)
  assert.equal(written[HEADER + 7], 0xff)
  assert.deepEqual(result.getVfoScanEdgeSelections(), { A: [1, 32], B: [4] })
})

test("rejects invalid ranges and the unsupported 8.33 kHz FM combination", () => {
  const codeplug = createCodeplug(fixture())
  assert.throws(
    () =>
      codeplug.editVfoScanEdge(1, {
        lowFrequencyHz: 107_999_999,
        highFrequencyHz: 145_000_000,
      }),
    /between 108 and 660 MHz/
  )
  assert.throws(
    () =>
      codeplug.editVfoScanEdge(1, {
        lowFrequencyHz: 146_000_000,
        highFrequencyHz: 145_000_000,
      }),
    /greater than or equal/
  )
  assert.throws(
    () =>
      codeplug.editVfoScanEdge(1, {
        lowFrequencyHz: 144_000_000,
        highFrequencyHz: 148_000_000,
        stepKHz: 8.33,
        modulation: "fm",
      }),
    /only available for AM/
  )
})

test("reconciles VFO Scan Edge edits and selections back to baseline", () => {
  const baseline = createCodeplug(fixture())
  const edited = baseline.editVfoScanEdge(1, {
    name: "Two metres",
    lowFrequencyHz: 144_000_000,
    highFrequencyHz: 148_000_000,
  })
  const changes = reconcileVfoScanEdgeChanges([], baseline, edited, 1, [
    "name",
    "lowFrequencyHz",
    "highFrequencyHz",
  ])
  assert.equal(changes.length, 3)
  assert.deepEqual(
    reconcileVfoScanEdgeChanges(changes, baseline, baseline, 1, ["name"]),
    []
  )

  const selected = baseline.editVfoScanEdgeSelection("B", [2, 3])
  const selectionChanges = reconcileVfoScanEdgeSelectionChange(
    [],
    baseline,
    selected,
    "B"
  )
  assert.deepEqual(selectionChanges, [
    { kind: "edit-vfo-scan-edge-selection", band: "B" },
  ])
})

function fixture(version = 2) {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.set(new TextEncoder().encode("EDG1"), HEADER)
  new DataView(bytes.buffer).setUint16(HEADER + 4, version, true)
  bytes[HEADER + 6] = 0xff
  bytes[HEADER + 7] = 0xff
  return bytes
}

function writeEdge(
  bytes: Uint8Array,
  number: number,
  name: string,
  low: number,
  high: number,
  step: number,
  mode: number
) {
  const offset = RECORDS + (number - 1) * RECORD_SIZE
  bytes.set(new TextEncoder().encode(name), offset)
  const view = new DataView(bytes.buffer)
  view.setUint32(offset + 0x18, low, true)
  view.setUint32(offset + 0x1c, high, true)
  bytes[offset + 0x20] = step
  bytes[offset + 0x21] = mode
}
