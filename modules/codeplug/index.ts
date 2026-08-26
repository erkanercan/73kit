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
  duplicateMemoryChannelBytes,
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
import {
  decodeMenuVisibility,
  editMenuVisibilityBytes,
} from "./menu-visibility.ts"
import type { MenuVisibility, MenuVisibilityItemId } from "./menu-visibility.ts"
import {
  decodeVfoScanEdgeSelections,
  decodeVfoScanEdges,
  editVfoScanEdgeBytes,
  editVfoScanEdgeSelectionBytes,
} from "./vfo-scan-edge.ts"
import type {
  VfoScanEdge,
  VfoScanEdgePatch,
  VfoScanEdgeSelections,
} from "./vfo-scan-edge.ts"
import { decodeAprsSettings, editAprsSettingsBytes } from "./aprs-settings.ts"
import type { AprsSettings, AprsSettingsPatch } from "./aprs-settings.ts"

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
  readonly #menuVisibility: MenuVisibility
  readonly #vfoScanEdges: readonly VfoScanEdge[]
  readonly #vfoScanEdgeSelections: VfoScanEdgeSelections
  readonly #aprsSettings: AprsSettings

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
    this.#menuVisibility = decodeMenuVisibility(this.#bytes)
    this.#vfoScanEdges = decodeVfoScanEdges(this.#bytes)
    this.#vfoScanEdgeSelections = decodeVfoScanEdgeSelections(this.#bytes)
    this.#aprsSettings = decodeAprsSettings(this.#bytes)
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

  getMenuVisibility() {
    return this.#menuVisibility
  }

  getVfoScanEdges() {
    return this.#vfoScanEdges
  }

  getVfoScanEdgeSelections() {
    return this.#vfoScanEdgeSelections
  }

  getAprsSettings() {
    return this.#aprsSettings
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

  editVfoScanEdge(number: number, patch: VfoScanEdgePatch) {
    return new Codeplug(editVfoScanEdgeBytes(this.#bytes, number, patch))
  }

  editVfoScanEdgeSelection(band: RadioBand, numbers: readonly number[]) {
    return new Codeplug(
      editVfoScanEdgeSelectionBytes(this.#bytes, band, numbers)
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

  setMenuVisibility(id: MenuVisibilityItemId, visible: boolean) {
    return new Codeplug(editMenuVisibilityBytes(this.#bytes, id, visible))
  }

  editAprsSettings(patch: AprsSettingsPatch) {
    return new Codeplug(editAprsSettingsBytes(this.#bytes, patch))
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

  duplicateMemoryChannel(number: number) {
    return new Codeplug(duplicateMemoryChannelBytes(this.#bytes, number))
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
export type { ChannelModulation, ChannelStepKHz } from "./channel.ts"
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
export { MENU_VISIBILITY_ITEMS } from "./menu-visibility-items.ts"
export type { MenuVisibilityItem } from "./menu-visibility-items.ts"
export {
  MENU_VISIBILITY_ADDRESS,
  MENU_VISIBILITY_ASSIGNED_BIT_COUNT,
} from "./menu-visibility.ts"
export type { MenuVisibility, MenuVisibilityItemId } from "./menu-visibility.ts"
export {
  MAX_FREQUENCY_HZ as VFO_SCAN_EDGE_MAX_FREQUENCY_HZ,
  MIN_FREQUENCY_HZ as VFO_SCAN_EDGE_MIN_FREQUENCY_HZ,
  VFO_SCAN_EDGE_MODES,
  VFO_SCAN_EDGE_STEPS,
} from "./vfo-scan-edge.ts"
export type {
  VfoScanEdge,
  VfoScanEdgePatch,
  VfoScanEdgeSelections,
} from "./vfo-scan-edge.ts"
export {
  APRS_REPORT_KINDS,
  APRS_SETTING_OPTIONS,
  APRS_SETTINGS_ADDRESS,
  APRS_SETTINGS_OFFSET,
  APRS_SETTINGS_SIZE,
} from "./aprs-settings.ts"
export {
  APRS_SYMBOL_CODES,
  aprsSymbolCode,
  aprsSymbolSpritePosition,
} from "./aprs-symbols.ts"
export type {
  AprsAltitudeUnit,
  AprsBandwidth,
  AprsBeaconType,
  AprsDigipeaterEntry,
  AprsFixedPosition,
  AprsManualBeaconBand,
  AprsManualBeaconMode,
  AprsReportKind,
  AprsReportSettings,
  AprsSettings,
  AprsSettingsPatch,
  AprsSymbolTable,
  AprsTncFormat,
  AprsTncInterfaceSettings,
  AprsTncOutput,
  AprsToneType,
  AprsTransmitChannel,
  AprsTransmitPower,
} from "./aprs-settings.ts"
