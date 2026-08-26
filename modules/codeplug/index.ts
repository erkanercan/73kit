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
import {
  decodeBandScanListSelections,
  editBandScanListSelectionBytes,
} from "./band-scan-list-selection.ts"
import type { BandZoneSelections, RadioBand } from "./band-zone-selection.ts"
import type { BandScanListSelections } from "./band-scan-list-selection.ts"
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
import {
  decodeFunctionSettings,
  editFunctionSettingsBytes,
} from "./function-settings.ts"
import type {
  FunctionSettings,
  FunctionSettingsPatch,
} from "./function-settings.ts"
import {
  decodeDisplaySettings,
  editDisplaySettingsBytes,
} from "./display-settings.ts"
import type {
  DisplaySettings,
  DisplaySettingsPatch,
} from "./display-settings.ts"
import {
  decodeSoundSettings,
  editSoundSettingsBytes,
} from "./sound-settings.ts"
import type { SoundSettings, SoundSettingsPatch } from "./sound-settings.ts"
import {
  decodeKeyboardSettings,
  editKeyboardSettingsBytes,
} from "./keyboard-settings.ts"
import type {
  KeyboardSettings,
  KeyboardSettingsPatch,
} from "./keyboard-settings.ts"

const CODEPLUG_SIZE = 0x19000

class Codeplug {
  readonly #bytes: Uint8Array
  readonly #channels: readonly Channel[]
  readonly #vfoChannels: readonly SpecialChannel[]
  readonly #callChannels: readonly SpecialChannel[]
  readonly #zones: readonly Zone[]
  readonly #scanLists: readonly ScanList[]
  readonly #bandZoneSelections: BandZoneSelections
  readonly #bandScanListSelections: BandScanListSelections
  readonly #functionSettings: FunctionSettings
  readonly #displaySettings: DisplaySettings
  readonly #soundSettings: SoundSettings
  readonly #keyboardSettings: KeyboardSettings

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
    this.#bandScanListSelections = decodeBandScanListSelections(this.#bytes)
    this.#functionSettings = decodeFunctionSettings(this.#bytes)
    this.#displaySettings = decodeDisplaySettings(this.#bytes)
    this.#soundSettings = decodeSoundSettings(this.#bytes)
    this.#keyboardSettings = decodeKeyboardSettings(this.#bytes)
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

  getBandScanListSelections() {
    return this.#bandScanListSelections
  }

  getFunctionSettings() {
    return this.#functionSettings
  }

  getDisplaySettings() {
    return this.#displaySettings
  }

  getSoundSettings() {
    return this.#soundSettings
  }

  getKeyboardSettings() {
    return this.#keyboardSettings
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

  editBandScanListSelection(
    band: RadioBand,
    scanListNumbers: readonly number[]
  ) {
    return new Codeplug(
      editBandScanListSelectionBytes(this.#bytes, band, scanListNumbers)
    )
  }

  editScanList(number: number, patch: ChannelCollectionPatch) {
    return new Codeplug(editScanListBytes(this.#bytes, number, patch))
  }

  editFunctionSettings(patch: FunctionSettingsPatch) {
    return new Codeplug(editFunctionSettingsBytes(this.#bytes, patch))
  }

  editDisplaySettings(patch: DisplaySettingsPatch) {
    return new Codeplug(editDisplaySettingsBytes(this.#bytes, patch))
  }

  editSoundSettings(patch: SoundSettingsPatch) {
    return new Codeplug(editSoundSettingsBytes(this.#bytes, patch))
  }

  editKeyboardSettings(patch: KeyboardSettingsPatch) {
    return new Codeplug(editKeyboardSettingsBytes(this.#bytes, patch))
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
export type { BandScanListSelections } from "./band-scan-list-selection.ts"
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
export {
  FUNCTION_SETTING_OPTIONS,
  isUnknownSettingValue,
} from "./function-settings.ts"
export type {
  FunctionSettings,
  FunctionSettingsPatch,
  UnknownSettingValue,
} from "./function-settings.ts"
export {
  DISPLAY_SETTING_OPTIONS,
  POWER_ON_MESSAGE_BYTES,
  POWER_ON_MESSAGE_CHARACTERS,
} from "./display-settings.ts"
export type {
  DisplaySettings,
  DisplaySettingsPatch,
} from "./display-settings.ts"
export { SOUND_SETTING_OPTIONS } from "./sound-settings.ts"
export type { SoundSettings, SoundSettingsPatch } from "./sound-settings.ts"
export { KEYBOARD_SETTING_OPTIONS } from "./keyboard-settings.ts"
export type {
  KeyboardSettings,
  KeyboardSettingsPatch,
  LockDelaySeconds,
  LockType,
  LongPressAction,
  ShortPressAction,
} from "./keyboard-settings.ts"
