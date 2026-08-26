# Bluetooth Settings Research

Date: 2026-08-27

## Decision

A standalone Bluetooth page can be implemented now with the same desktop
Working Codeplug layout and lifecycle as GPS, but its safely editable scope is
limited to seven persistent settings supported by the reviewed storage
reference and controlled TYT CPS exports:

- Bluetooth off/on
- role: master/host or slave/peripheral
- local speaker off/on
- local microphone off/on
- Bluetooth speaker gain, levels 1 through 8
- Bluetooth microphone gain, levels 1 through 8
- BT hold time, 1 through 300 seconds or Infinite

The storage reference calls the original six controls a contiguous Bluetooth
page block at `0x00015440..0x00015445` and gives each a one-byte encoding
([storage reference, lines 82-87](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L82-L87),
[Bluetooth table, lines 1073-1085](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L1073-L1085)).
Controlled TYT CPS exports independently locate BT hold time at `0x0001544B`
and establish its index mapping.
Its verification appendix says the Bluetooth UI order, offsets, and
switch/mode/gain enums were checked for consistency
([lines 1087-1116](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L1087-L1116)).

This is sufficient evidence to decode and edit all seven fields in a Working
Codeplug. It is not sufficient to implement headset pairing, Bluetooth PTT
pairing, a paired-device table, live Bluetooth status, or browser-to-Radio
Bluetooth transport. It also does not make Radio Write available.

The manufacturer-filed [UVL-15W user manual](https://fccid.io/2BLTR-UVL15W/User-Manual/13-UVL-15W-Users-Manual-9378982.pdf)
(printed pages 22-24; PDF pages 14-15) corroborates the user-facing behavior of
five of the original six controls: the built-in speaker and microphone switches determine
whether the Radio's own speaker and microphone are muted while a Bluetooth
connection is active, and higher speaker/headset or microphone gain levels are
louder. It names the Bluetooth switch but does not explain Bluetooth Mode.

## Classification

### Confirmed safe to model and edit in a Working Codeplug

The Codeplug file offset is the absolute flash address minus the documented
Codeplug start address `0x00008000`; the Codeplug covers the complete
`0x00008000..0x00021000` range
([storage map, lines 67-70](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L67-L70)).

| Field                     | Flash address | Codeplug offset | Authored values                              |
| ------------------------- | ------------: | --------------: | -------------------------------------------- |
| Bluetooth enabled         |  `0x00015440` |        `0xD440` | `0=Off`, `1=On`                              |
| Local microphone          |  `0x00015441` |        `0xD441` | `0=Off`, `1=On`                              |
| Local speaker             |  `0x00015442` |        `0xD442` | `0=Off`, `1=On`                              |
| Bluetooth microphone gain |  `0x00015443` |        `0xD443` | raw `0..7` = displayed level `1..8`          |
| Bluetooth speaker gain    |  `0x00015444` |        `0xD444` | raw `0..7` = displayed level `1..8`          |
| Bluetooth role            |  `0x00015445` |        `0xD445` | `0=Master/host`, `1=Slave/peripheral`        |
| BT hold time              |  `0x0001544B` |        `0xD44B` | index `0..34` = finite values; `35=Infinite` |

The original six addresses and encodings in this table come directly from the
reviewed Bluetooth storage table
([lines 1075-1085](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L1075-L1085)).
The BT hold-time row comes from the controlled PF comparison below. The feature
reference independently enumerates the original six Bluetooth-page
controls as planned P2 Codeplug settings
([feature reference, lines 784-791](../CPS_FEATURE_REFERENCE.md#L784-L791)).
The official user manual supplies runtime meaning for the local-audio and gain
controls, but the reviewed storage reference remains the source for their byte
addresses and encodings.

“Safe” here means safe for lossless Codeplug interpretation and intentional
Working Codeplug edits, not proven safe to transmit to physical hardware. The
repository distinguishes documented behavior from behavior proven against a
physical Radio
([feature status definitions, lines 9-16](../CPS_FEATURE_REFERENCE.md#L9-L16)).
The original six mappings are documented but still lack controlled
before/after PF fixtures. BT hold time has controlled PF evidence. No physical
Radio Write evidence exists for any of these settings.

### Identifiable, but not part of the standalone Bluetooth page

Several persistent settings mention Bluetooth but already have different domain
owners. They should remain where they are rather than being duplicated into the
new page.

| Related setting                      | Documented ownership                    | Current source ownership           | Disposition                        |
| ------------------------------------ | --------------------------------------- | ---------------------------------- | ---------------------------------- |
| CI-T Bluetooth SPP enable            | Function Settings, address `0x000154B9` | `FunctionSettings.citBluetoothSpp` | Keep in Radio Settings > Functions |
| CI-T Bluetooth BLE enable            | Function Settings, address `0x000154BA` | `FunctionSettings.citBluetoothBle` | Keep in Radio Settings > Functions |
| APRS TNC Bluetooth SPP output/format | APRS at `0x00015742..0x00015743`        | `AprsSettings.tncBluetoothSpp`     | Keep in APRS > TNC                 |
| APRS TNC Bluetooth BLE output/format | APRS at `0x00015744..0x00015745`        | `AprsSettings.tncBluetoothBle`     | Keep in APRS > TNC                 |
| Programmable-key Bluetooth action    | Key Settings enum                       | keyboard settings codec            | Keep in Radio Settings > Keys      |
| Bluetooth menu and child visibility  | Menu Display Mask bits 6 and 23..32     | menu-visibility codec              | Keep in Menu Visibility            |

The CI-T offsets and boolean encodings are documented in the Function Settings
table
([storage reference, lines 169-177](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L169-L177));
the current codec already decodes and writes those exact fields
([function-settings source, lines 31-35](../../modules/codeplug/function-settings.ts#L31-L35),
[lines 224-231](../../modules/codeplug/function-settings.ts#L224-L231),
[lines 323-330](../../modules/codeplug/function-settings.ts#L323-L330)).

The APRS storage table assigns separate SPP and BLE TNC output/format pairs
([storage reference, lines 1047-1056](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L1047-L1056));
the APRS codec already owns their domain fields, decoding, and editing
([APRS codec, lines 220-240](../../modules/codeplug/aprs-settings.ts#L220-L240),
[lines 325-330](../../modules/codeplug/aprs-settings.ts#L325-L330),
[lines 435-439](../../modules/codeplug/aprs-settings.ts#L435-L439)).

Bluetooth is already a documented short- and long-press key action
([keyboard codec, lines 5-33](../../modules/codeplug/keyboard-settings.ts#L5-L33),
[lines 35-64](../../modules/codeplug/keyboard-settings.ts#L35-L64)). The menu
visibility codec already assigns the Bluetooth menu and all ten child items to
bits 6 and 23..32
([menu items, lines 7-40](../../modules/codeplug/menu-visibility-items.ts#L7-L40)).

These fields are identifiable and safe within their existing codecs; they are
not additional fields of the six-byte Bluetooth basic-settings block.

### Identifiable by name, but not safe to implement as actions or data views

The menu visibility map names four runtime Bluetooth features:

- Bluetooth headset pairing
- Bluetooth PTT pairing
- Bluetooth device table
- Bluetooth status information

The reviewed document identifies only whether those Radio menu entries are
shown, through Menu Display Mask bits 25, 26, 31, and 32
([storage reference, lines 508-517](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#L508-L517)).
It gives no persistent storage structure for paired devices or live status and
no commands for invoking pairing. The command reference contains only device
information, clone read/write, completion, password verification, and generic
error operations
([communication protocol, lines 102-116](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#L102-L116)).

The official user manual confirms that headset pairing and Bluetooth PTT
pairing are Radio-side actions, the device list is pairing history used for
quick reconnection, and Bluetooth Information is a read-only module-status view
([manufacturer-filed UVL-15W user manual](https://fccid.io/2BLTR-UVL15W/User-Manual/13-UVL-15W-Users-Manual-9378982.pdf),
printed pages 23-24; PDF pages 14-15). It does not define a CPS storage or
command interface for any of them.

Therefore the new CPS page must not present pairing buttons, a device list, or
status as functional. At most, future explanatory text may say those operations
remain Radio-side until a separate hardware-verified interface is found.

### Ambiguous or unknown

- The runtime consequences and compatibility rules of master/host versus
  slave/peripheral mode are not described beyond the storage-reference enum
  labels; the official user manual's Bluetooth section does not mention the
  mode. The CPS can faithfully expose the two values but should not promise
  which accessory types work in each role.
- The relationship between the main Bluetooth switch, local speaker/microphone
  switches, gain settings, CI-T SPP/BLE switches, and APRS TNC outputs is not
  defined. Do not infer dependencies, auto-toggle related fields, or disable
  persisted controls based on another field.
- No capability bit in the documented E1 device-information response identifies
  the installed Bluetooth hardware or firmware support. E1 exposes a fixed
  sub-model plus version and identity fields, but no Bluetooth feature flag
  ([communication protocol, lines 123-143](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#L123-L143)).
- The protocol says an ET25SE Bluetooth transparent-serial module can carry the
  protocol, but this does not prove a browser-accessible Bluetooth transport
  path
  ([communication protocol, lines 9-17](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#L9-L17)).
  The feature reference explicitly keeps SPP and BLE CPS transport in Future /
  Research
  ([lines 1188-1193](../CPS_FEATURE_REFERENCE.md#L1188-L1193)), while current
  production transport opens `navigator.serial`
  ([Web Serial adapter, lines 128-159](../../adapters/web-serial/index.ts#L128-L159)).

## Preservation and round-trip requirements

The project defines a Codeplug as a complete snapshot containing understood and
opaque values that must be preserved, and a Change Set as intended differences
whose unrelated opaque values remain unchanged
([domain context, lines 15-17](../../CONTEXT.md#L15-L17),
[lines 35-37](../../CONTEXT.md#L35-L37)). The Codeplug module owns raw-value
preservation, validation, and encoding; unknown and reserved values must survive
unrelated edits
([module design, lines 63-67](../architecture/module-design.md#L63-L67)).

The Bluetooth codec and tests should consequently guarantee:

1. Raw values outside boolean `0..1`, role `0..1`, or gain `0..7` decode as an
   explicit unknown value rather than being normalized.
2. Reading and exporting an untouched Codeplug preserves all six raw bytes
   exactly, including unknown values.
3. Editing one Bluetooth field changes only its single owned offset. The other
   five Bluetooth bytes and every byte outside `0xD440..0xD445` remain identical.
4. Authored values outside the documented ranges are rejected.
5. Every documented value round-trips through decode and encode.
6. Change Set entries reconcile per Bluetooth field against the Baseline Backup,
   matching the current GPS pattern. Reverting a field removes its change.
7. UI controls showing an unknown value do not overwrite it until the user makes
   an intentional selection.

The current GPS codec is a suitable implementation precedent: it slices the
source bytes before edits, decodes out-of-range bytes as explicit unknown
values, validates authored values, and writes only fields present in a patch
([GPS codec, lines 36-75](../../modules/codeplug/gps-settings.ts#L36-L75),
[lines 78-115](../../modules/codeplug/gps-settings.ts#L78-L115)). Its tests prove
all documented value round trips, exact changed offsets, source preservation,
unknown preservation, invalid-value rejection, and per-field Change Set
reconciliation
([GPS tests, lines 24-68](../../test-support/gps-settings.test.ts#L24-L68),
[lines 70-142](../../test-support/gps-settings.test.ts#L70-L142)).

## Applying settings to the physical Radio

The six bytes lie inside the protocol's full 102,400-byte clone range
([communication protocol, lines 19-27](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#L19-L27)),
so they require no Bluetooth-specific serial command once general Radio Write
exists. They must not be sent as a six-byte or changed-byte partial write. The
feature plan explicitly excludes partial or changed-block writes until they are
hardware verified
([feature reference, lines 1050-1064](../CPS_FEATURE_REFERENCE.md#L1050-L1064)).

The current `Uvl15wRadio` interface exposes only `connect`, `read`, and
`disconnect`
([Radio source, lines 89-93](../../modules/uvl15w-radio/index.ts#L89-L93)); its
implemented command set contains read commands but no begin-write command
([lines 20-28](../../modules/uvl15w-radio/index.ts#L20-L28)). Consequently, the
new page may edit only the Working Codeplug today and must not claim the physical
Radio has changed.

When general Radio Write is implemented, success requires the repository's full
safety path: complete preflight read and immutable recovery backup, Source Radio
comparison, full-range write with acknowledgements, `E5 "Write Complete"`,
reboot/reconnect, complete Radio Read, and byte-for-byte verification
([feature reference, lines 1050-1064](../CPS_FEATURE_REFERENCE.md#L1050-L1064)).
The protocol's underlying complete-write sequence is E0, E3, repeated E4/E6,
E5, then reboot
([communication protocol, lines 278-290](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#L278-L290)).

## Recommended implementation shape

1. Add `/bluetooth` directly after GPS under the existing Configuration sidebar
   group. APRS and GPS already use standalone routes there
   ([sidebar, lines 75-96](../../components/app-sidebar.tsx#L75-L96)); the GPS
   route is a thin page that delegates to a workspace component
   ([GPS page, lines 1-5](../../app/%5Blocale%5D/gps/page.tsx#L1-L5)).
2. Follow the GPS desktop shell: read-required empty state, `PageHeader`, pending
   Bluetooth change count, and two-column cards
   ([GPS workspace, lines 49-89](../../components/gps/gps-workspace.tsx#L49-L89),
   [lines 106-185](../../components/gps/gps-workspace.tsx#L106-L185)). A natural
   arrangement is Basic (enable, role), Local audio (speaker, microphone), and
   Bluetooth gain (speaker, microphone).
3. Add a deep `bluetooth-settings` Codeplug codec owning offsets
   `0xD440..0xD445` and `0xD44B`, then expose `getBluetoothSettings()` and
   `editBluetoothSettings(patch)` through `Codeplug`.
4. Add per-field `edit-bluetooth-setting` Change Set reconciliation and a CPS
   Workspace action, using the existing GPS flow as the direct pattern
   ([Codeplug GPS methods, lines 211-217](../../modules/codeplug/index.ts#L211-L217),
   [lines 290-296](../../modules/codeplug/index.ts#L290-L296),
   [workspace provider, lines 770-794](../../components/cps-workspace-provider.tsx#L770-L794)).
5. Add Turkish and English copy; those are the currently configured locales
   ([locale routing, lines 3-13](../../i18n/routing.ts#L3-L13)).
6. Keep CI-T, APRS TNC, key assignments, and menu visibility in their existing
   pages. Do not add pairing, device-table, status, or Bluetooth transport UI.

## Stronger evidence before hardware validation

The current technical documentation is sufficient for a conservative
read/edit implementation, but controlled vendor-CPS fixtures would reduce risk
before relying on the mappings in a physical Radio Write. From one common
baseline, export variants that change exactly one control at a time:

- Bluetooth Off and On
- Master/host and Slave/peripheral
- Local speaker Off and On
- Local microphone Off and On
- each speaker-gain raw value `0..7`
- each microphone-gain raw value `0..7`

The expected result is exactly one changed byte per variant at the corresponding
address in `0x00015440..0x00015445`, with the documented raw value. Preserve
those fixtures or minimal provenance-noted excerpts for automated tests. Such a
comparison would strengthen the original six mappings; it would not replace the
full Radio Write verification requirements.

### Controlled BT hold-time PF verification

Ten TYT CPS exports made from the same Radio changed only BT hold time. The
exports for 1s, 2s, 10s, 12s, 30s, 35s, 60s, 70s, 300s, and Infinite differed
only at `0x0001544B`, with raw values `00`, `01`, `09`, `0A`, `10`, `11`, `16`,
`17`, `22`, and `23` respectively. Masking that byte made all ten `.PF` files
byte-for-byte identical.

The complete ordered values are `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16,
18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 150, 180,
210, 240, 270, 300, Infinite`.
