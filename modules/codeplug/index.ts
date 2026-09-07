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
import { decodeGpsSettings, editGpsSettingsBytes } from "./gps-settings.ts"
import type { GpsSettings, GpsSettingsPatch } from "./gps-settings.ts"
import {
  decodeBluetoothSettings,
  editBluetoothSettingsBytes,
} from "./bluetooth-settings.ts"
import type {
  BluetoothSettings,
  BluetoothSettingsPatch,
} from "./bluetooth-settings.ts"
import {
  decodeSpectrumSettings,
  editSpectrumSettingsBytes,
} from "./spectrum-settings.ts"
import type {
  SpectrumSettings,
  SpectrumSettingsPatch,
} from "./spectrum-settings.ts"
import {
  decodeDtmfSettings,
  decodeFiveToneSettings,
  decodeTwoToneSettings,
  editDtmfSettingsBytes,
  editFiveToneSettingsBytes,
  editTwoToneSettingsBytes,
} from "./signal-system.ts"
import type {
  DtmfSettings,
  DtmfSettingsPatch,
  FiveToneSettings,
  FiveToneSettingsPatch,
  TwoToneSettings,
  TwoToneSettingsPatch,
} from "./signal-system.ts"
import {
  decodeFmBroadcast,
  editFmBroadcastChannelBytes,
  editFmBroadcastSettingsBytes,
} from "./fm-broadcast.ts"
import type {
  FmBroadcastChannel,
  FmBroadcastChannelPatch,
  FmBroadcastSettings,
  FmBroadcastSettingsPatch,
} from "./fm-broadcast.ts"
import {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_LAYOUT_LEGACY,
  getCodeplugLayout,
  getCodeplugMemoryMap,
} from "./layout.ts"
import type {
  CodeplugLayout,
  CodeplugLayoutId,
  CodeplugMemoryMap,
} from "./layout.ts"
import { materializeCodeplugWriteImage } from "./write-image.ts"

const CODEPLUG_SIZE = CODEPLUG_LAYOUT_3_07_23.byteLength

class Codeplug {
  readonly #bytes: Uint8Array
  readonly #layout: CodeplugLayout
  readonly #memoryMap: CodeplugMemoryMap
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
  readonly #gpsSettings: GpsSettings
  readonly #bluetoothSettings: BluetoothSettings
  readonly #spectrumSettings: SpectrumSettings
  readonly #dtmfSettings: DtmfSettings
  readonly #twoToneSettings: TwoToneSettings
  readonly #fiveToneSettings: FiveToneSettings
  readonly #fmBroadcastChannels: readonly FmBroadcastChannel[]
  readonly #fmBroadcastSettings: FmBroadcastSettings

  constructor(
    bytes: Uint8Array,
    layoutId: CodeplugLayoutId = CODEPLUG_LAYOUT_3_07_23.id
  ) {
    const layout = getCodeplugLayout(layoutId)
    if (bytes.byteLength !== CODEPLUG_SIZE) {
      throw new RangeError(
        `A Codeplug must contain exactly ${CODEPLUG_SIZE} bytes; received ${bytes.byteLength}`
      )
    }

    this.#bytes = bytes.slice()
    this.#layout = layout
    this.#memoryMap = getCodeplugMemoryMap(layout.id)
    this.#channels = decodeChannels(this.#bytes, this.#memoryMap)
    this.#vfoChannels = decodeVfoChannels(this.#bytes)
    this.#callChannels = decodeCallChannels(this.#bytes)
    this.#zones = decodeZones(this.#bytes, this.#memoryMap)
    this.#scanLists = decodeScanLists(this.#bytes, this.#memoryMap)
    this.#bandZoneSelections = decodeBandZoneSelections(
      this.#bytes,
      this.#memoryMap
    )
    this.#bandScanListSelections = decodeBandScanListSelections(
      this.#bytes,
      this.#memoryMap
    )
    this.#functionSettings = decodeFunctionSettings(this.#bytes)
    this.#displaySettings = decodeDisplaySettings(this.#bytes)
    this.#soundSettings = decodeSoundSettings(this.#bytes)
    this.#keyboardSettings = decodeKeyboardSettings(this.#bytes)
    this.#menuVisibility = decodeMenuVisibility(this.#bytes)
    this.#vfoScanEdges = decodeVfoScanEdges(this.#bytes, this.#memoryMap)
    this.#vfoScanEdgeSelections = decodeVfoScanEdgeSelections(
      this.#bytes,
      this.#memoryMap
    )
    this.#aprsSettings = decodeAprsSettings(this.#bytes)
    this.#gpsSettings = decodeGpsSettings(this.#bytes)
    this.#bluetoothSettings = decodeBluetoothSettings(this.#bytes)
    this.#spectrumSettings = decodeSpectrumSettings(this.#bytes)
    this.#dtmfSettings = decodeDtmfSettings(this.#bytes)
    this.#twoToneSettings = decodeTwoToneSettings(this.#bytes)
    this.#fiveToneSettings = decodeFiveToneSettings(this.#bytes)
    const fmBroadcast = decodeFmBroadcast(this.#bytes)
    this.#fmBroadcastChannels = fmBroadcast.channels
    this.#fmBroadcastSettings = fmBroadcast.settings
  }

  get byteLength() {
    return this.#bytes.byteLength
  }

  get layoutId() {
    return this.#layout.id
  }

  #withBytes(bytes: Uint8Array) {
    return new Codeplug(bytes, this.#layout.id)
  }

  toBytes() {
    return this.#bytes.slice()
  }

  materializeWriteImage(layoutId: CodeplugLayoutId) {
    if (layoutId !== this.#layout.id) {
      throw new RangeError(
        `Codeplug layout ${this.#layout.id} cannot be written as ${layoutId}`
      )
    }
    return materializeCodeplugWriteImage(this.#bytes, layoutId)
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

  getGpsSettings() {
    return this.#gpsSettings
  }

  getBluetoothSettings() {
    return this.#bluetoothSettings
  }

  getSpectrumSettings() {
    return this.#spectrumSettings
  }

  getDtmfSettings() {
    return this.#dtmfSettings
  }

  getTwoToneSettings() {
    return this.#twoToneSettings
  }

  getFiveToneSettings() {
    return this.#fiveToneSettings
  }

  getFmBroadcastChannels() {
    return this.#fmBroadcastChannels
  }

  getFmBroadcastSettings() {
    return this.#fmBroadcastSettings
  }

  moveMemoryChannel(fromNumber: number, toNumber: number) {
    return this.#withBytes(
      moveMemoryChannelBytes(this.#bytes, fromNumber, toNumber)
    )
  }

  editMemoryChannel(number: number, patch: MemoryChannelPatch) {
    return this.#withBytes(editMemoryChannelBytes(this.#bytes, number, patch))
  }

  editVfoChannel(slot: "A" | "B", patch: VfoChannelPatch) {
    return this.#withBytes(editVfoChannelBytes(this.#bytes, slot, patch))
  }

  editCallChannel(slot: 1 | 2, patch: CallChannelPatch) {
    return this.#withBytes(editCallChannelBytes(this.#bytes, slot, patch))
  }

  editZone(number: number, patch: ChannelCollectionPatch) {
    return this.#withBytes(
      editZoneBytes(this.#bytes, number, patch, this.#memoryMap)
    )
  }

  editBandZoneSelection(band: RadioBand, zoneNumbers: readonly number[]) {
    return this.#withBytes(
      editBandZoneSelectionBytes(
        this.#bytes,
        band,
        zoneNumbers,
        this.#memoryMap
      )
    )
  }

  editBandScanListSelection(
    band: RadioBand,
    scanListNumbers: readonly number[]
  ) {
    return this.#withBytes(
      editBandScanListSelectionBytes(
        this.#bytes,
        band,
        scanListNumbers,
        this.#memoryMap
      )
    )
  }

  editVfoScanEdge(number: number, patch: VfoScanEdgePatch) {
    return this.#withBytes(
      editVfoScanEdgeBytes(this.#bytes, number, patch, this.#memoryMap)
    )
  }

  editVfoScanEdgeSelection(band: RadioBand, numbers: readonly number[]) {
    return this.#withBytes(
      editVfoScanEdgeSelectionBytes(this.#bytes, band, numbers, this.#memoryMap)
    )
  }

  editScanList(number: number, patch: ChannelCollectionPatch) {
    return this.#withBytes(
      editScanListBytes(this.#bytes, number, patch, this.#memoryMap)
    )
  }

  editFunctionSettings(patch: FunctionSettingsPatch) {
    return this.#withBytes(editFunctionSettingsBytes(this.#bytes, patch))
  }

  editDisplaySettings(patch: DisplaySettingsPatch) {
    return this.#withBytes(editDisplaySettingsBytes(this.#bytes, patch))
  }

  editSoundSettings(patch: SoundSettingsPatch) {
    return this.#withBytes(editSoundSettingsBytes(this.#bytes, patch))
  }

  editKeyboardSettings(patch: KeyboardSettingsPatch) {
    return this.#withBytes(editKeyboardSettingsBytes(this.#bytes, patch))
  }

  setMenuVisibility(id: MenuVisibilityItemId, visible: boolean) {
    return this.#withBytes(editMenuVisibilityBytes(this.#bytes, id, visible))
  }

  editAprsSettings(patch: AprsSettingsPatch) {
    return this.#withBytes(editAprsSettingsBytes(this.#bytes, patch))
  }

  editGpsSettings(patch: GpsSettingsPatch) {
    return this.#withBytes(editGpsSettingsBytes(this.#bytes, patch))
  }

  editBluetoothSettings(patch: BluetoothSettingsPatch) {
    return this.#withBytes(editBluetoothSettingsBytes(this.#bytes, patch))
  }

  editSpectrumSettings(patch: SpectrumSettingsPatch) {
    return this.#withBytes(editSpectrumSettingsBytes(this.#bytes, patch))
  }

  editDtmfSettings(patch: DtmfSettingsPatch) {
    return this.#withBytes(editDtmfSettingsBytes(this.#bytes, patch))
  }

  editTwoToneSettings(patch: TwoToneSettingsPatch) {
    return this.#withBytes(editTwoToneSettingsBytes(this.#bytes, patch))
  }

  editFiveToneSettings(patch: FiveToneSettingsPatch) {
    return this.#withBytes(editFiveToneSettingsBytes(this.#bytes, patch))
  }

  editFmBroadcastChannel(number: number, patch: FmBroadcastChannelPatch) {
    return this.#withBytes(
      editFmBroadcastChannelBytes(this.#bytes, number, patch)
    )
  }

  editFmBroadcastSettings(patch: FmBroadcastSettingsPatch) {
    return this.#withBytes(editFmBroadcastSettingsBytes(this.#bytes, patch))
  }

  editChannelMemberships(number: number, patch: ChannelMembershipPatch) {
    return this.#withBytes(
      editChannelMembershipsBytes(this.#bytes, number, patch, this.#memoryMap)
    )
  }

  validateMembershipConsistency(): readonly MembershipConsistencyIssue[] {
    return validateMembershipConsistency(this.#bytes, this.#memoryMap)
  }

  addMemoryChannel() {
    return this.#withBytes(addDefaultMemoryChannelBytes(this.#bytes))
  }

  deleteMemoryChannel(number: number) {
    return this.#withBytes(deleteMemoryChannelBytes(this.#bytes, number))
  }

  duplicateMemoryChannel(number: number) {
    return this.#withBytes(
      duplicateMemoryChannelBytes(this.#bytes, number, this.#memoryMap)
    )
  }

  equals(other: Codeplug) {
    const otherBytes = other.#bytes

    return this.#bytes.every((byte, index) => byte === otherBytes[index])
  }
}

function createCodeplug(
  bytes: Uint8Array,
  layoutId: CodeplugLayoutId = CODEPLUG_LAYOUT_3_07_23.id
) {
  return new Codeplug(bytes, layoutId)
}

export {
  CODEPLUG_LAYOUT_3_07_23,
  CODEPLUG_LAYOUT_LEGACY,
  getCodeplugLayout,
  getCodeplugMemoryMap,
  CODEPLUG_SIZE,
  CTCSS_FREQUENCIES_HZ,
  DCS_CODES,
  Codeplug,
  createCodeplug,
}
export type { CodeplugLayout, CodeplugLayoutId } from "./layout.ts"
export { PfFileError, parsePfFile, serializePfFile } from "./pf-file.ts"
export type { ParsedPfFile, PfGeneration } from "./pf-file.ts"
export type {
  CodeplugWriteDerivedChange,
  CodeplugWriteImage,
} from "./write-image.ts"
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
export { resolveChannelFrequencyPatch } from "./channel-edit.ts"
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
  GPS_SETTING_OPTIONS,
  GPS_SETTINGS_ADDRESS,
  GPS_SETTINGS_OFFSET,
} from "./gps-settings.ts"
export type {
  GpsConstellation,
  GpsSettings,
  GpsSettingsPatch,
  GpsTimezoneOffsetMinutes,
} from "./gps-settings.ts"
export {
  BLUETOOTH_SETTING_OPTIONS,
  BLUETOOTH_HOLD_TIME_ADDRESS,
  BLUETOOTH_HOLD_TIME_OFFSET,
  BLUETOOTH_SETTINGS_ADDRESS,
  BLUETOOTH_SETTINGS_OFFSET,
} from "./bluetooth-settings.ts"
export type {
  BluetoothGainLevel,
  BluetoothHoldTime,
  BluetoothRole,
  BluetoothSettings,
  BluetoothSettingsPatch,
} from "./bluetooth-settings.ts"
export {
  MAX_FREQUENCY_HZ as SPECTRUM_MAX_FREQUENCY_HZ,
  MIN_FREQUENCY_HZ as SPECTRUM_MIN_FREQUENCY_HZ,
  SPECTRUM_SETTING_OPTIONS,
  SPECTRUM_SETTINGS_ADDRESS,
  SPECTRUM_SETTINGS_OFFSET,
  createSpectrumModeChangePatch,
} from "./spectrum-settings.ts"
export type {
  SpectrumMode,
  SpectrumModulation,
  SpectrumScanSpeed,
  SpectrumSettings,
  SpectrumSettingsPatch,
  SpectrumStepKHz,
} from "./spectrum-settings.ts"
export {
  DTMF_SETTINGS_ADDRESS,
  DTMF_SETTINGS_OFFSET,
  FIVE_TONE_SETTINGS_ADDRESS,
  FIVE_TONE_SETTINGS_OFFSET,
  SIGNAL_SYSTEM_OPTIONS,
  TWO_TONE_SETTINGS_ADDRESS,
  TWO_TONE_SETTINGS_OFFSET,
} from "./signal-system.ts"
export type {
  AniDisplayType,
  DialerType,
  DtmfPttId,
  DtmfSettings,
  DtmfSettingsPatch,
  DtmfSymbol,
  FiveToneEncodeRecord,
  FiveToneInformationCode,
  FiveToneInformationFunction,
  FiveTonePauseCode,
  FiveTonePttId,
  FiveToneSettings,
  FiveToneSettingsPatch,
  FiveToneStandard,
  PttIdType,
  ResponseType,
  TwoToneDecodeRecord,
  TwoToneEncodeRecord,
  TwoToneSettings,
  TwoToneSettingsPatch,
} from "./signal-system.ts"
export {
  FM_BROADCAST_CHANNEL_COUNT,
  FM_BROADCAST_CHANNEL_NAME_SIZE,
  FM_BROADCAST_CHANNEL_RECORD_SIZE,
  FM_BROADCAST_CHANNELS_ADDRESS,
  FM_BROADCAST_CHANNELS_OFFSET,
  FM_BROADCAST_DEFAULT_FREQUENCY_HZ,
  FM_BROADCAST_ENABLED_ADDRESS,
  FM_BROADCAST_ENABLED_OFFSET,
  FM_BROADCAST_FREQUENCY_STEP_HZ,
  FM_BROADCAST_MAX_FREQUENCY_HZ,
  FM_BROADCAST_MIN_FREQUENCY_HZ,
  FM_BROADCAST_MODE_ADDRESS,
  FM_BROADCAST_MODE_OFFSET,
  FM_BROADCAST_SETTING_OPTIONS,
  FM_BROADCAST_VALIDITY_ADDRESS,
  FM_BROADCAST_VALIDITY_OFFSET,
  FM_BROADCAST_VFO_FREQUENCY_ADDRESS,
  FM_BROADCAST_VFO_FREQUENCY_OFFSET,
} from "./fm-broadcast.ts"
export type {
  FmBroadcast,
  FmBroadcastChannel,
  FmBroadcastChannelPatch,
  FmBroadcastMode,
  FmBroadcastSettings,
  FmBroadcastSettingsPatch,
} from "./fm-broadcast.ts"
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
