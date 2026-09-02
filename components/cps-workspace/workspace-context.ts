import type { RadioCapability } from "@/adapters/web-serial/index"
import type {
  BackupHistoryEntry,
  RadioWriteOperationSnapshot,
  RadioWriteReviewItem,
} from "@/modules/cps-workspace/index"
import type { WorkspaceChange } from "@/modules/cps-workspace/change-set"
import type { CpsFileManifest } from "@/modules/cps-workspace/cps-file"
import type { ActiveCodeplugDocument } from "@/modules/cps-workspace/codeplug-document"
import type {
  AprsSettingsPatch,
  BluetoothSettingsPatch,
  CallChannelPatch,
  ChannelCollectionPatch,
  ChannelMembershipPatch,
  DisplaySettingsPatch,
  DtmfSettingsPatch,
  FiveToneSettingsPatch,
  FmBroadcastChannelPatch,
  FmBroadcastSettingsPatch,
  FunctionSettingsPatch,
  GpsSettingsPatch,
  KeyboardSettingsPatch,
  MemoryChannelPatch,
  MenuVisibilityItemId,
  RadioBand,
  SoundSettingsPatch,
  SpectrumSettingsPatch,
  TwoToneSettingsPatch,
  VfoChannelPatch,
  VfoScanEdgePatch,
} from "@/modules/codeplug/index"
import type {
  SourceRadio,
  UnsupportedFirmwareReason,
} from "@/modules/uvl15w-radio/index"

type WorkspacePhase = "idle" | "connecting" | "reading" | "ready"

type ImportedRestoreResult =
  | { readonly status: "already-current" }
  | { readonly status: "restore-ready"; readonly changedByteCount: number }

type WorkspaceError =
  | { readonly key: WorkspaceErrorKey }
  | {
      readonly kind: "unsupportedFirmware"
      readonly reason: UnsupportedFirmwareReason
      readonly detectedVersion: string
      readonly validatedVersion: string
    }
  | { readonly message: string }

type WorkspaceErrorKey =
  | "noRadioSelected"
  | "serialPermissionDenied"
  | "serialPortSelectionRequired"
  | "serialPortUnavailable"
  | "serialConnectionClosed"
  | "serialStreamsUnavailable"
  | "webSerialUnavailable"
  | "radioAlreadyConnected"
  | "radioNotConnected"
  | "radioOperationInProgress"
  | "radioConnectionClosed"
  | "radioResponseTimeout"
  | "radioProtocolError"
  | "incompatibleRadio"
  | "readPasswordRequired"
  | "writePasswordRequired"
  | "unexpectedRadioResponse"
  | "backupHistorySaveFailed"
  | "unknownRadioError"

interface CpsWorkspaceContextValue {
  readonly phase: WorkspacePhase
  readonly sourceRadio: SourceRadio | null
  readonly completedRead: ActiveCodeplugDocument | null
  readonly progress: number
  readonly error: WorkspaceError | null
  readonly capability: RadioCapability | "checking"
  readonly busy: boolean
  readonly changes: readonly WorkspaceChange[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly radioWriteReleased: boolean
  readonly radioWriteSnapshot: RadioWriteOperationSnapshot | null
  readonly radioWriteReview: readonly RadioWriteReviewItem[]
  readonly importedCpsFile: CpsFileManifest | null
  readonly importedRestoreResult: ImportedRestoreResult | null
  claimExternalRadioOperation(): boolean
  releaseExternalRadioOperation(): void
  readRadio(): Promise<void>
  prepareRadioWrite(): Promise<void>
  confirmRadioWrite(): Promise<void>
  discardRadioWriteStatus(): Promise<void>
  downloadRadioOperationReport(): void
  downloadRawBackup(): void
  downloadPfFile(): void
  downloadCpsFile(): Promise<void>
  openCpsFile(file: File): Promise<void>
  openRawCodeplug(file: File): Promise<void>
  prepareImportedRestore(): Promise<void>
  prepareBackupRestore(entry: BackupHistoryEntry): Promise<void>
  addMemoryChannel(): void
  duplicateMemoryChannel(number: number): void
  deleteMemoryChannel(number: number): void
  editMemoryChannel(number: number, patch: MemoryChannelPatch): void
  editChannelMemberships(number: number, patch: ChannelMembershipPatch): void
  editVfoChannel(slot: "A" | "B", patch: VfoChannelPatch): void
  editCallChannel(slot: 1 | 2, patch: CallChannelPatch): void
  editZone(number: number, patch: ChannelCollectionPatch): void
  editScanList(number: number, patch: ChannelCollectionPatch): void
  editBandZoneSelection(band: RadioBand, zoneNumbers: readonly number[]): void
  editBandScanListSelection(
    band: RadioBand,
    scanListNumbers: readonly number[]
  ): void
  editVfoScanEdge(number: number, patch: VfoScanEdgePatch): void
  editVfoScanEdgeSelection(band: RadioBand, numbers: readonly number[]): void
  editFunctionSettings(patch: FunctionSettingsPatch): void
  editDisplaySettings(patch: DisplaySettingsPatch): void
  editSoundSettings(patch: SoundSettingsPatch): void
  editKeyboardSettings(patch: KeyboardSettingsPatch): void
  editAprsSettings(patch: AprsSettingsPatch): void
  editGpsSettings(patch: GpsSettingsPatch): void
  editBluetoothSettings(patch: BluetoothSettingsPatch): void
  editSpectrumSettings(patch: SpectrumSettingsPatch): void
  editDtmfSettings(patch: DtmfSettingsPatch): void
  editTwoToneSettings(patch: TwoToneSettingsPatch): void
  editFiveToneSettings(patch: FiveToneSettingsPatch): void
  editFmBroadcastChannel(number: number, patch: FmBroadcastChannelPatch): void
  editFmBroadcastSettings(patch: FmBroadcastSettingsPatch): void
  setMenuVisibility(id: MenuVisibilityItemId, visible: boolean): void
  moveMemoryChannel(fromNumber: number, toNumber: number): void
  resetWorkingCodeplug(): void
  undoWorkingCodeplug(): void
  redoWorkingCodeplug(): void
}

export type {
  CpsWorkspaceContextValue,
  ImportedRestoreResult,
  WorkspaceError,
  WorkspaceErrorKey,
  WorkspacePhase,
}
