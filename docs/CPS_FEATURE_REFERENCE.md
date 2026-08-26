# TYT UVL-15W Browser CPS — Feature & Capability Reference

> **Purpose:** Canonical feature reference for implementation planning and Codex-assisted development.
>
> **Project:** Browser-based CPS for the TYT UVL-15W
>
> **Primary stack:** Next.js + React + TypeScript + Web Serial
>
> **Status convention used in this document**
>
> - **PROVEN** — verified against a physical UVL-15W using the browser PoC.
> - **DOCUMENTED** — explicitly supported by the supplied TYT protocol/storage documentation.
> - **IMPLEMENTED** — present in production source and covered by automated verification; this does not by itself claim physical Radio validation.
> - **PLANNED** — product capability we intend to implement using documented data/protocol behavior.
> - **OPTIONAL** — enhancement that is not required to reproduce the vendor CPS.
> - **FUTURE / RESEARCH** — requires additional protocol work, browser transport work, or product decisions.

---

## 1. What This Project Is

This project is a modern, browser-based **CPS (Customer Programming Software)** for the **TYT UVL-15W** handheld radio.

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

---

## 2. Scope Boundary: CPS vs Firmware

The CPS is primarily responsible for the radio's Codeplug stored in external SPI flash.

The documented CPS memory region is:

```text
0x00008000 → 0x00021000
```

Total size:

```text
102,400 bytes
```

This includes Channels, VFOs, Call Channels, Zones, Scan Lists, radio settings, APRS, GPS, Bluetooth, DTMF, 2-Tone, 5-Tone and related Codeplug data.

MCU firmware updates use a separate update/bootloader path and `.Fir` packages. Firmware flashing is **not** part of the initial CPS implementation.

---

## 3. Current Hardware-Validated Capabilities

The browser proof of concept has already been tested against a physical TYT UVL-15W.

### 3.1 Browser → radio connection — PROVEN TRANSPORT

- Web Serial works with the radio's USB CDC interface.
- Chrome on macOS can connect directly to the radio.
- The currently tested host-side serial configuration uses `115200` baud.
- Because this is USB CDC, the baud setting may not represent a physical UART rate and may be ignored by the Radio implementation.
- Initial browser targets are Chrome/Edge/Chromium with Web Serial support.

### 3.2 Radio handshake — PROVEN

The radio responds to the documented `E0` handshake using `"UVL-15W"`.

Known-good request frame:

```text
FE FE EE EF E0 D5 D6 CC AD B1 B5 D7 9F FD
```

### 3.3 Radio information — PROVEN / DOCUMENTED

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

#### Source discrepancy

The Communication Protocol describes one E1 payload as **71 bytes**, but the documented field offsets extend through byte 80, which describes an **81-byte structure**. The newer Data Storage Reference also describes E1 as 81 bytes. Parse defensively and preserve this discrepancy in documentation/tests.

### 3.4 Full Radio Read — PROVEN

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

### 3.5 Read-session completion — PROVEN

`E5 + "Read Complete"` is required after a complete read. Without it, the physical radio was observed remaining on `PC Reading 99%`.

---

## 4. Protocol Capabilities

Primary reference: `docs/technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md`

### 4.1 Framing — DOCUMENTED

- Host → radio core header: `FE EE EF`
- Radio → host core header: `FE EF EE`
- Frame tail: `FD`

At least one additional `FE` preamble byte is required before the core header for synchronization/wake behavior.

### 4.2 Byte escaping — DOCUMENTED / PROVEN

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

### 4.3 LRC — DOCUMENTED / PROVEN

LRC is calculated over unescaped payload bytes only:

```text
LRC = uint8(0x100 - (sum(payload) & 0xFF))
```

Then escape the LRC byte like payload data.

### 4.4 Stream parsing — PROVEN IMPLEMENTATION REQUIREMENT

Do not assume one `reader.read()` equals one protocol frame. Responses may be split across arbitrary USB chunks.

Do not use `Promise.race(reader.read(), timeout)` because the losing `reader.read()` remains pending and may consume a later response. Use one long-lived receive loop and a streaming frame parser.

---

## 5. Normal CPS Commands

| Command | Purpose                                                        | Project status                             |
| ------- | -------------------------------------------------------------- | ------------------------------------------ |
| `E0`    | Request radio information / handshake                          | **PROVEN**                                 |
| `E1`    | Radio information response                                     | **PROVEN**                                 |
| `E2`    | Start read session                                             | **PROVEN**                                 |
| `E3`    | Start write session                                            | **DOCUMENTED, NOT YET ENABLED**            |
| `E4`    | Host→radio write block / radio→host read response by direction | **READ RESPONSE PROVEN; WRITING DISABLED** |
| `E5`    | Complete read/write session and reboot                         | **READ COMPLETE PROVEN**                   |
| `E6`    | Host read request / radio write ACK by direction               | **READ REQUEST PROVEN**                    |
| `E7`    | Read/write password validation                                 | **DOCUMENTED**                             |
| `EE`    | Error response                                                 | **DOCUMENTED**                             |

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

The production Codeplug core exposes immutable typed Channel results and
read-modify-write operations for implemented Memory Channel fields while
keeping the memory map, binary helpers, lookup tables and raw bytes private.
Unknown or reserved values remain opaque, untouched record bytes are preserved,
and every edit creates a new immutable Working Codeplug.

---

# 7. Complete Feature Catalogue

## 7.1 Radio & Connection

### Operation-scoped connect/disconnect — P0 / IMPLEMENTED PRODUCT; PROVEN TRANSPORT

- request a Web Serial port for every Radio operation
- open and close the connection within the operation
- distinguish unsupported browsers from insecure contexts
- expose idle, connecting, reading and ready operation phases
- release the port and reset receive state after success or failure

The CPS does not maintain a persistent Radio connection between operations. A later Radio Read starts a fresh operation and requests a port again. Post-reboot reconnection is reserved for the verified Radio Write workflow, where a complete verification Radio Read is mandatory.

Protocol diagnostics remain planned for a later milestone; no diagnostics log or diagnostics UI is implemented in this milestone.

### Read radio information — P0 / IMPLEMENTED PRODUCT; PROVEN PROTOCOL

Display model, firmware, hardware, serial number, CPU ID, bootloader model, resource version and read/write protection state.

---

## 7.2 Backups, Working Codeplugs & Exports

### Radio Read — P0 / IMPLEMENTED PRODUCT; PROVEN PROTOCOL

Read `0x8000 → 0x21000` into a complete 102,400-byte Codeplug. A successful Radio Read creates an immutable Baseline Backup and a separate Working Codeplug. An incomplete or invalid read creates neither.

### Raw Backup Export — P0 / PLANNED

Export only the exact Codeplug bytes. A Raw Backup Export contains no Source Radio identity or interpretation metadata. Importing it creates an Unbound Codeplug, which may be inspected and edited but cannot be used for a Radio Write.

Metadata such as model, firmware, date/time and SHA-256 belongs in a CPS Export or a separate sidecar, never inside the Raw Backup Export.

### CPS Export — P0 / PLANNED

Export a portable package that preserves Source Radio identity and the information needed to interpret the Codeplug. Importing it preserves the Source Radio binding.

### Import for offline inspection/editing — P0 / PLANNED

Support Raw Backup Exports and CPS Exports using the binding rules above. CSV and other future imports also create Unbound Codeplugs unless Source Radio identity can be proven.

### Backup History — P0 / PLANNED

Retain the ordered collection of immutable Codeplug Backups for each Source Radio across successful Radio Reads and verified Radio Writes. Durable browser storage may use IndexedDB; the Backup History lifecycle is not optional.

### Change Set review — P1 / REQUIRED FOR RADIO WRITE

Show the complete intended differences between a Baseline Backup and its Working Codeplug. Values outside the Change Set remain unchanged, and an empty Change Set cannot be written.

### Additional Codeplug comparison — P1 / OPTIONAL

Compare backups or Working Codeplugs semantically for inspection. This optional comparison is separate from the mandatory Change Set used by a Radio Write.

---

## 7.3 Channels

- Primary storage: `0x00008000 → 0x00013B7F`
- Capacity: `1000 channels × 48 bytes`

### Channel inspection and ordering UI — P0 / IMPLEMENTED

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

Memory rows can also be added and deleted. Add activates the first unused slot
with a clean 145.500 MHz simplex FM default; unsupported/on-off features,
signalling, tones and memberships start disabled or empty. Delete removes the
selected slot, shifts every following Memory row up by one channel number,
clears the final slot, and removes or remaps ordered Zone and Scan List
references. Both operations affect only the Working Codeplug until a future
verified Radio Write. Deleting a newly added row restores the exact pre-add
Working Codeplug, including when that temporary row was edited, so the canceled
operation leaves no pending Change Set entry.

### Memory Channel inline editing — P1 / IMPLEMENTED

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

### VFO and Call Channel inline editing — P1 / IMPLEMENTED

VFO A/B and Call 1/2 use the same validated 48-byte Channel field editor as
Memory Channels. Frequently used fields are editable directly in their tables,
and the complete supported field set is editable in the details Drawer. VFO
does not expose the record name, Zone, Scan List or Memory-only Used/Scan Flag
fields. Call exposes the Channel name but likewise has no Zone, Scan List,
Used or Scan Flag fields. Each field is tracked against its corresponding
Baseline Backup slot, so restoring its baseline value removes the pending
change. Edits remain in the Working Codeplug only; no Radio Write is performed.

### Supported channel fields

- RX frequency — P0
- TX frequency — P0
- channel name (24-byte UTF-8) — P0
- duplex/off/negative/positive/split — P0
- offset frequency — P0
- reverse/talk-around — P1
- frequency step — P0
- modulation: FM / FM-N / AM / AM-N — P0
- TX power: Low / Medium / High — P0
- RX-only — P0
- Busy Channel Lockout — P1
- squelch type — P1
- TX CTCSS — P0
- RX CTCSS — P0
- TX DTCS/DCS — P0
- RX DTCS/DCS — P0
- DCS polarity/reverse modes — P1
- compander — P1
- optional signalling: Off / DTMF / 2-Tone / 5-Tone — P1
- scrambler — P1
- PTT ID — P1
- APRS RX — P1

### Frequency steps — DOCUMENTED

`2.5, 3.125, 5, 6.25, 8.33, 10, 12.5, 15, 20, 25, 50, 100 kHz`

### CTCSS — DOCUMENTED

50 CTCSS values from `67.0` through `254.1 Hz`.

Index `20` corresponds to `131.8 Hz`.

UX rule: RX CTCSS must not be silently mirrored from TX CTCSS. Explain that RX tone mutes audio unless the received signal contains the configured tone.

### Scrambler — DOCUMENTED

Off plus documented values `2700` through `3400` in 100-unit increments.

---

## 7.4 Channel State & Membership Metadata

- channel valid/use bitmap — P0
- scan flag (off / skip / priority / reserved) — P0
- zone membership bitmap — P0
- scan-list membership bitmap — P0

Important: zone and scan-list membership bitmaps are stored inverted (`0 = member`). Hide this behind domain APIs.

The hardware-verified layout uses 4-byte membership records at `0x0001C000`
for Zones and `0x0001D000` for Scan Lists. Ordered member entries are
big-endian at `0x00018000` and `0x0001A000`; names are stored at `0x0001E000`
and `0x0001E500`. Only the lower 16 membership bits are currently interpreted;
the remaining bytes are preserved exactly.

---

## 7.5 VFOs, Call Channels, Temporary Channels & Weather Channels

### VFO A/B — P1 / IMPLEMENTED PRODUCT; DOCUMENTED STORAGE

Two 48-byte channel records.

### Call Channels 1/2 — P1 / IMPLEMENTED PRODUCT; DOCUMENTED STORAGE

Two special Call Channel storage slots.

### Temporary Channels A/B — INTERNAL / DOCUMENTED

The storage reference's normal save flow mirrors `VFO A → Temp A` and `VFO B → Temp B` as raw 48-byte copies. `Temp A/B` are storage labels for the internal Temporary Channels, not user-facing names.

### Weather Channels — P2 / DOCUMENTED

10 documented fixed weather-channel records and templates.

---

## 7.6 Zones

- 16 zones — P0
- 24-byte UTF-8 names — P0
- 128 member slots per zone — P0
- A/B multi-Zone selection — P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE

Zone information exists in both ordered member lists and per-channel membership bitmaps. Writer code must maintain both consistently.

### Zone and Scan List domain operations — P1 / IMPLEMENTED

The Codeplug module exposes immutable Zone and Scan List collections plus
operations to rename a collection, replace and reorder its members, or update
one Channel's complete Zone and Scan List membership. Every membership edit
updates the ordered member list and inverted per-channel bitmap together while
preserving unrelated bytes and the unused upper membership bits.

The same interface enforces 24-byte UTF-8 names, unique Channel membership,
valid Channel and collection numbers, and the 128-member capacity. Consistency
validation reports stable codes for invalid or duplicate ordered entries and
for differences between ordered lists and membership bitmaps.

### Zone editor — P1 / IMPLEMENTED

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

- 16 scan lists — P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- 24-byte names — P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- 128 member slots per list — P0 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- A/B active scan-list selection — P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE
- member Off/Skip/Priority semantics — P1 / IMPLEMENTED PRODUCT; PROVEN STORAGE

Like zones, both ordered lists and per-channel membership bitmaps must remain synchronized.

### Scan List editor — P1 / IMPLEMENTED

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

---

## 7.8 General Radio Settings

Documented settings include:

- receive/transmit mode — P1
- cross-band repeat mode — P2
- cross-band repeat monitor — P2
- squelch level — P1
- TX timeout timer — P1
- TX channel behavior — P2
- call hold time — P2
- A-side operating mode — P1
- B-side operating mode — P1
- Auto Repeater — P2
- Auto AM Mode: Off / 108.0–136.0 MHz / 108.0–137.0 MHz — P2
- CI-T USB CDC enable — P2
- CI-T Bluetooth SPP enable — P2
- CI-T Bluetooth BLE enable — P2

A/B operating modes include Channel, VFO/frequency, Call Channel and Weather Channel modes.

---

## 7.9 Tail & Tone Burst

- no-signalling tail — P2
- analog tone tail — P2
- digital tone tail — P2
- tail duration — P2
- Tone Burst frequency: 1000 / 1450 / 1750 / 2100 Hz — P2
- Tone Burst duration — P2
- Tone Burst sidetone — P2

---

## 7.10 Scan Behavior

- scan mode — P1
- MR scan type: Normal / Priority — P1
- CO Resume Delay: 0.0–10.0 seconds in 0.1-second increments — P1
- TO Hold Time: 1.0–10.0 seconds in 0.1-second increments — P1
- Scan Dwell Time: 10 / 20 / 30 / 40 / 50 ms — P1

---

## 7.11 Power Saving & Weather Channel Behavior

- power save enable — P2
- power-save delay — P2
- Weather Channel squelch control — P3
- Weather Channel receive mode — P3
- Weather Channel scan-selection mask — P3
- Weather Channel decode reset time — P3

---

## 7.12 Display Settings

- backlight level — P2
- auto dim — P2
- auto-dim delay — P2
- exit dimming on RX — P2
- exit dimming on TX — P2
- startup image enable — P3
- firmware version at boot — P2
- startup message enable/text — P2
- battery voltage at startup — P2
- channel display fields (frequency/name/zone) — P2
- coordinate/speed/altitude/distance/rain/wind/temperature units — P2
- system language — P2
- theme — P2
- menu auto-exit — P2
- battery display style — P2
- RX indicator — P2
- screen-off indicator — P2
- signal strength display: Off / dBm / RSSI+dBm — P1

Documented languages: Simplified Chinese, Traditional Chinese, English, Turkish.

---

## 7.13 Audio Settings

- key beep — P2
- low-battery beep — P2
- power-on beep — P2
- TX timeout beep — P2
- call-start beep — P2
- call-end beep — P2
- microphone gain — P2
- AI voice control enable/sensitivity/delay — P2
- AI noise reduction enable — P2

The CPS only configures these persisted options; DSP behavior is firmware-internal.

---

## 7.14 Programmable Keys

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

---

## 7.15 Keyboard Lock

- auto lock — P2
- lock type — P2
- lock delay — P2

Lock combinations include keys, encoder, PTT and combinations thereof.

---

## 7.16 Menu Visibility

Menu display mask: `0x0001BA00`, 256 bytes.

Bits `0–165` map to individual menu entries.

Do not present 166 raw checkboxes. Group settings by the radio menu hierarchy.

---

## 7.17 FM Broadcast Radio

- 32 FM presets — P3
- preset-valid bitmap — P3
- FM radio enable — P3
- frequency/channel mode — P3
- FM VFO frequency — P3

Documented FM VFO range: `64.0 → 108.0 MHz`.

#### Source discrepancy

The Data Storage Reference's overall map describes `0x00015404–0x00015406` as FM receiver switch, noise suppression and auto scan. Its detailed FM table defines the switch at `0x00015404` but does not define `0x00015405–0x00015406`; mode and VFO frequency are stored elsewhere. Preserve bytes `0x00015405–0x00015406` and treat noise suppression/auto scan as FUTURE / RESEARCH until their encoding is documented or hardware-verified.

---

## 7.18 APRS

APRS block: `0x00015500`, 1024 bytes.

Features:

- callsign — P1
- SSID 0–15 — P1
- APRS symbol/table — P1
- decode CRC — P2
- decode filters: MIC-E, Position, Weather, Object, Item, Status, Other — P2
- popup behavior — P2
- ring behavior — P2
- destination callsign/SSID — P1
- beacon type: Fixed / GPS — P1
- auto beacon interval — P1
- TX pre-carrier — P2
- TX end delay — P2
- TX sidetone — P2
- RF beacon transmission — P1
- APRS TX channel selection — P1
- manual beacon mode — P2
- manual beacon side/band — P2
- fixed latitude/longitude/altitude — P2
- digipeater path, up to 8 entries — P1
- APRS comment/description — P2
- 8 APRS TX channel records — P1
- TNC output settings — P2

TNC output modes are documented for USB virtual serial, classic Bluetooth SPP and BLE, with KISS/GPWPL/UI-text formats. This does **not** by itself prove browser CPS transport over Bluetooth.

---

## 7.19 GPS

- GPS enable — P2
- timezone — P2
- GNSS mode — P2

Supported GNSS combinations:

- GPS
- BeiDou
- GPS + BeiDou
- GLONASS
- GPS + GLONASS
- BeiDou + GLONASS
- GPS + BeiDou + GLONASS

---

## 7.20 Bluetooth Settings

- Bluetooth enable — P2
- master/slave mode — P2
- local speaker control — P2
- local microphone control — P2
- speaker gain (8 levels) — P2
- microphone gain (8 levels) — P2

---

## 7.21 DTMF

DTMF block: `0x00016000`, 1024 bytes.

Features:

- local ID — P2
- separator/group-call code — P2
- dialer type — P2
- encoder sidetone/timing — P2
- first-digit timing — P2
- pre-carrier / after-send delay — P2
- D-code pause — P2
- PTT ID pause — P2
- decoder response — P2
- auto reset — P2
- ANI display — P2
- remote inhibit/kill/stun/wake codes — P3
- 16 DTMF encode memories — P2
- 8 PTT ID definitions — P2

---

## 7.22 2-Tone

Block: `0x00016800`, 512 bytes.

- encoder/decoder timing — P3
- 16 encode records — P3
- 16 decode records — P3
- Tone1/Tone2 values — P3
- response and names — P3

---

## 7.23 5-Tone

Block: `0x00017000`, 2048 bytes.

- local ID — P3
- encoder timing/settings — P3
- pause code/timing — P3
- PTT ID pause — P3
- decode standard — P3
- decode digit mask — P3
- decode response/reset/ANI — P3
- 16 encode records — P3
- 8 PTT ID records — P3
- 16 information-code records — P3

Documented standards include ZVEI1/2/3, PZVEI, DZVEI, PDZVEI, CCIR1/2, PCCIR, EEA, EURO SIGNAL, NATEL, MODAT, CCITT and EIA.

---

# 8. Product Features Beyond the Vendor CPS

## 8.1 Change Set review — REQUIRED FOR RADIO WRITE

Before writing, show user-facing changes such as:

```text
CH 012
  TX Tone
  Off → 131.8 Hz

CH 043
  Name
  RPT1 → ANTALYA
```

## 8.2 Automatic pre-write recovery backup — REQUIRED FOR RADIO WRITE

Before a Radio Write, perform a complete Radio Read and retain its immutable Codeplug Backup as the recovery point. The read also produces a separate Working Codeplug as required by the normal Radio Read lifecycle. If the result exactly matches the expected Baseline Backup, the existing Working Codeplug and Change Set remain valid. If it differs, stop: make the newly read Codeplug the basis of a new working session and require the intended changes to be reapplied and reviewed. Never silently rebase a Change Set.

## 8.3 Safe verified writes — HIGH VALUE / FUTURE

Documented write flow followed by the required verification read:

```text
E0/E1 → E3 → E4 block → E6 ACK → repeat
   → E5 "Write Complete" → reboot
   → reconnect → E0/E1 → E2 → E6/E4 read blocks
   → E5 "Read Complete" → reboot → compare
```

The docs do not establish atomic writes. Assume disconnect can leave partially changed SPI flash.

Planned safety model:

- verify Source Radio identity and preflight backup first
- write every block in the declared range unless partial-write behavior is separately hardware-verified
- ACK validation
- address/length echo validation
- send `E5 "Write Complete"` to finish the write session and reboot
- reconnect and perform a complete Radio Read
- byte-for-byte comparison against the intended Working Codeplug
- report success only after verification and create a new Baseline Backup from the verified result
- after writing may have begun, report `Write Outcome Unknown` if the session is interrupted or verification cannot be completed
- persist recovery metadata

Changed-block or other partial-write strategies are FUTURE / RESEARCH. The supplied protocol describes sending blocks until all data in the declared range has been sent; it does not establish that omitted blocks are safe.

## 8.4 Interrupted-write recovery — HIGH VALUE / FUTURE

On reconnect, perform a Radio Read and compare the result with the recovery Codeplug Backup and intended Working Codeplug. Do not blindly resume from the last ACK. Until exact verification succeeds, retain the `Write Outcome Unknown` state and present recovery guidance.

## 8.5 Bulk editing — HIGH VALUE

- set tone for selection
- set power/mode
- assign zone/scan list
- mark RX-only
- enable/skip scan
- duplicate channels
- patterned rename

## 8.6 Search/filtering — HIGH VALUE

Search by name, frequency, tone, zone, scan list and mode.

## 8.7 Validation/warnings — HIGH VALUE

Examples:

- RX CTCSS enabled warning
- out-of-range TX warning
- inconsistent zone/scan-list representation warning

## 8.8 Saved Working Codeplugs — P1

Allow Working Codeplugs to be named and retained locally without changing their Baseline Backup or Source Radio binding.

## 8.9 Undo/redo — P1

Support revert field/channel/all changes.

## 8.10 Source Radio preflight comparison — P1

Compare the Source Radio with the expected Baseline Backup before writing. A mismatch stops the Radio Write and requires a new Change Set review.

## 8.11 Additional import/export formats — P1/P2

Potential formats and binding rules:

- raw `.bin`: Raw Backup Export; exact Codeplug bytes only; imports as an Unbound Codeplug
- CPS package: preserves Source Radio identity and interpretation metadata
- CSV: imports as an Unbound Codeplug
- CHIRP-compatible CSV: imports as an Unbound Codeplug

JSON must not become the canonical Codeplug representation. JSON metadata may be used inside a CPS Export, but the exact Codeplug bytes remain authoritative.

## 8.12 PWA/offline use — P1

Core radio operations should remain local-first and backend-independent.

---

# 9. Recommended Product Navigation

```text
Radio
Channels
Zones & Scanning
APRS
Settings
Backups
```

Settings subsections:

```text
General
Display
Audio
Keys
GPS
Bluetooth
Signalling
FM Radio
Advanced
```

---

# 10. Recommended Implementation Roadmap

## Epic 1 — UVL-15W Radio connection & Transport seam

- [x] Transport interface owned by the UVL-15W Radio module
- [x] Web Serial adapter
- [x] scripted Transport test adapter
- [x] continuous RX pump
- [x] stream parser
- [x] operation-scoped open/close lifecycle
- [x] secure-context and browser capability handling
- [ ] protocol diagnostic log — deferred

## Epic 2 — Read protocol

- [x] E0/E1
- [x] E2
- [x] E6/E4
- [x] progress
- [x] E5 Read Complete
- [x] safe error handling/retry

## Epic 3 — Codeplug core

- [x] Codeplug module with private exact-byte preservation
- [x] private memory-map constants and binary helpers
- [x] private read-side Channel codec
- [x] validity bitmap
- [x] scan bitmap
- [x] preserve unknown and reserved bytes

## Epic 4 — Channel inspection and ordering UI

- [x] virtualized 1000-row Memory table
- [x] used/all filter and name, number, or frequency search
- [x] Basic/Advanced column visibility and complete details
- [x] CTCSS/DCS formatting
- [x] mode/power display
- [x] Zone/Scan List membership parsing and display
- [x] compact VFO A/B and Call 1/2 views
- [x] tracked drag-to-reorder with record and membership-reference remapping
- [x] add default Memory Channel and delete-with-compaction row actions

## Epic 5 — Offline editing model

- [x] Memory Channel scalar-field editing directly in table cells
- [x] 24-byte UTF-8 name and storage-level frequency/value validation
- [x] reset all Working Codeplug edits to the Baseline Backup
- [x] CTCSS/DCS indexed-value editing in the Memory table and details Drawer
- [x] Zone and Scan List membership editing
- [x] VFO/Call Channel editing
- [ ] semantic Change Set tracking against the Baseline Backup
- [ ] Change Set review
- [ ] undo/redo

**No radio writes yet.**

## Epic 6 — Zones & scan lists

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

## Epic 7 — Safe writer

- pre-write read
- complete preflight Radio Read and immutable recovery Codeplug Backup
- explicit new working session if the preflight result differs from the Baseline Backup
- Source Radio and Baseline Backup comparison
- E3/E4/E6
- ACK validation
- E5 Write Complete
- post-reboot reconnect and complete Radio Read
- byte-for-byte verification before reporting success
- `Write Outcome Unknown` handling
- interrupted-write recovery

Partial or changed-block writes are excluded until hardware-verified.

## Epic 8 — General radio settings

## Epic 9 — Programmable keys / menu visibility

## Epic 10 — APRS

## Epic 11 — GPS & Bluetooth settings

## Epic 12 — DTMF / 2-Tone / 5-Tone

## Epic 13 — FM radio / Weather Channels / advanced settings

## Epic 14 — PWA / saved Working Codeplugs / import-export

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

## P0 — Core CPS

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
- [ ] Raw Backup Export and CPS Export handling
- [ ] Backup History
- [x] Channel parser
- [x] virtualized 1000-channel table
- [x] CTCSS/DCS display
- [x] read-side Zone names and membership parser
- [x] read-side Scan List names and membership parser

## P1 — Main Product

- [ ] channel editing
- [ ] bulk edit
- [ ] Change Set review
- [ ] undo/redo
- [ ] saved Working Codeplugs
- [x] zone editor
- [x] scan-list editor
- [x] VFO/Call Channel editor
- [ ] radio settings
- [ ] programmable keys
- [ ] APRS
- [ ] safe verified write
- [ ] interrupted-write recovery
- [ ] import binding and Unbound Codeplug enforcement

## P2 — Extended Codeplug Settings

- [ ] display settings
- [ ] audio settings
- [ ] AI voice control
- [ ] AI noise reduction
- [ ] GPS
- [ ] Bluetooth settings
- [ ] menu visibility
- [ ] power saving
- [ ] Tone Burst
- [ ] APRS TNC settings

## P3 — Advanced / Specialist

- [ ] DTMF
- [ ] remote signalling codes
- [ ] 2-Tone
- [ ] 5-Tone
- [ ] FM broadcast presets
- [ ] Weather Channel settings
- [ ] FM noise-suppression/auto-scan encoding research

## Future / Research

- [ ] Bluetooth SPP transport for CPS
- [ ] BLE/Web Bluetooth transport for CPS
- [ ] Node serial transport
- [ ] desktop/Tauri transport
- [ ] firmware updater
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
- verified writes
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
