# 73Kit Radio Programming

This context covers 73Kit and the safe inspection and management of a supported Radio's persistent programmable configuration.

## Language

**73Kit**:
The local-first amateur-radio toolkit that contains Radio CPS and other independent operator tools.
_Avoid_: CPS, UVL-15W app

**73Kit Tool**:
A top-level operator capability within 73Kit, such as Radio CPS, whose domain may or may not require a selected Radio.
_Avoid_: Page, module, feature card

**Radio Model**:
A canonical supported Radio product identity that owns aliases, capabilities, protocol support, and firmware support profiles. Marketing aliases that use the same hardware and protocol remain one Radio Model.
_Avoid_: Route, driver, connected Radio

**Radio Model Alias**:
An alternate manufacturer or marketing name for the same Radio Model, not a separate compatibility or storage identity.
_Avoid_: Separate Radio Model, clone

**Firmware Release**:
The exact firmware version reported by a Radio. A release is known independently of whether 73Kit has validated its Codeplug layout.
_Avoid_: Support Profile, selected firmware

**Support Profile**:
The evidence-backed compatibility contract joining one Radio Model, one exact Firmware Release, one Codeplug Layout, and the operations 73Kit may safely perform.
_Avoid_: Preset, closest version, firmware choice

**Codeplug Layout**:
The complete interpretation contract for one Codeplug binary organization, including byte length, addresses, encodings, protected values, and Radio-managed regions.
_Avoid_: File size, firmware guess, schema

**Radio**:
A physical supported handheld transceiver whose programmable configuration can be inspected or changed.
_Avoid_: Device, unit

**CPS**:
The Radio CPS tool through which a user selects a Radio Model and reads, backs up, edits, and writes a Radio's programmable configuration.
_Avoid_: App, host, programming tool

**Codeplug**:
A complete snapshot of a radio's persistent programmable configuration, including both understood settings and opaque values that must be preserved. A codeplug can remain available after the source radio is disconnected, but compatibility with another radio must not be assumed.
_Avoid_: Config, configuration file, binary image

**Codeplug Backup**:
An immutable, unchanged Codeplug retained after a successful Radio Read, completed Radio Write, or import. Editing and later writes never alter an existing backup.
_Avoid_: Export, copy

**Working Codeplug**:
An editable Codeplug derived from a Baseline Backup or import. It holds the user's intended configuration without altering its source.
_Avoid_: Draft, working copy, edited backup

**Baseline Backup**:
The Codeplug Backup from which a Working Codeplug's Change Set is measured. A completed Radio Write creates a new Baseline Backup from the intended image accepted by the Radio without replacing earlier backups.
_Avoid_: Current version, latest backup, source file

**Backup History**:
The ordered collection of immutable Codeplug Backups retained for a Source Radio across reads and completed writes.
_Avoid_: Versions, autosaves, undo history

**Change Set**:
The complete, reviewable set of intended differences between a Baseline Backup and its Working Codeplug. Values outside the Change Set, including opaque values, remain unchanged; an empty Change Set cannot be written.
_Avoid_: Diff, dirty state, modified bytes

**Radio Read**:
The complete, validated retrieval of a Radio's Codeplug. A successful Radio Read creates both an immutable Baseline Backup and a separate Working Codeplug; an incomplete or invalid read creates neither.
_Avoid_: Download, sync, partial read

**Source Radio**:
The specific Radio from which a Codeplug was read, identified independently of the Codeplug itself. The association survives disconnection and a CPS Export, but is absent from a Raw Backup Export.
_Avoid_: Connected device, original unit

**Radio Write**:
The complete application of a Working Codeplug to its Source Radio, ending when the Radio confirms completion and restarts. It does not include an automatic Radio Read after restart; a different Radio is never an ordinary write target, even when it is the same model.
_Avoid_: Upload, sync, cross-radio write

**Write Outcome Unknown**:
The result of a Radio Write interrupted after changes may have begun but before the Radio confirms completion. The resulting Codeplug may be incomplete, so the operation is not reported as either success or ordinary failure.
_Avoid_: Write failed, partial success, probably written

**Firmware Package**:
An official TYT `.Fir` file containing a complete MCU firmware update for a compatible Radio. It is not a Codeplug and must pass package integrity and Radio compatibility checks before use.
_Avoid_: Firmware image, Codeplug, binary

**Flash Data Package**:
An official TYT `.DAT` address-record file containing Radio resources such as Language Resources, Image Resources, or a combined resource image. It is not a Codeplug and its absolute addresses are authorized only by the Resource Flash workflow.
_Avoid_: Codeplug, config file, firmware

**Firmware Update**:
The validated application of a Firmware Package through the Radio's update-mode MCU protocol, followed by reboot and installed-version verification.
_Avoid_: Radio Write, upload, firmware sync

**Resource Flash**:
The validated application of a Flash Data Package through the Radio's update-mode resource protocol. It is separate from both a Radio Write and a Firmware Update.
_Avoid_: Radio Write, data upload, firmware flash

**Language Resource Write**:
A Resource Flash that installs the Radio UI strings contained in a Language Flash Data Package. It does not select which installed System Language the Radio uses.
_Avoid_: System Language selection, language setting

**System Language**:
A Codeplug setting that selects one of the Language Resources already installed on the Radio. Changing it does not install or upgrade Language Resources.
_Avoid_: Language Resource Write, language update

**Update Outcome Unknown**:
The result of a Firmware Update or Resource Flash interrupted after writing may have begun, or whose post-reboot result cannot be verified. It requires updater-specific recovery guidance and must not be reported as success or ordinary failure.
_Avoid_: Update failed, partial success, probably flashed

**Raw Backup Export**:
A portable copy containing only the exact Codeplug, without Source Radio identity. Importing it creates an Unbound Codeplug.
_Avoid_: CPS Export, project file

**CPS Export**:
A portable Codeplug package that preserves its Source Radio identity and the information needed to interpret it. Importing it preserves the Source Radio binding.
_Avoid_: Raw Backup Export, config file

**CPS File**:
A `.73kcps` package containing Radio Model and Support Profile identity, an immutable Baseline Backup, an editable Working Codeplug, Source Radio identity, Codeplug Layout metadata, and integrity hashes. It may be reopened without a Radio, but its Source Radio binding must be verified by a fresh Radio Read before restore.
_Avoid_: Project file, Raw Backup Export, firmware backup

**Radio Restore**:
The deliberate application of a desired Codeplug from a saved CPS File or Backup History entry to its verified Source Radio after a fresh Radio Read creates a recovery backup and a Restore Plan.
_Avoid_: Import, Radio Write, rollback

**Restore Plan**:
The reviewable difference from the freshly read Radio Codeplug to a compatible desired Codeplug from a CPS File or Backup History entry. It is prepared only after Source Radio and layout verification.
_Avoid_: Change Set, file diff

**Codeplug Migration**:
The transfer of understood settings from a CPS File onto a freshly read Codeplug with a different validated layout. Opaque and reserved values come from the current Radio, and migration is available only through an explicit adapter between the two layouts.
_Avoid_: Restore, conversion, automatic upgrade

**Unbound Codeplug**:
A Codeplug whose Source Radio cannot be proven, such as one imported from a Raw Backup Export. It may be inspected and edited but cannot be used for a Radio Write.
_Avoid_: Anonymous Codeplug, generic Codeplug

### Radio operation

**Channel**:
A user-programmable operating preset saved in the radio's numbered channel list.
_Avoid_: Memory Channel, channel record

**VFO**:
One of the radio's two directly tunable operating configurations, separate from the numbered channel list.
_Avoid_: VFO Channel, frequency channel

**Call Channel**:
One of the radio's dedicated quick-access operating presets, separate from the numbered channel list.
_Avoid_: CALL record, call preset

**Weather Channel**:
One of the radio's fixed weather-service presets rather than a user-programmable channel.
_Avoid_: WX record, WX Channel

**Temporary Channel**:
An internal snapshot of a VFO's working state that is not exposed as an independent user channel.
_Avoid_: Temp Channel, user channel

**Zone**:
An ordered, named collection used to organize Channels for normal selection. A Channel may belong to multiple Zones.
_Avoid_: Channel group, folder

**Scan List**:
An ordered, named collection of Channels that participate in scanning. A Channel may belong to multiple Scan Lists independently of its Zone memberships.
_Avoid_: Scan group, Zone
