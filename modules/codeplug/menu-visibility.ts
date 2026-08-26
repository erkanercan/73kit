import {
  MENU_VISIBILITY_ITEMS,
  type MenuVisibilityItemId,
} from "./menu-visibility-items.ts"

const CODEPLUG_FLASH_START = 0x8000
const MENU_VISIBILITY_ADDRESS = 0x1ea00
const MENU_VISIBILITY_ASSIGNED_BIT_COUNT = 174

type MenuVisibility = Readonly<Record<MenuVisibilityItemId, boolean>>

const itemsById = new Map(
  MENU_VISIBILITY_ITEMS.map((item) => [item.id, item] as const)
)
const childrenByParent = new Map<MenuVisibilityItemId, MenuVisibilityItemId[]>()

for (const item of MENU_VISIBILITY_ITEMS) {
  if (item.parentId === null) continue
  const children = childrenByParent.get(item.parentId) ?? []
  children.push(item.id)
  childrenByParent.set(item.parentId, children)
}

function decodeMenuVisibility(bytes: Uint8Array): MenuVisibility {
  return Object.freeze(
    Object.fromEntries(
      MENU_VISIBILITY_ITEMS.map((item) => [
        item.id,
        readVisibilityBit(bytes, item.bit),
      ])
    ) as Record<MenuVisibilityItemId, boolean>
  )
}

function editMenuVisibilityBytes(
  source: Uint8Array,
  id: MenuVisibilityItemId,
  visible: boolean
) {
  const item = itemsById.get(id)
  if (!item) throw new RangeError(`Unknown Menu Visibility item: ${id}`)

  const bytes = source.slice()
  const affectedIds = collectSubtreeIds(id)

  for (const affectedId of affectedIds) {
    const affectedItem = itemsById.get(affectedId)
    if (affectedItem) writeVisibilityBit(bytes, affectedItem.bit, visible)
  }

  let ancestorId = item.parentId
  while (ancestorId !== null) {
    const ancestor = itemsById.get(ancestorId)
    if (!ancestor) break
    const childIds = childrenByParent.get(ancestorId) ?? []
    const hasVisibleChild = childIds.some((childId) => {
      const child = itemsById.get(childId)
      return child ? readVisibilityBit(bytes, child.bit) : false
    })
    writeVisibilityBit(bytes, ancestor.bit, hasVisibleChild)
    ancestorId = ancestor.parentId
  }

  return bytes
}

function collectSubtreeIds(rootId: MenuVisibilityItemId) {
  const result: MenuVisibilityItemId[] = []
  const pending: MenuVisibilityItemId[] = [rootId]

  while (pending.length > 0) {
    const current = pending.shift()
    if (!current) continue
    result.push(current)
    pending.push(...(childrenByParent.get(current) ?? []))
  }

  return result
}

function readVisibilityBit(bytes: Uint8Array, bit: number) {
  const byteOffset = toCodeplugOffset(MENU_VISIBILITY_ADDRESS) + (bit >> 3)
  return (bytes[byteOffset] & (1 << (bit & 7))) !== 0
}

function writeVisibilityBit(bytes: Uint8Array, bit: number, visible: boolean) {
  const byteOffset = toCodeplugOffset(MENU_VISIBILITY_ADDRESS) + (bit >> 3)
  const mask = 1 << (bit & 7)
  bytes[byteOffset] = visible
    ? bytes[byteOffset] | mask
    : bytes[byteOffset] & ~mask
}

function toCodeplugOffset(address: number) {
  return address - CODEPLUG_FLASH_START
}

export {
  MENU_VISIBILITY_ADDRESS,
  MENU_VISIBILITY_ASSIGNED_BIT_COUNT,
  decodeMenuVisibility,
  editMenuVisibilityBytes,
}
export type { MenuVisibility, MenuVisibilityItemId }
