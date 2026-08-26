import assert from "node:assert/strict"
import test from "node:test"

import {
  CODEPLUG_SIZE,
  MENU_VISIBILITY_ADDRESS,
  MENU_VISIBILITY_ASSIGNED_BIT_COUNT,
  MENU_VISIBILITY_ITEMS,
  createCodeplug,
} from "../modules/codeplug/index.ts"
import { reconcileMenuVisibilityChanges } from "../modules/cps-workspace/change-set.ts"
import en from "../dictionaries/en.ts"
import tr from "../dictionaries/tr.ts"

const FLASH_START = 0x8000
const offset = (address: number) => address - FLASH_START

test("decodes the current 174-bit Menu Visibility mask LSB-first", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(
    0xff,
    offset(MENU_VISIBILITY_ADDRESS),
    offset(MENU_VISIBILITY_ADDRESS) + 0x100
  )
  bytes[offset(0x1ea14)] = 0x3f
  bytes[offset(0x1ea15)] = 0xc0

  const visibility = createCodeplug(bytes).getMenuVisibility()

  assert.equal(MENU_VISIBILITY_ASSIGNED_BIT_COUNT, 174)
  assert.equal(visibility["display-theme"], true)
  assert.equal(visibility["radio-info-image-version"], false)
  assert.equal(visibility["radio-info-language-version"], false)
  assert.equal(visibility["audio-am-rx-gain"], false)
  assert.equal(visibility["function-scan-edge-init"], false)
})

test("defines one continuous hierarchy for bits 0 through 173", () => {
  assert.equal(MENU_VISIBILITY_ITEMS.length, 174)
  assert.deepEqual(
    MENU_VISIBILITY_ITEMS.map((item) => item.bit),
    Array.from({ length: 174 }, (_, bit) => bit)
  )
  assert.equal(
    new Set(MENU_VISIBILITY_ITEMS.map((item) => item.id)).size,
    MENU_VISIBILITY_ITEMS.length
  )

  const ids = new Set(MENU_VISIBILITY_ITEMS.map((item) => item.id))
  for (const item of MENU_VISIBILITY_ITEMS) {
    assert.equal(item.parentId === null || ids.has(item.parentId), true)
  }
})

test("matches every controlled PF comparison for the appended settings", () => {
  const cases = [
    ["radio-info-image-version", 0x1ea14, 0xbf],
    ["radio-info-language-version", 0x1ea14, 0x7f],
    ["audio-am-rx-gain", 0x1ea15, 0xfe],
    ["audio-am-n-rx-gain", 0x1ea15, 0xfd],
    ["function-auto-repeater", 0x1ea15, 0xfb],
    ["function-ci-t", 0x1ea15, 0xf7],
    ["function-auto-am-mode", 0x1ea15, 0xef],
    ["function-scan-edge-init", 0x1ea15, 0xdf],
  ] as const

  for (const [id, address, expected] of cases) {
    const bytes = new Uint8Array(CODEPLUG_SIZE)
    bytes.fill(0xff)
    const result = createCodeplug(bytes).setMenuVisibility(id, false).toBytes()
    assert.equal(result[offset(address)], expected, id)
  }
})

test("disabling Main Menu matches the controlled current-CPS PF mask", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(0xff)

  const result = createCodeplug(bytes)
    .setMenuVisibility("main-menu", false)
    .toBytes()
  const start = offset(MENU_VISIBILITY_ADDRESS)

  assert.deepEqual(
    Array.from(result.slice(start, start + 21)),
    Array(21).fill(0)
  )
  assert.equal(result[start + 21], 0xc0)
  assert.equal(result[start + 22], 0xff)
  assert.equal(result[start + 0xff], 0xff)
})

test("leaf edits update only the leaf and its required ancestor chain", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  const result = createCodeplug(bytes)
    .setMenuVisibility("function-ci-t", true)
    .toBytes()
  const start = offset(MENU_VISIBILITY_ADDRESS)

  assert.equal(result[start], 0x05)
  assert.equal(result[start + 1], 0x04)
  assert.equal(result[start + 21], 0x08)
  assert.equal(result[start + 20], 0x00)
  assert.equal(result[start + 22], 0x00)
})

test("parent edits cascade through descendants without touching siblings or reserved bits", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(0xff)
  const result = createCodeplug(bytes)
    .setMenuVisibility("radio-information", false)
    .toBytes()
  const visibility = createCodeplug(result).getMenuVisibility()

  assert.equal(visibility["main-menu"], true)
  assert.equal(visibility["channel-information"], true)
  assert.equal(visibility["radio-information"], false)
  assert.equal(visibility["radio-info-model"], false)
  assert.equal(visibility["radio-info-image-version"], false)
  assert.equal(visibility["radio-info-language-version"], false)
  assert.equal(result[offset(MENU_VISIBILITY_ADDRESS) + 22], 0xff)
})

test("reconciles Menu Visibility changes against the baseline", () => {
  const bytes = new Uint8Array(CODEPLUG_SIZE)
  bytes.fill(0xff)
  const baseline = createCodeplug(bytes)
  const edited = baseline.setMenuVisibility("function-ci-t", false)
  const changes = reconcileMenuVisibilityChanges([], baseline, edited)

  assert.deepEqual(changes, [
    { kind: "edit-menu-visibility", id: "function-ci-t" },
  ])
  assert.deepEqual(
    reconcileMenuVisibilityChanges(
      changes,
      baseline,
      edited.setMenuVisibility("function-ci-t", true)
    ),
    []
  )
})

test("rejects unknown Menu Visibility identifiers", () => {
  const codeplug = createCodeplug(new Uint8Array(CODEPLUG_SIZE))

  assert.throws(
    () => codeplug.setMenuVisibility("not-a-menu-item" as "main-menu", true),
    /Unknown Menu Visibility item/
  )
})

test("localizes every Menu Visibility item in English and Turkish", () => {
  for (const item of MENU_VISIBILITY_ITEMS) {
    const key = `menuVisibilityItem-${item.id}` as keyof typeof en
    assert.equal(typeof en[key], "string")
    assert.equal(typeof tr[key], "string")
  }
})
