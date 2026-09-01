# 73Kit Radio CPS — TYT UVL-15W Feature & Capability Reference

> **Purpose:** Canonical feature reference for implementation planning and Codex-assisted development.
>
> **Product:** Radio CPS, the first tool within 73Kit
>
> **Current Radio Model:** TYT UVL-15W, including the Tekser TR-UV15 alias
>
> **Current validated Support Profile:** firmware `3.07.23`, Codeplug Layout `uvl15w-3.07.23`
>
> **Primary stack:** Next.js + React + TypeScript + Web Serial
>
> **Status convention used in this document**
>
> - **PROVEN** - verified against a physical UVL-15W using the browser PoC.
> - **DOCUMENTED** - explicitly supported by the supplied TYT protocol/storage documentation.
> - **IMPLEMENTED** - present in production source and covered by automated verification; this does not by itself claim physical Radio validation.
> - **PARTIALLY IMPLEMENTED** - a usable subset is present and verified; the remaining scope is stated explicitly.
> - **PLANNED** - product capability we intend to implement using documented data/protocol behavior.
> - **OPTIONAL** - enhancement that is not required to reproduce the vendor CPS.
> - **FUTURE / RESEARCH** - requires additional protocol work, browser transport work, or product decisions.

---

## 1. What This Project Is

This document covers the browser-based **Radio CPS**, specifically the current
**TYT UVL-15W** integration. **Tekser TR-UV15** is an alias of that same Radio
Model and uses the same route, driver, profiles, and capabilities.

The goal is to provide a cross-platform alternative to traditional Windows-only programming software while keeping radio communication local to the user's computer.

The radio communicates directly with the browser:

```text
Next.js / React UI
        ↓
CPS Workspace
        ↓
UVL-15W Radio
        ↓
Transport seam
        ↓
Web Serial adapter
        ↓
USB CDC virtual serial
        ↓
TYT UVL-15W
```

The Next.js server is **not** part of the radio communication path. Core CPS operation should not require a backend.

The operator chooses a Radio Model at `/{locale}/cps`, then works under the
shared dynamic route `/{locale}/cps/{radioModel}`. Live firmware is detected
from the Radio, not selected by the operator. Only an exact validated Support
Profile authorizes Codeplug interpretation. Adding another Radio therefore
adds registry, driver, profile, persistence, and test work—not another copy of
the route tree.

See
[`docs/architecture/73kit-radio-cps-platform.md`](architecture/73kit-radio-cps-platform.md)
for the canonical multi-Radio architecture and extension procedure.

---

## 2. Scope Boundary: CPS vs Firmware

The CPS is primarily responsible for the radio's Codeplug stored in external SPI flash.

The documented CPS memory region is:

```text
0x00008000 → 0x00021000
```

Total size for the validated **firmware `3.07.23` Support Profile only**:

```text
102,400 bytes
```

This byte length must not be applied to another firmware version until that
version is independently validated and registered.

This includes Channels, VFOs, Call Channels, Zones, Scan Lists, radio settings, APRS, GPS, Bluetooth, DTMF, 2-Tone, 5-Tone and related Codeplug data.

MCU firmware updates use a separate update/bootloader path and `.Fir` packages.
Resource Flash uses `.DAT` packages for Language and Image Resources at
addresses outside the Codeplug range. Neither operation is a Radio Write.

The official CPS updater protocol is now documented in
[`docs/technical/TYT_UVL-15W_UPDATE_PROTOCOL_V1.0.md`](technical/TYT_UVL-15W_UPDATE_PROTOCOL_V1.0.md).
Firmware `3.7.23` is captured and reproduced offline. Language `1.01.05`, Image
`1.01.00`, and their combined DAT were captured bidirectionally. Resource Flash
`E3` variation is explained by static analysis, and the updater specification
pins known-successful compatibility payloads per validated package kind.
Destructive browser update actions remain release-gated on implementation and
physical browser validation.

---

## 3. Current Hardware-Validated Capabilities

The browser proof of concept has already been tested against a physical TYT UVL-15W.

### 3.1 Browser → radio connection - PROVEN TRANSPORT

- Web Serial works with the radio's USB CDC interface.
- Chrome on macOS can connect directly to the radio.
- The currently tested host-side serial configuration uses `115200` baud.
- Because this is USB CDC, the baud setting may not represent a physical UART rate and may be ignored by the Radio implementation.
- Initial browser targets are Chrome/Edge/Chromium with Web Serial support.

### 3.2 Radio handshake - PROVEN

The radio responds to the documented `E0` handshake using `"UVL-15W"`.

Known-good request frame:

```text
FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD
```

### 3.3 Radio information - PROVEN / DOCUMENTED

The `E1` response exposes:

- model
- sub-model
- read-protection flag
- write-protection flag
- firmware/software version
- image/resource version
- CPU unique ID
- bootloader model information
- hardware version
- serial number

### Firmware compatibility gate

The current Codeplug memory map is validated for UVL-15W firmware `3.07.23`.
After the `E1` response, the UVL-15W Radio module validates the reported
firmware before allowing a Radio Read. It normalizes `3.07.23` and `V3.07.23`
representations of that version. Older, newer-unvalidated, blank or malformed
versions are disconnected before any `E2` command is sent, so no Codeplug Backup
or Working Codeplug is created.

Firmware support is an exact validated-version allowlist rather than a minimum
comparison: a future release may retain the same address range while changing
field offsets or meanings. Add a newer version only after controlled Codeplug
comparisons, protocol/address validation, fixtures and physical Radio testing.

#### Source discrepancy

The Communication Protocol describes one E1 payload as **71 bytes**, but the documented field offsets extend through byte 80, which describes an **81-byte structure**. The newer Data Storage Reference also describes E1 as 81 bytes. Parse defensively and preserve this discrepancy in documentation/tests.

### 3.4 Full Radio Read - PROVEN

Successful sequence:

```text
E0  Radio handshake
 ↓
E1  Radio information
 ↓
E2  Start read session
 ↓
E6  Read block
 ↓
E4  Block response
 ↓
repeat
 ↓
E5  "Read Complete"
 ↓
radio exits PC Reading mode / reboots
```

The complete documented region `0x8000 → 0x21000` (102,400 bytes) has been read successfully from real hardware.

### 3.5 Read-session completion - PROVEN

`E5 + "Read Complete"` is required after a complete read. Without it, the physical radio was observed remaining on `PC Reading 99%`.

---

## 4. Protocol Capabilities

Primary reference: `docs/technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md`

### 4.1 Framing - DOCUMENTED

- Host → radio core header: `FE EE EF`
- Radio → host core header: `FE EF EE`
- Frame tail: `FD`

At least one additional `FE` preamble byte is required before the core header for synchronization/wake behavior.

### 4.2 Byte escaping - DOCUMENTED / PROVEN

Escaping applies to payload bytes and LRC, but not the command byte.

Important JavaScript behavior:

```text
temp = uint8(rawByte + 0x80)
```

The addition must wrap as an 8-bit value **before** the escape test.

Known-good E2 full-read frame:

```text
FE FE EE EF E2 80 80 00 80 80 82 90 80 EE FD
```

Keep this as a regression test.

### 4.3 LRC - DOCUMENTED / PROVEN

LRC is calculated over unescaped payload bytes only:

```text
LRC = uint8(0x100 - (sum(payload) & 0xFF))
```

Then escape the LRC byte like payload data.

### 4.4 Stream parsing - PROVEN IMPLEMENTATION REQUIREMENT

Do not assume one `reader.read()` equals one protocol frame. Responses may be split across arbitrary USB chunks.

Do not use `Promise.race(reader.read(), timeout)` because the losing `reader.read()` remains pending and may consume a later response. Use one long-lived receive loop and a streaming frame parser.

---

## 5. Normal CPS Commands

| Command | Purpose                                                        | Project status                                |
| ------- | -------------------------------------------------------------- | --------------------------------------------- |
| `E0`    | Request radio information / handshake                          | **PROVEN**                                    |
| `E1`    | Radio information response                                     | **PROVEN**                                    |
| `E2`    | Start read session                                             | **PROVEN**                                    |
| `E3`    | Start write session                                            | **WRITE IMPLEMENTED; PHYSICALLY PROVEN**      |
| `E4`    | Host→radio write block / radio→host read response by direction | **READ/WRITE IMPLEMENTED; PHYSICALLY PROVEN** |
| `E5`    | Complete read/write session and reboot                         | **READ/WRITE IMPLEMENTED; PHYSICALLY PROVEN** |
| `E6`    | Host read request / radio write ACK by direction               | **READ/WRITE IMPLEMENTED; PHYSICALLY PROVEN** |
| `E7`    | Read/write password validation                                 | **DOCUMENTED**                                |
| `EE`    | Error response                                                 | **DOCUMENTED**                                |

---

## 6. Codeplug Representation

A Codeplug is the complete 102,400-byte snapshot, including understood settings and opaque values. The Codeplug module must retain the exact bytes internally while exposing domain operations and results rather than a public mutable byte array.

Why:

- reserved bytes exist
- unknown bytes may exist
- some structures are duplicated/related
- read-modify-write is required for bitfields
- a UI object model must not accidentally zero or regenerate unknown data
- the UI and CPS Workspace must not manipulate addresses, offsets, bitfields or raw bytes directly

The production Codeplug core exposes immutable typed results and
read-modify-write operations for Channels, VFOs, Call Channels, Zones, Scan
Lists, Radio Settings, APRS, GPS, Bluetooth, Spectrum, signalling systems and
FM Broadcast Radio while keeping memory-map details, binary helpers, lookup
tables and raw bytes private. Unknown or reserved values remain opaque,
untouched bytes are preserved, and every edit creates a new immutable Working
Codeplug.

---

# 7. Complete Feature Catalogue

## 7.1 Radio & Connection

### Operation-scoped connect/disconnect - P0 / IMPLEMENTED PRODUCT; PROVEN TRANSPORT

- request a Web Serial port for every Radio operation
- open and close the connection within the operation
- distinguish unsupported browsers from insecure contexts
- expose idle, connecting, reading and ready operation phases
- release the port and reset receive state after success or failure

The CPS does not maintain a persistent Radio connection between operations. A later Radio Read starts a fresh operation and requests a port again. Radio Write ends after the validated E5 reboot response and does not reconnect or read back automatically.

The Diagnostics & Support workspace records bounded, allowlisted summaries of
failed, uncertain and successful Radio and updater operations. It keeps at most
10 incidents per source for 30 days plus the latest success per source in
IndexedDB. Operators can inspect, copy, download or delete the exact JSON and
open a prefilled support email; nothing is uploaded or sent automatically.
Reports may include public Radio version fields but omit serial numbers, CPU
IDs, raw frames, Codeplug and update-package bytes, arbitrary error text, full
URLs and user-agent data. Diagnostics never connects to the Radio, retries an
operation or changes recovery state.

### Read radio information - P0 / IMPLEMENTED PRODUCT; PROVEN PROTOCOL

Display model, firmware, hardware, serial number, CPU ID, bootloader model, resource version and read/write protection state.

---

## 7.2 Backups, Working Codeplugs & Exports

### Radio Read - P0 / IMPLEMENTED PRODUCT; PROVEN PROTOCOL

Read `0x8000 → 0x21000` into a complete 102,400-byte Codeplug. A successful Radio Read creates an immutable Baseline Backup and a separate Working Codeplug. An incomplete or invalid read creates neither.

### Raw Backup Export - P0 / IMPLEMENTED PRODUCT

For the validated firmware 3.07.23 layout, the Radio workspace downloads the
immutable Baseline Backup as an exact 102,400-byte `.bin` file. It does not
export the edited Working Codeplug. A Raw Backup Export contains no Source Radio
identity or interpretation metadata. An imported Unbound Codeplug is the sole
exception: its download action exports the current edited Working Codeplug as a
new raw `.bin`, because no Source-Radio-bound Baseline Backup can be implied.

Metadata such as model, firmware, date/time and SHA-256 belongs in a CPS Export or a separate sidecar, never inside the Raw Backup Export.

### CPS File export and import - P0 / IMPLEMENTED PRODUCT

Export a `.73kcps` ZIP package containing `manifest.json`, `baseline.bin`, and
`working.bin`. The manifest preserves Source Radio identity, layout and firmware
metadata, creation time, byte lengths, and SHA-256 hashes. Import verifies every
member before opening the Baseline Backup and Working Codeplug for offline
inspection, editing, and re-export.

An imported file is not live proof of its Source Radio. “Read Radio & Prepare
Restore” performs a fresh complete Radio Read, saves the current Radio backup,
verifies permanent Source Radio identity and the validated layout, and creates a
Restore Plan from the fresh read to the imported Working Codeplug. Radio Write
remains blocked until that preparation succeeds. See
[`codeplug-file-lifecycle.md`](codeplug-file-lifecycle.md).

Restore materialization preserves the fresh Radio's observed opaque,
Radio-managed tail at `0x20BC0–0x20FFF`. Its 8-byte internal records can be
populated between complete reads without a user edit; the entire tail is
therefore excluded from the user-facing Restore Plan and is never restored from
an older CPS File.

### Raw import for offline inspection/editing - P1 / IMPLEMENTED PRODUCT

Backups provides a separate **Import Raw Backup** action and explicit review.
The current import profile accepts only a case-insensitive `.bin` extension and
exactly 102,400 bytes, which identifies the currently validated firmware
3.07.23 layout; this is not a universal size rule for future firmware layouts.
The size is checked before and after reading, and the imported bytes become an
immutable Baseline Backup plus a distinct editable Working Codeplug.

The document is explicitly Unbound: it has no model, firmware claim or Source
Radio identity. It can use all current offline inspectors and editors and can
download its edited Working Codeplug as raw `.bin`. Radio Write, restore
preparation, CPS File export, Backup History and named IndexedDB snapshots all
remain unavailable. Opening a failed or cancelled import does not replace the
active document. CSV and other future imports also create Unbound Codeplugs
unless Source Radio identity can be proven.

### Backup History - P0 / IMPLEMENTED

The browser retains an immutable Codeplug Backup in IndexedDB after every
successful Radio Read and completed Radio Write. A completed write stores the
accepted intended Codeplug image; it does not perform a post-reboot Radio Read.
Failed, cancelled, interrupted and unknown-outcome operations are not history
entries. The desktop Backup History page lists the Source Radio and firmware,
distinguishes reads from writes, and lets the operator start a verified restore,
download one as a CPS File, delete one backup, or delete all saved backups.
Clearing Backup History does not clear the separate active Radio Write recovery
record.

### Change Set review - P1 / IMPLEMENTED; REQUIRED FOR RADIO WRITE

Show the complete intended differences between a Baseline Backup and its Working Codeplug. Values outside the Change Set remain unchanged, and an empty Change Set cannot be written.

### Additional Codeplug comparison - P1 / OPTIONAL

Compare backups or Working Codeplugs semantically for inspection. This optional comparison is separate from the mandatory Change Set used by a Radio Write.

---

## 7.3 Channels

- Primary storage: `0x00008000 → 0x00013B7F`
- Capacity: `1000 channels × 48 bytes`

### Channel inspection and ordering UI - P0 / IMPLEMENTED

The Channels workspace provides a virtualized, searchable Memory table, Basic
and Advanced column visibility, complete channel details, formatted CTCSS/DCS,
resolved Zone and Scan List membership names, and compact VFO A/B and Call 1/2
views. The default operating view fits the frequently used Channel fields in a
compact table; Zone, Scan List and advanced fields remain available through the
Columns menu and the complete details Drawer. Temporary channels remain
internal.

Memory rows can be dragged to a new channel number. A row move is an in-memory
Working Codeplug change: the complete 48-byte record, validity and scan state,
per-channel Zone and Scan List membership, and every ordered Zone and Scan List
reference move together. The immutable Baseline Backup remains unchanged and
the user can reset pending row moves and field edits.

Memory rows can also be added, duplicated and deleted. Add activates the first
unused slot with a clean 145.500 MHz simplex FM default; unsupported/on-off
features, signalling, tones and memberships start disabled or empty. Duplicate
inserts a copy directly below the source, retains its Channel fields and
memberships, and adds a byte-safe `Copy` suffix to its name. Delete removes the
selected slot, shifts every following Memory row up by one channel number,
clears the final slot, and removes or remaps ordered Zone and Scan List
references. These operations affect only the Working Codeplug until a completed
Radio Write. Deleting a newly added or duplicated row restores the
exact pre-operation Working Codeplug, including when that temporary row was
edited, so the canceled operation leaves no pending Change Set entry.

### Memory Channel inline editing - P1 / IMPLEMENTED

The Memory table directly edits channel use state, name, RX/TX/offset
frequencies, duplex, reverse/talk-around, step, modulation, TX power, RX-only,
Busy Channel Lockout, squelch type, DCS polarity, compander, optional signaling
kind, scrambler, PTT ID, APRS RX, Scan Flag, and TX/RX CTCSS or DCS tones.
Tone cells use a compact type-and-value editor so the full documented indexed
value sets do not expand every table row. RX additionally supports the
documented reverse CTCSS/DCS encodings. Select fields expose only valid
documented choices; reserved and unknown values remain visible but cannot be
selected as new values.

Names are validated against the 24-byte UTF-8 storage limit. Frequencies are
entered in MHz and encoded as unsigned integer Hz. Edits update only the owning
field or bit range in a new Working Codeplug and retain the immutable Baseline
Backup. The pending-change count reflects current field differences from that
Baseline Backup, so returning a field to its baseline value removes its pending
change. The same supported fields can be edited from the Channel details Drawer
or directly in the table. RX frequency, TX frequency, Duplex and Offset are
separate table columns. TX frequency remains visible beside RX frequency but is
directly editable only when Duplex is Split. Offset is directly editable only
for positive or negative Duplex modes. Zone and Scan List columns provide
compact multi-select membership editors when enabled through the Columns menu;
the complete Channel Drawer always exposes both editors.

### VFO and Call Channel inline editing - P1 / IMPLEMENTED

VFO A/B and Call 1/2 use the same validated 48-byte Channel field editor as
Memory Channels. Frequently used fields are editable directly in their tables,
and the complete supported field set is editable in the details Drawer. VFO
does not expose the record name, Zone, Scan List or Memory-only Used/Scan Flag
fields. Call exposes the Channel name but likewise has no Zone, Scan List,
Used or Scan Flag fields. Each field is tracked against its corresponding
Baseline Backup slot, so restoring its baseline value removes the pending
change. Edits remain in the Working Codeplug only; no Radio Write is performed.

### Supported channel fields

- RX frequency - P0
- TX frequency - P0
- channel name (24-byte UTF-8) - P0
- duplex/off/negative/positive/split - P0
- offset frequency - P0
- reverse/talk-around - P1
- frequency step - P0
- modulation: FM / FM-N / AM / AM-N - P0
- TX power: Low / Medium / High - P0
- RX-only - P0
- Busy Channel Lockout - P1
- squelch type - P1
- TX CTCSS - P0
- RX CTCSS - P0
- TX DTCS/DCS - P0
- RX DTCS/DCS - P0
- DCS polarity/reverse modes - P1
- compander - P1
- optional signalling: Off / DTMF / 2-Tone / 5-Tone - P1
- scrambler - P1
- PTT ID - P1
- APRS RX - P1

### Frequency steps - DOCUMENTED

`2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100 kHz`

### CTCSS - DOCUMENTED

50 CTCSS values from `67.0` through `254.1 Hz`.

Index `20` corresponds to `131.8 Hz`.

UX rule: RX CTCSS must not be silently mirrored from TX CTCSS. Explain that RX tone mutes audio unless the received signal contains the configured tone.

### Scrambler - DOCUMENTED

Off plus documented values `2700` through `3400` in 100-unit increments.

---

## 7.4 Channel State & Membership Metadata

- channel valid/use bitmap - P0
- scan flag (off / skip / priority / reserved) - P0
- zone membership bitmap - P0
- scan-list membership bitmap - P0

Important: zone and scan-list membership bitmaps are stored inverted (`0 = member`). Hide this behind domain APIs.

The hardware-verified layout uses 4-byte membership records at `0x0001C000`
for Zones and `0x0001D000` for Scan Lists. Ordered member entries are
big-endian at `0x00018000` and `0x0001A000`; names are stored at `0x0001E000`
and `0x0001E500`. Only the lower 16 membership bits are currently interpreted;
the remaining bytes are preserved exactly.

---

## 7.5 VFOs, Call Channels, Temporary Channels & Weather Channels

### VFO A/B - P1 / IMPLEMENTED PRODUCT; DOCUMENTED STORAGE

Two 48-byte channel records.

### Call Channels 1/2 - P1 / IMPLEMENTED PRODUCT; DOCUMENTED STORAGE

Two special Call Channel storage slots.

### Temporary Channels A/B - INTERNAL / DOCUMENTED

The storage reference's normal save flow mirrors `VFO A → Temp A` and `VFO B → Temp B` as raw 48-byte copies. `Temp A/B` are storage labels for the internal Temporary Channels, not user-facing names.

### Weather Channels - INTERNAL / DOCUMENTED FIXED DATA

The codeplug contains 10 documented fixed weather-channel records and templates.
The current TYT CPS does not expose these records as a separate page or editor,
so this product keeps them internal. The user-facing Weather Channel controls
remain in Radio Settings → Function Settings.

---

## 7.6 Zones

- 16 zones - P0
- 24-byte UTF-8 names - P0
- 128 member slots per zone - P0
- A/B multi-Zone selection - P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE

Zone information exists in both ordered member lists and per-channel membership bitmaps. Writer code must maintain both consistently.

### Zone and Scan List domain operations - P1 / IMPLEMENTED

The Codeplug module exposes immutable Zone and Scan List collections plus
operations to rename a collection, replace and reorder its members, or update
one Channel's complete Zone and Scan List membership. Every membership edit
updates the ordered member list and inverted per-channel bitmap together while
preserving unrelated bytes and the unused upper membership bits.

The same interface enforces 24-byte UTF-8 names, unique Channel membership,
valid Channel and collection numbers, and the 128-member capacity. Consistency
validation reports stable codes for invalid or duplicate ordered entries and
for differences between ordered lists and membership bitmaps.

### Zone editor - P1 / IMPLEMENTED

The `/zones` workspace presents all 16 fixed hardware Zone slots in one
master-detail page. The selected Zone supports a 24-byte UTF-8 name, ordered
member list, drag-to-reorder, adding any used Memory Channel not already in the
Zone, removing membership without deleting the Channel, and clearing the fixed
slot. RX/TX frequency, Channel name, TX Power and Squelch are summaries of the
shared Memory Channel; opening a member uses the shared Channel Drawer and
therefore edits that Channel everywhere it is referenced.

Zone edits are tracked field-by-field against the Baseline Backup. Restoring a
Zone name or exact member order to its baseline value removes that pending
change. The page scrolls its Zone list and member table internally rather than
scrolling the application shell.

Compact Band A and Band B controls independently select any combination of the
16 Zones. An empty selection represents All Zones. Controlled stock-CPS backup
comparisons proved 32-bit little-endian bitmaps at physical addresses
`0x1E342` and `0x1E346`: lower bit `n` selects Zone `n`, while the upper 16 bits
are preserved. Selection edits are baseline-aware and reverting a band to its
original selection removes that pending change.

The Channel table and Drawer use a shared searchable membership selector.
Assignments append the Channel to each selected Zone's ordered member list;
removal compacts that list. Full 128-member Zones cannot accept another
Channel. Band A/B Zone selection remains independent from Channel membership.

---

## 7.7 Scan Lists

- 16 scan lists - P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- 24-byte names - P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- 128 member slots per list - P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- A/B active scan-list selection - P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- member Off/Skip/Priority semantics - P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE

Like zones, both ordered lists and per-channel membership bitmaps must remain synchronized.

### Scan List editor - P1 / IMPLEMENTED

The `/scan-lists` workspace uses the same fixed-slot master-detail workflow as
Zones. It presents all 16 Scan Lists, a 24-byte UTF-8 name, ordered membership,
drag-to-reorder, add, remove and clear operations, and the shared Channel
Drawer. The member table adds the Channel's Off/Skip/Priority scan flag; opening
the Channel Drawer edits that shared field everywhere the Channel is used.

Scan List name and exact member-order changes are tracked against the Baseline
Backup, so restoring either field removes its pending change. The page and its
member table scroll internally.

Compact Band A and Band B controls independently select any combination of the
16 Scan Lists. An empty selection represents All Scan Lists. Controlled
stock-CPS backup comparisons proved 32-bit little-endian bitmaps at physical
addresses `0x1E822` and `0x1E826`: lower bit `n` selects Scan List `n`, while
the upper 16 bits are preserved. Selection edits are baseline-aware and
reverting a band to its original selection removes that pending change.

The same Channel table and Drawer selector edits Scan List membership. It keeps
the ordered member list and inverted bitmap synchronized, prevents additions to
full 128-member lists, and does not change the independent Band A/B active Scan
List selection.

### VFO Scan Edge editor - P1 / IMPLEMENTED; CURRENT-CPS-VERIFIED STORAGE

The `/vfo-scan-edges` workspace immediately presents all 32 fixed Scan Edge
slots, including unused slots, in a searchable table with directly editable
name, low and high frequency, step, and mode columns. Every cell commits
immediately; the first edit to an unused slot initializes its remaining fields
with safe defaults. Inline validation enforces 24-byte UTF-8 names, the 108–660
MHz range, ascending bounds, and the 8.33 kHz AM-only rule. Compact VFO A and
VFO B controls independently select multiple configured edges.

The Codeplug module reads the legacy version-1 single-index header and the
current `EDG1` version-2 bitmaps. An edit upgrades a legacy header to version 2
without losing either band's selection. Record writes preserve the two
unidentified trailing bytes, and all edits participate in baseline-aware Change
Set reconciliation.

---

## 7.8 General Radio Settings - P1/P2 / IMPLEMENTED; DOCUMENTED STORAGE

Documented settings include:

- receive/transmit mode - P1
- cross-band repeat mode - P2
- cross-band repeat monitor - P2
- squelch level - P1
- TX timeout timer - P1
- TX channel behavior - P2
- call hold time - P2
- A-side operating mode - P1
- B-side operating mode - P1
- Auto Repeater - P2
- Auto AM Mode: Off / 108.0–136.0 MHz / 108.0–137.0 MHz - P2
- CI-T USB CDC enable - P2
- CI-T Bluetooth SPP enable - P2
- CI-T Bluetooth BLE enable - P2

A/B operating modes include Channel, VFO/frequency, Call Channel and Weather Channel modes.

These controls are implemented in the localized Radio Settings → Function
Settings workspace. Edits use typed read-modify-write operations, preserve
unknown values and participate in field-level baseline-aware Change Set
reconciliation.

---

## 7.9 Tail & Tone Burst - P2 / IMPLEMENTED; DOCUMENTED STORAGE

- no-signalling tail - P2
- analog tone tail - P2
- digital tone tail - P2
- tail duration - P2
- Tone Burst frequency: 1000 / 1450 / 1750 / 2100 Hz - P2
- Tone Burst duration - P2
- Tone Burst sidetone - P2

---

## 7.10 Scan Behavior - P1 / IMPLEMENTED; DOCUMENTED STORAGE

- scan mode - P1
- MR scan type: Normal / Priority - P1
- CO Resume Delay: 0.0–10.0 seconds in 0.1-second increments - P1
- TO Hold Time: 1.0–10.0 seconds in 0.1-second increments - P1
- Scan Dwell Time: 10 / 20 / 30 / 40 / 50 ms - P1

---

## 7.11 Spectrum - P1 / IMPLEMENTED; CURRENT-CPS-VERIFIED STORAGE

The `/spectrum` workspace edits the Radio's Spectrum configuration from the
Radio Status block. Spectrum Mode supports Center, Edge, Zone, and Scan List.
Scan Speed supports Slow, Mid, High, Very High, and Turbo.

Edge mode always exposes frequency step and modulation. Its local Custom switch
reveals lower and upper frequency inputs without writing a switch byte; current
CPS exports made with Custom open and closed are identical. Frequency bounds,
step, and modulation remain stored while the editor is closed. Validation
enforces 108–660 MHz, ascending bounds, and the 8.33 kHz AM-only rule.

Zone and Scan List modes use their respective 16-item collections. Leaving a
mode restores that mode's fields from the Baseline Backup: Zone selections,
Scan List selections, or Edge range, step, and modulation. Returning to the
baseline mode therefore leaves no hidden mode-specific changes. Empty baseline
masks remain empty; once a collection is edited, the interface requires at
least one selection. The 32-bit Big-Endian masks preserve the upper 16 reserved
bits. Every persisted Spectrum field participates in baseline-aware Change Set
reconciliation; the Custom editor state does not.

---

## 7.12 Power Saving & Weather Channel Behavior - P2/P3 / IMPLEMENTED; DOCUMENTED STORAGE

- power save enable - P2 / IMPLEMENTED PRODUCT
- power-save delay - P2 / IMPLEMENTED PRODUCT
- Weather Channel squelch control - P3 / IMPLEMENTED PRODUCT
- Weather Channel receive mode - P3 / IMPLEMENTED PRODUCT
- Weather Channel scan-selection mask - P3 / IMPLEMENTED PRODUCT
- Weather Channel decode reset time - P3 / IMPLEMENTED PRODUCT

Weather Channel controls are presented only in Radio Settings → Function
Settings, matching the current TYT CPS. No standalone WX page is planned.

---

## 7.13 Display Settings - P1/P2/P3 / IMPLEMENTED; DOCUMENTED STORAGE

- backlight level - P2
- auto dim - P2
- auto-dim delay - P2
- exit dimming on RX - P2
- exit dimming on TX - P2
- startup image enable - P3
- firmware version at boot - P2
- startup message enable/text - P2
- battery voltage at startup - P2
- channel display fields (frequency/name/zone) - P2
- coordinate/speed/altitude/distance/rain/wind/temperature units - P2
- system language - P2
- theme - P2
- menu auto-exit - P2
- battery display style - P2
- RX indicator - P2
- screen-off indicator - P2
- signal strength display: Off / dBm / RSSI+dBm - P1

Documented languages: Simplified Chinese, Traditional Chinese, English, Turkish.

The localized Display Settings workspace implements every field above with
unknown-value preservation, storage validation and per-field Change Set
reconciliation.

---

## 7.14 Audio Settings - P2 / IMPLEMENTED; DOCUMENTED STORAGE

- key beep - P2
- low-battery beep - P2
- power-on beep - P2
- TX timeout beep - P2
- call-start beep - P2
- call-end beep - P2
- scan-start beep - P2
- scan-pause beep - P2
- scan-stop beep - P2
- microphone gain - P2
- AM / AM-N analog RX gain: 0–15 - P2
- AM / AM-N digital RX gain: −26.0–+5.5 dB in 0.5 dB increments - P2
- AI voice control enable/sensitivity/delay - P2
- AI noise reduction enable - P2

The CPS only configures these persisted options; DSP behavior is firmware-internal.

The localized Sound Settings workspace implements every persisted option above
with reserved-bit preservation and per-field Change Set reconciliation.

---

## 7.15 Programmable Keys - P1 / IMPLEMENTED; DOCUMENTED STORAGE

Configurable controls include Side Key 1/2, top key, 0–9 long press, Menu long press and Back long press.

Documented actions include:

- None
- Voice Control
- Beacon TX
- Squelch Off
- Scan
- Scrambler
- Talk Around
- Noise Reduction
- One-Key Frequency Match
- Power Level
- Reverse
- FM Radio
- Channel Mode
- Emergency Alarm
- APRS Stations
- Squelch Level
- Tone Scan
- GPS
- GPS Position
- GPS Satellites
- Bluetooth
- Zone Select
- Scan List Select
- Spectrum
- Copy to MR
- Monitor
- Debug Information

Long-press list also includes Tone Burst TX. Short-press and long-press index maps are not identical and must be implemented separately.

The Keyboard Settings workspace uses the separate documented short-press and
long-press maps and exposes every listed key assignment. Unknown raw indexes are
preserved until the user intentionally selects a documented action.

---

## 7.16 Keyboard Lock - P2 / IMPLEMENTED; DOCUMENTED STORAGE

- auto lock - P2
- lock type - P2
- lock delay - P2

Lock combinations include keys, encoder, PTT and combinations thereof.

---

## 7.17 Menu Visibility - P2 / IMPLEMENTED; CURRENT-CPS-VERIFIED STORAGE

Current Menu display mask: `0x0001EA00`, 256 bytes. Controlled exports from
the 2026-07-23 TYT CPS leave the older `0x0001BA00` block unused.

Bits `0–173` use an LSB-first Show/Hide bitmap. Bits `166–173` add Image
Version, Language Version, AM RX Gain, AM-N RX Gain, Auto Repeater, CI-T, Auto
AM Mode, and Scan Edge INIT. GPS bit 20 is Time Zone.

Present the settings as the radio's hierarchy, with cascading and indeterminate
parent controls, search, and Show All/Hide All actions. Preserve every bit after
173 and all unrelated bytes.

The localized Menu Visibility workspace implements this hierarchy and tracks
each changed item against the Baseline Backup.

---

## 7.18 FM Broadcast Radio - P3 / IMPLEMENTED; DOCUMENTED STORAGE

The localized `/fm-radio` workspace exposes all 32 fixed FM preset slots in a
compact searchable table aligned with the Memory Channel editor. Each row shows
its `FM-00` through `FM-31` slot, Used state, 24-byte UTF-8 name and broadcast
frequency. Search and immediate inline editing follow the same Working Codeplug
behavior as Channels, while all 32 hardware slots remain visible.

The settings card exposes the FM receiver switch, VFO/Memory operating mode and
VFO frequency. Preset and VFO frequencies are validated from 64.0 through
108.0 MHz in 0.1 MHz steps. Edits preserve each preset's four reserved bytes,
update only the documented validity bit or field bytes, and reconcile against
the immutable Baseline Backup.

- 32 FM presets - P3 / IMPLEMENTED
- preset-valid bitmap - P3 / IMPLEMENTED
- FM radio enable - P3 / IMPLEMENTED
- VFO/Memory mode - P3 / IMPLEMENTED
- FM VFO frequency - P3 / IMPLEMENTED

Documented FM VFO range: `64.0 → 108.0 MHz`.

#### Source discrepancy

The Data Storage Reference's overall map describes `0x00015404–0x00015406` as FM receiver switch, noise suppression and auto scan. Its detailed FM table defines the switch at `0x00015404` but does not define `0x00015405–0x00015406`; mode and VFO frequency are stored elsewhere. Preserve bytes `0x00015405–0x00015406` and treat noise suppression/auto scan as FUTURE / RESEARCH until their encoding is documented or hardware-verified.

---

## 7.19 APRS

APRS block: `0x00015500`, 1024 bytes.

### APRS editor - P1/P2 / IMPLEMENTED; CONTROLLED-CODEPLUG-VERIFIED STORAGE

The localized `/aprs` page exposes Station Identity, Beacon Transmission,
Fixed Beacon Position, Manual Beacon, Digipeater Path, Comment, RX Decode,
eight APRS TX Channels and TNC output settings. Edits update only the Working
Codeplug and reconcile each top-level APRS field against the immutable Baseline
Backup. The page does not start a live TNC stream, send a beacon immediately or
claim that fixed coordinates came from current GPS data.

Controlled before/after Codeplug comparisons verified both SSID offsets, symbol
index changes, 1–6-character destination callsigns, fixed-position coordinate
decoding, metre altitude scaling, big-endian Hz TX frequency, digipeater entries,
zero-padded comments and USB/SPP/BLE TNC pairs. TYT CPS can retain stale bytes in
the unused tail of a shorter six-byte callsign. The Codeplug decoder ignores the
invalid tail; intentional callsign edits clear and rewrite the complete field.
The manual interval index 23 is presented as the corrected 45-second value; TYT
CPS incorrectly displays it as a duplicate 55-second entry.

Features:

- callsign - P1
- SSID 0–15 - P1
- APRS symbol/table - P1
- decode CRC - P2
- decode filters: MIC-E, Position, Weather, Object, Item, Status, Other - P2
- popup behavior - P2
- ring behavior - P2
- destination callsign/SSID - P1
- beacon type: Fixed / GPS - P1
- auto beacon interval - P1
- TX pre-carrier - P2
- TX end delay - P2
- TX sidetone - P2
- RF beacon transmission - P1
- APRS TX channel selection - P1
- manual beacon mode - P2
- manual beacon side/band - P2
- fixed latitude/longitude/altitude - P2
- digipeater path, up to 8 entries - P1
- APRS comment/description - P2
- 8 APRS TX channel records - P1
- TNC output settings - P2

TNC output modes are documented for USB virtual serial, classic Bluetooth SPP and BLE, with KISS/GPWPL/UI-text formats. This does **not** by itself prove browser CPS transport over Bluetooth.

---

## 7.20 GPS - P2 / IMPLEMENTED; DOCUMENTED STORAGE

- GPS enable - P2
- timezone - P2
- GNSS mode - P2

Supported GNSS combinations:

- GPS
- BeiDou
- GPS + BeiDou
- GLONASS
- GPS + GLONASS
- BeiDou + GLONASS
- GPS + BeiDou + GLONASS

The localized `/gps` workspace implements the receiver switch, every supported
constellation combination and every documented time-zone offset. It preserves
unknown stored values and reconciles changes per field against the Baseline
Backup.

---

## 7.21 Bluetooth Settings

### Bluetooth editor - P2 / IMPLEMENTED; DOCUMENTED STORAGE

The localized `/bluetooth` page exposes Bluetooth enable, host/peripheral role,
BT hold time from 1 to 300 seconds or Infinite, built-in speaker and microphone
control, and eight-level Bluetooth speaker and microphone gain. Each edit
updates only its owning byte in the Working Codeplug and reconciles a per-field
Change Set entry against the immutable Baseline Backup. Unknown raw values
remain visible and unchanged until the user makes an intentional selection.

Controlled TYT CPS `.PF` exports identify BT hold time at `0x0001544B`. Raw
indexes `0x00~0x22` select the ordered finite values and `0x23` selects
Infinite. After masking this one byte, all ten controlled exports are identical.

Pairing, paired-device history and Bluetooth module status remain Radio-side
runtime features because no Codeplug layout or clone-protocol commands are
documented for them. CI-T Bluetooth SPP/BLE controls remain in Function
Settings, and APRS Bluetooth TNC output remains in APRS.

---

## 7.22 DTMF

DTMF block: `0x00016000`, 1024 bytes.

Implementation status (2026-08-27): complete in the browser CPS. The typed
codec and editor cover every setting below, all 16 memories and all eight PTT
ID records. Edits use read-modify-write and preserve reserved bytes.

Features:

- local ID - P2
- separator/group-call code - P2
- dialer type - P2
- encoder sidetone/timing - P2
- first-digit timing - P2
- pre-carrier / after-send delay - P2
- D-code pause - P2
- PTT ID pause - P2
- decoder response - P2
- auto reset - P2
- ANI display - P2
- remote inhibit/kill/stun/wake codes - P3
- 16 DTMF encode memories - P2
- 8 PTT ID definitions - P2
- local browser Tone Preview for every non-empty encode memory - P2

---

## 7.23 2-Tone

Block: `0x00016800`, 512 bytes.

Implementation status (2026-08-27): complete in the browser CPS. Both 16-row
tables and all global settings are editable. Frequencies are encoded as
little-endian unsigned tenths of a hertz; blank tone cells retain the Radio's
empty-record representation.

- encoder/decoder timing - P3
- 16 encode records - P3
- 16 decode records - P3
- Tone1/Tone2 values - P3
- response and names - P3
- local browser Tone Preview for single-long-tone and two-tone encode records - P3

---

## 7.24 5-Tone

Block: `0x00017000`, 2048 bytes.

Implementation status (2026-08-27): complete in the browser CPS. The editor
covers all global encode/decode settings, 16 encode records, eight PTT ID
records and 16 information-code records.

- local ID - P3
- encoder timing/settings - P3
- pause code/timing - P3
- PTT ID pause - P3
- decode standard - P3
- decode digit mask - P3
- decode response/reset/ANI - P3
- 16 encode records - P3
- 8 PTT ID records - P3
- 16 information-code records - P3
- local browser Tone Preview for every supported encode record - P3

Documented standards include ZVEI1/2/3, PZVEI, DZVEI, PDZVEI, CCIR1/2, PCCIR, EEA, EURO SIGNAL, NATEL, MODAT, CCITT and EIA.

The standard byte is the zero-based index in this exact order: ZVEI1=`0x00`,
ZVEI2=`0x01`, ZVEI3=`0x02`, PZVEI=`0x03`, DZVEI=`0x04`, PDZVEI=`0x05`,
CCIR1=`0x06`, CCIR2=`0x07`, PCCIR=`0x08`, EEA=`0x09`, EURO SIGNAL=`0x0A`,
NATEL=`0x0B`, MODAT=`0x0C`, CCITT=`0x0D`, EIA=`0x0E`. The same mapping is used
for the decoder, encode-list records and PTT ID records.

Production verification covers the documented storage regions, exact offsets,
standard indexes, 2-Tone frequency encoding, validation, round trips,
read-modify-write behavior and reserved-byte preservation. DTMF, 2-Tone and
5-Tone are complete production Codeplug features. Functional over-the-air
signalling behavior is a Radio operation concern rather than an unfinished CPS
storage implementation.

Tone Preview is a separate browser-only aid. It synthesizes the current DTMF,
2-Tone or 5-Tone encode row through Web Audio after an explicit **Listen**
action. It does not open Web Serial, transmit RF, access the Radio, or edit the
Codeplug. DTMF preview applies the configured first-digit duration and optional
D-code silence. 2-Tone preview distinguishes a single long tone from a two-tone
sequence and applies the configured gap. 5-Tone preview applies the selected
standard's nominal frequency plan and timing, repeat-tone substitution, pause
code, first-digit duration, and first-tone-after-pause duration. `*` and `#`
use the Radio keypad aliases for `E` and `F`.

The nominal 5-Tone plans and timings are cross-checked against the
[VIAVI 3900 Series Operation Manual](https://www.viavisolutions.com/en-us/literature/3900-series-digital-radio-test-set-operation-manual-discontinued-manuals-user-guides-en.pdf),
Appendix H. The CCITT plan is cross-checked against the
[UDXF DigiFAQ reference](https://www.udxf.nl/Digifaq53.pdf), Table 5-I. Browser
output is an audible configuration preview, not calibrated test equipment and
not proof of over-the-air interoperability.

---

# 8. Product Features Beyond the Vendor CPS

## 8.1 Change Set review - IMPLEMENTED; REQUIRED FOR RADIO WRITE

Before writing, show user-facing changes such as:

```text
CH 012
  TX Tone
  Off → 131.8 Hz

CH 043
  Name
  RPT1 → ANTALYA
```

## 8.2 Baseline recovery reference - REQUIRED FOR RADIO WRITE

Radio Write uses the immutable Baseline Backup from the initial Radio Read as
its recovery reference. Preparation does not perform another Radio Read. The
operator explicitly selects the Source Radio port, and the actual write session
must pass the E1 identity, firmware, and write-protection checks before E3.

## 8.3 Complete writes - IMPLEMENTED

Documented write flow:

```text
E0/E1 → E3 → E4 block → E6 ACK → repeat
   → E5 "Write Complete" → reboot
```

The docs do not establish atomic writes. Assume disconnect can leave partially changed SPI flash.

Implemented internal safety model:

- verify Source Radio identity, firmware, and write protection through E1 immediately before E3
- write every block in the declared range unless partial-write behavior is separately hardware-verified
- ACK validation
- address/length echo validation
- send `E5 "Write Complete"` to finish the write session and reboot
- report success after all blocks and the E5 `Reboot` response are validated
- do not reconnect or perform an automatic Radio Read after reboot
- create a new Baseline Backup from the accepted intended write image
- after writing may have begun, report `Write Outcome Unknown` only if completion is interrupted before the E5 `Reboot` response is validated
- persist the complete recovery artifacts, references, hashes, and phase

Changed-block or other partial-write strategies are FUTURE / RESEARCH. The supplied protocol describes sending blocks until all data in the declared range has been sent; it does not establish that omitted blocks are safe.

## 8.4 Interrupted-write handling - IMPLEMENTED

Do not blindly resume an interrupted transfer from the last ACK. Retain
`Write Outcome Unknown` when a transfer stops after its first E4 attempt and
before the E5 `Reboot` response is accepted. The operator may close that status;
the Radio Write workflow does not start an automatic recovery read.

The CPS Workspace now persists the complete safety record through a Radio Write
store seam, restores an interrupted E4 transfer as `Write Outcome Unknown`, and
clears the record after a completed write or when the operator closes the
status. The IndexedDB adapter and user-facing review, confirmation, progress,
completion, and operation-report UX are implemented.

## 8.5 Bulk editing - HIGH VALUE / PLANNED

Single-Channel add, duplicate, delete and drag-to-reorder operations are
implemented. Selection-wide bulk field editing remains planned.

- set tone for selection
- set power/mode
- assign zone/scan list
- mark RX-only
- enable/skip scan
- duplicate channels
- patterned rename

## 8.6 Search/filtering - HIGH VALUE / IMPLEMENTED

The Channel table supports Used/All filtering, free-text search by name,
number, frequency, tone, Zone, Scan List and mode, plus combinable Mode, Tone,
Zone and Scan List selectors. VFO Scan Edges and FM Broadcast presets also have
focused search.

## 8.7 Validation/warnings - HIGH VALUE

Storage bounds, encoded options, UTF-8 byte limits, frequencies, collection
capacity and representation consistency are validated by the implemented
editors and Codeplug operations. The Channel editor also presents advisory
warnings when an RX CTCSS/DCS tone is enabled or a TX frequency falls outside
the published 144–148 MHz and 420–450 MHz amateur ranges. The Channels
workspace reports inconsistent Zone/Scan List ordered-list and bitmap
representations before editing continues. These are guidance warnings; exact
operator privileges and regional band plans remain the operator's
responsibility.

## 8.8 Saved Working Codeplugs - P1 / IMPLEMENTED

The Backups workspace can save an explicitly named immutable copy of the active
Baseline Backup and Working Codeplug in IndexedDB. Names are unique, copies
retain Source Radio/layout binding and CPS File integrity metadata, and entries
can be opened, exported, renamed or deleted. Opening reuses normal `.73kcps`
verification. Saving never silently overwrites or autosaves the active document;
each save creates a new snapshot. The UI reports whether browser storage is
persistent or best-effort.

## 8.9 Undo/redo - P1 / IMPLEMENTED

Undo/redo is document-wide and restores the Working Codeplug bytes and semantic
Change Set together. Every committed editing command is one history step,
including table-cell commits, row and membership operations, settings changes,
and Reset All. Draft text inside a focused form control keeps its native browser
undo behavior and does not create Codeplug history until the edit is committed.

The persistent header provides Undo and Redo controls. Keyboard shortcuts follow
desktop conventions: `Ctrl+Z` / `Command+Z` for Undo and `Ctrl+Y` or
`Ctrl+Shift+Z` / `Command+Shift+Z` for Redo. Shortcuts are not intercepted while
focus is in an input, textarea, select, contenteditable element or modal dialog.

History is session-only and retains at most 100 compact Codeplug-byte revisions;
it is not stored in IndexedDB, included in exports or sent to Radio Write. A new
edit after Undo discards the Redo branch. Radio Read, file import, opening a saved
Working Codeplug and other document replacements start a fresh history. History
actions are unavailable while a radio operation or prepared Radio Write snapshot
is active.

## 8.10 Source Radio write-session comparison - IMPLEMENTED

The operator selects the serial port before preparation. The actual write
session compares the E1 identity with the Source Radio and validates firmware
and write protection before E3. A mismatch stops before the first write block.

## 8.11 Additional import/export formats - P1/P2

Potential formats and binding rules:

- raw `.bin`: implemented for the validated firmware 3.07.23 102,400-byte layout; imports as an Unbound Codeplug and re-exports edited raw bytes
- `.73kcps`: implemented; preserves Radio Model, support profile, baseline and working bytes, Source Radio identity, layout metadata, and integrity hashes
- CSV: imports as an Unbound Codeplug
- CHIRP-compatible CSV: imports as an Unbound Codeplug

JSON must not become the canonical Codeplug representation. JSON metadata may be used inside a CPS Export, but the exact Codeplug bytes remain authoritative.

## 8.12 PWA/offline use - P1

The application publishes a standalone web app manifest and a same-origin
service worker. The worker caches the localized application shell, visited
pages, Next static assets, the app icon and APRS symbol sprites. It never caches
`.73kcps`, `.bin`, `.Fir`, `.DAT` or JSON artifacts, and it does not force a
new worker to take over an active session. Offline use is limited to previously
cached application routes/assets; first-time routes and browser/Radio APIs still
depend on the browser environment.

---

# 9. Current Product Navigation

```text
73Kit
├── Home
├── Radio CPS
│   ├── Select Radio Model
│   └── TYT UVL-15W / Tekser TR-UV15
│       ├── Overview
│       ├── Radio
│       ├── Channels
│       ├── Zones
│       ├── Scan Lists
│       ├── VFO Scan Edges
│       ├── Radio Settings
│       │   ├── Function Settings
│       │   ├── Display Settings
│       │   ├── Sound Settings
│       │   ├── Keyboard Settings
│       │   └── Menu Visibility
│       ├── APRS
│       ├── GPS
│       ├── Spectrum
│       ├── Bluetooth
│       ├── FM Radio
│       ├── Signal System
│       ├── Backups
│       └── Firmware and Resources (Beta)
├── Diagnostics
└── About
```

All selected-model entries share `/{locale}/cps/{radioModel}/...`. The model
registry filters capabilities; it does not duplicate route files.

---

# 10. Recommended Implementation Roadmap

## Epic 1 - UVL-15W Radio connection & Transport seam

- [x] Transport interface owned by the UVL-15W Radio module
- [x] Web Serial adapter
- [x] scripted Transport test adapter
- [x] continuous RX pump
- [x] stream parser
- [x] operation-scoped open/close lifecycle
- [x] secure-context and browser capability handling
- [x] local Diagnostics & Support workspace with sanitized history and email handoff

## Epic 2 - Read protocol

- [x] E0/E1
- [x] E2
- [x] E6/E4
- [x] progress
- [x] E5 Read Complete
- [x] safe error handling/retry

## Epic 3 - Codeplug core

- [x] Codeplug module with private exact-byte preservation
- [x] private memory-map constants and binary helpers
- [x] typed Channel codec and read-modify-write editors
- [x] validity bitmap
- [x] scan bitmap
- [x] preserve unknown and reserved bytes

## Epic 4 - Channel inspection and ordering UI

- [x] virtualized 1000-row Memory table
- [x] used/all filter, broad search and Mode/Tone/Zone/Scan List filters
- [x] Basic/Advanced column visibility and complete details
- [x] CTCSS/DCS formatting
- [x] mode/power display
- [x] Zone/Scan List membership parsing and display
- [x] compact VFO A/B and Call 1/2 views
- [x] tracked drag-to-reorder with record and membership-reference remapping
- [x] add, duplicate and delete-with-compaction Memory Channel row actions

## Epic 5 - Offline editing model

- [x] Memory Channel scalar-field editing directly in table cells
- [x] 24-byte UTF-8 name and storage-level frequency/value validation
- [x] reset all Working Codeplug edits to the Baseline Backup
- [x] CTCSS/DCS indexed-value editing in the Memory table and details Drawer
- [x] Zone and Scan List membership editing
- [x] VFO/Call Channel editing
- [x] semantic Change Set tracking against the Baseline Backup
- [x] Change Set review
- [x] document-wide, bounded undo/redo with standard desktop shortcuts

Radio Write is implemented and released for the firmware-`3.07.23`, USB CDC,
Source-Radio-bound, unprotected-Radio production scope. It always writes the
complete materialized Codeplug and ends at the validated reboot response.

## Epic 6 - Zones & scan lists

- [x] shared immutable Zone and Scan List domain interface
- [x] rename and ordered-member replacement operations
- [x] per-Channel Zone and Scan List membership operations
- [x] ordered-list and inverted-bitmap synchronization
- [x] 128-member capacity and consistency validation
- [x] Zone page
- [x] Scan List page
- [x] Channel table and Drawer membership controls
- [x] A/B multi-Zone selection
- [x] A/B active Scan List selection
- [x] Scan List Off/Skip/Priority display and Drawer editing

## Epic 7 - Safe writer

- [x] retain the immutable Baseline Backup as the recovery reference
- [x] explicit operator serial-port selection before preparation
- [x] Source Radio identity and firmware comparison before E3
- [x] E3/E4/E6 protocol writer behind the Radio interface
- [x] strict ACK validation and destructive-boundary error details
- [x] E5 Write Complete protocol completion
- [x] completion after all E6 ACKs and the validated E5 `Reboot` response
- [x] no automatic reconnect or Radio Read after writing
- [x] durable `Write Outcome Unknown` handling across reload
- [x] operator-dismissible interrupted-write status without automatic Radio Read

Partial or changed-block writes are excluded until hardware-verified.

## Epic 8 - General radio settings

- [x] Function Settings page and typed codec
- [x] Display Settings page and typed codec
- [x] Sound Settings page and typed codec
- [x] power saving, Weather Channel, Tail, Tone Burst and Scan Behavior settings
- [x] Spectrum page, codec, validation, and semantic Change Set tracking

## Epic 9 - Programmable keys / menu visibility

- [x] programmable-key and Keyboard Lock editor
- [x] separate short-press and long-press action maps
- [x] hierarchical Menu Visibility editor with cascade and search
- [x] semantic Working Codeplug Change Set tracking

## Epic 10 - APRS

- [x] APRS page and typed codec
- [x] APRS symbol, beacon, path, fixed-position, receive and TNC settings
- [x] semantic Working Codeplug Change Set tracking

## Epic 11 - GPS & Bluetooth settings

- [x] GPS page, typed codec and semantic Change Set tracking
- [x] Bluetooth page, typed codec and semantic Change Set tracking

## Epic 12 - DTMF / 2-Tone / 5-Tone

- [x] Typed codecs and persisted editors for DTMF, 2-Tone and 5-Tone
- [x] Semantic Working Codeplug change tracking
- [x] Channel signaling-record selection
- [x] Documented storage regions, offsets, encodings and indexes verified
- [x] Read-modify-write and unrelated-byte preservation verified

## Epic 13 - FM radio / advanced settings

- [x] FM Broadcast page, 32 presets, documented settings and Change Set tracking
- [x] Weather Channel settings remain in Function Settings; fixed WX records are intentionally internal
- [ ] FM noise-suppression/auto-scan encoding research

## Epic 14 - PWA / saved Working Codeplugs / import-export

- [x] exact immutable Baseline Backup Raw Backup Export
- [x] firmware-3.07.23 Raw Backup import as an Unbound Codeplug with edited raw re-export
- [x] identity-bound CPS File export, verified import, offline reopen/edit/re-export, direct Backup History restore, and same-layout restore preparation
- [x] durable Backup History
- [x] named immutable IndexedDB Working Codeplug snapshots
- [x] installable application shell with static-only offline caching

---

# 11. TDD / Required Binary Fixtures

### E0 handshake

```text
FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD
```

### E2 full read

```text
FE FE EE EF E2 80 80 00 80 80 82 90 80 EE FD
```

Tests should cover:

- escaping/unescaping
- uint8 overflow
- LRC generation/verification
- split serial chunks
- multiple frames per chunk
- garbage/preamble recovery
- invalid tail/LRC
- unexpected command
- `EE` error response

---

# 12. Safety Rules for Codex / Agents

> **Do not send any radio write command unless the active task explicitly authorizes radio writes.**

During read-only milestones, keep disabled:

```text
E3 Start Write
host→radio E4 write data
firmware update commands
```

`E5 "Read Complete"` is permitted because it terminates the read session.

---

# 13. Feature Status Matrix

## P0 - Core CPS

- [x] Web Serial PoC
- [x] E0/E1 physical test
- [x] E2 physical test
- [x] E6/E4 physical read test
- [x] full 102,400-byte physical read
- [x] E5 Read Complete behavior understood
- [x] production transport abstraction
- [x] production Radio Read workflow
- [x] radio-information UI
- [x] Codeplug core
- [x] Raw Backup Export
- [x] CPS File export, verified import, offline reopen/edit/re-export, and same-layout restore preparation
- [x] Backup History
- [x] Channel parser
- [x] virtualized 1000-channel table
- [x] CTCSS/DCS display
- [x] typed Zone names and membership codec
- [x] typed Scan List names and membership codec

## P1 - Main Product

- [x] channel editing
- [ ] bulk edit
- [x] Change Set review
- [x] undo/redo
- [x] saved Working Codeplugs
- [x] zone editor
- [x] scan-list editor
- [x] VFO/Call Channel editor
- [x] VFO Scan Edge editor
- [x] Spectrum settings
- [x] radio settings
- [x] programmable keys
- [x] APRS
- [x] complete Radio Write through validated reboot response
- [x] durable interrupted-write `Write Outcome Unknown` handling
- [x] imported CPS File binding requires a fresh same-Source-Radio read before restore
- [x] firmware-3.07.23 Raw Backup import and Unbound Codeplug enforcement

## P2 - Extended Codeplug Settings

- [x] display settings
- [x] audio settings
- [x] AI voice control
- [x] AI noise reduction
- [x] GPS
- [x] Bluetooth settings
- [x] menu visibility
- [x] power saving
- [x] Tone Burst
- [x] APRS TNC settings

## P3 - Advanced / Specialist

- [x] DTMF
- [x] remote signalling codes
- [x] 2-Tone
- [x] 5-Tone
- [x] FM Broadcast presets and receiver settings
- [x] Weather Channel settings in Function Settings
- [ ] FM noise-suppression/auto-scan encoding research

## Future / Research

- [ ] Bluetooth SPP transport for CPS
- [ ] BLE/Web Bluetooth transport for CPS
- [ ] Node serial transport
- [ ] desktop/Tauri transport
- [x] official Firmware `3.7.23` protocol captured and reproduced offline
- [x] Language `1.01.05` Resource Flash captured bidirectionally
- [x] Image `1.01.00` Resource Flash captured bidirectionally
- [x] combined Language/Image Resource Flash captured bidirectionally
- [x] Language/Image/combined DAT structure and inclusion verified offline
- [x] explain variable Resource Flash `E3` source and pin compatibility payloads
- [x] catalog-driven browser Firmware Update released as single-Radio beta
- [x] catalog-driven browser Resource Flash released as single-Radio beta
- [x] physical browser success path for each supported package kind
- [x] scripted first/middle/final-block interruption classification for Firmware and Resource Flash
- [ ] second-Radio physical update and interruption/recovery validation
- [ ] custom firmware tooling

---

# 14. Primary Technical References

## 14.1 TYT UVL-15W Communication Protocol V3.0

Expected repository path:

```text
docs/technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md
```

Authoritative for frame format, escaping, LRC, E0–E7, read/write flows, errors and retries.

## 14.2 TYT UVL-15W Data Storage Reference V1.0

Expected repository path:

```text
docs/technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md
```

Authoritative for memory map, channel layout, settings, zones, scan lists, APRS, GPS, Bluetooth and signalling data structures.

## 14.3 TYT UVL-15W Update Protocol V1.0

Repository path:

```text
docs/technical/TYT_UVL-15W_UPDATE_PROTOCOL_V1.0.md
```

Authoritative in this repository for captured Firmware Update and Resource Flash
behavior, package validation, evidence limits, and updater safety states. The
offline evidence manifest and reproduction procedure are in
`docs/research/firmware-flash-language-update-research.md`.

---

# 15. External Cross-References

These are secondary product/ecosystem references. They must **not** override the supplied technical specifications.

## TYT official downloads

```text
https://www.tyt888.com/download.html
```

The official page lists UVL-15W firmware and CPS packages, including 2026 releases.

## RT Systems UVL-15W programmer

```text
https://www.rtsystemsinc.com/uvl-15w.html
https://www.rtsystemsinc.com/RPS-UVL15W-Programming-Software-only-for-the-brTYT-UVL-15W-radio-_p_2495.html
```

RT Systems independently advertises UVL-15W support for:

- 1,000 Channels
- 16 zones
- 16 scan lists
- 2 VFO channels
- 2 Call channels
- common settings
- APRS
- DTMF
- Keys/Menu
- 2-Tone
- 5-Tone
- spreadsheet editing
- copy/paste
- bulk/column editing
- multiple programming files

Use this for product-design comparison, not byte-level truth.

---

# 16. Product Direction

Do not aim to build merely **"TYT CPS in a browser."**

Aim to build:

> **A safe, modern, local-first CPS, with the TYT UVL-15W as the first supported Radio.**

Differentiators should include:

- direct browser connection
- reviewable Change Sets
- automatic recovery Codeplug Backups
- completed writes
- preservation of unknown bytes
- bulk editing
- better zone/scan-list UX
- offline Working Codeplugs
- semantic validation
- stable CPS Workspace, UVL-15W Radio and Codeplug module interfaces
- transport-independent UVL-15W Radio behavior behind its Transport seam

---

# 17. Instruction to Codex

When implementing a feature from this document:

1. Locate the relevant section in both primary `docs/technical` specifications.
2. Verify addresses, lengths, endian rules and indexes directly from those specs.
3. Write/update binary fixtures before implementation.
4. Keep parsing/encoding outside React components.
5. Preserve reserved and unknown bytes.
6. Never infer a stored value from a UI label alone.
7. Keep documented, experimentally verified and planned behavior distinct.
8. Do not introduce radio writes unless explicitly requested.
9. If the technical docs conflict, document the conflict and stop before choosing a destructive interpretation.
10. Prefer exact binary correctness over abstraction convenience.

This document is a roadmap and feature catalogue. The two technical documents remain the authoritative source for byte-level implementation.
