import {
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  decodeCallChannels,
  decodeChannels,
  decodeVfoChannels,
} from "./channel-codec.ts"
import {
  editCallChannelBytes,
  editMemoryChannelBytes,
  editVfoChannelBytes,
} from "./channel-edit.ts"
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
import {
  decodeBandZoneSelections,
  editBandZoneSelectionBytes,
} from "./band-zone-selection.ts"
import type { BandZoneSelections, RadioBand } from "./band-zone-selection.ts"
import type {
  CallChannelPatch,
  MemoryChannelPatch,
  VfoChannelPatch,
} from "./channel-edit.ts"
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
  readonly #bandZoneSelections: BandZoneSelections

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
    this.#bandZoneSelections = decodeBandZoneSelections(this.#bytes)
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

  getBandZoneSelections() {
    return this.#bandZoneSelections
  }

  moveMemoryChannel(fromNumber: number, toNumber: number) {
    return new Codeplug(
      moveMemoryChannelBytes(this.#bytes, fromNumber, toNumber)
    )
  }

  editMemoryChannel(number: number, patch: MemoryChannelPatch) {
    return new Codeplug(editMemoryChannelBytes(this.#bytes, number, patch))
  }

  editVfoChannel(slot: "A" | "B", patch: VfoChannelPatch) {
    return new Codeplug(editVfoChannelBytes(this.#bytes, slot, patch))
  }

  editCallChannel(slot: 1 | 2, patch: CallChannelPatch) {
    return new Codeplug(editCallChannelBytes(this.#bytes, slot, patch))
  }

  editZone(number: number, patch: ChannelCollectionPatch) {
    return new Codeplug(editZoneBytes(this.#bytes, number, patch))
  }

  editBandZoneSelection(band: RadioBand, zoneNumbers: readonly number[]) {
    return new Codeplug(
      editBandZoneSelectionBytes(this.#bytes, band, zoneNumbers)
    )
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
export type { BandZoneSelections, RadioBand } from "./band-zone-selection.ts"
export type {
  ChannelCollectionPatch,
  ChannelMembershipPatch,
  MembershipConsistencyIssue,
  ScanList,
  Zone,
} from "./channel-membership.ts"
export type {
  CallChannelPatch,
  MemoryChannelPatch,
  VfoChannelPatch,
} from "./channel-edit.ts"
