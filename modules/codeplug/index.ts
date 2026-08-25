import {
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  decodeCallChannels,
  decodeChannels,
  decodeVfoChannels,
} from "./channel-codec.ts"
import { editMemoryChannelBytes } from "./channel-edit.ts"
import {
  decodeScanLists,
  decodeZones,
  editChannelMembershipsBytes,
  editScanListBytes,
  editZoneBytes,
  validateMembershipConsistency,
} from "./channel-membership.ts"
import { moveMemoryChannelBytes } from "./channel-order.ts"
import {
  addDefaultMemoryChannelBytes,
  deleteMemoryChannelBytes,
} from "./channel-rows.ts"
import type { MemoryChannelPatch } from "./channel-edit.ts"
import type {
  ChannelCollectionPatch,
  ChannelMembershipPatch,
  MembershipConsistencyIssue,
  ScanList,
  Zone,
} from "./channel-membership.ts"
import type { Channel, SpecialChannel } from "./channel.ts"

const CODEPLUG_SIZE = 0x19000

class Codeplug {
  readonly #bytes: Uint8Array
  readonly #channels: readonly Channel[]
  readonly #vfoChannels: readonly SpecialChannel[]
  readonly #callChannels: readonly SpecialChannel[]
  readonly #zones: readonly Zone[]
  readonly #scanLists: readonly ScanList[]

  constructor(bytes: Uint8Array) {
    if (bytes.byteLength !== CODEPLUG_SIZE) {
      throw new RangeError(
        `A Codeplug must contain exactly ${CODEPLUG_SIZE} bytes; received ${bytes.byteLength}`
      )
    }

    this.#bytes = bytes.slice()
    this.#channels = decodeChannels(this.#bytes)
    this.#vfoChannels = decodeVfoChannels(this.#bytes)
    this.#callChannels = decodeCallChannels(this.#bytes)
    this.#zones = decodeZones(this.#bytes)
    this.#scanLists = decodeScanLists(this.#bytes)
  }

  get byteLength() {
    return this.#bytes.byteLength
  }

  toBytes() {
    return this.#bytes.slice()
  }

  getChannels() {
    return this.#channels
  }

  getVfoChannels() {
    return this.#vfoChannels
  }

  getCallChannels() {
    return this.#callChannels
  }

  getZones() {
    return this.#zones
  }

  getScanLists() {
    return this.#scanLists
  }

  moveMemoryChannel(fromNumber: number, toNumber: number) {
    return new Codeplug(
      moveMemoryChannelBytes(this.#bytes, fromNumber, toNumber)
    )
  }

  editMemoryChannel(number: number, patch: MemoryChannelPatch) {
    return new Codeplug(editMemoryChannelBytes(this.#bytes, number, patch))
  }

  editZone(number: number, patch: ChannelCollectionPatch) {
    return new Codeplug(editZoneBytes(this.#bytes, number, patch))
  }

  editScanList(number: number, patch: ChannelCollectionPatch) {
    return new Codeplug(editScanListBytes(this.#bytes, number, patch))
  }

  editChannelMemberships(number: number, patch: ChannelMembershipPatch) {
    return new Codeplug(editChannelMembershipsBytes(this.#bytes, number, patch))
  }

  validateMembershipConsistency(): readonly MembershipConsistencyIssue[] {
    return validateMembershipConsistency(this.#bytes)
  }

  addMemoryChannel() {
    return new Codeplug(addDefaultMemoryChannelBytes(this.#bytes))
  }

  deleteMemoryChannel(number: number) {
    return new Codeplug(deleteMemoryChannelBytes(this.#bytes, number))
  }

  equals(other: Codeplug) {
    const otherBytes = other.#bytes

    return this.#bytes.every((byte, index) => byte === otherBytes[index])
  }
}

function createCodeplug(bytes: Uint8Array) {
  return new Codeplug(bytes)
}

export {
  CODEPLUG_SIZE,
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  Codeplug,
  createCodeplug,
}
export type { Channel, SpecialChannel } from "./channel.ts"
export type {
  ChannelCollectionPatch,
  ChannelMembershipPatch,
  MembershipConsistencyIssue,
  ScanList,
  Zone,
} from "./channel-membership.ts"
export type { MemoryChannelPatch } from "./channel-edit.ts"
