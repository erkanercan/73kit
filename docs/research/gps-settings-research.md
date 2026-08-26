# GPS Settings Research

Date: 2026-08-27

## Decision

The persistent GPS settings can be implemented in the browser CPS now, with a
narrow scope:

- GPS off/on
- GNSS constellation mode
- GPS time-zone offset

These are three ordinary bytes inside the already supported 102,400-byte
Codeplug. The evidence is sufficient for a Working Codeplug editor, decoder,
validation, change tracking, and tests. It is **not** evidence for a live GPS
position or satellite-status viewer, and it does not make Radio Write available.

## Evidence

### Radio-facing semantics

The UVL-15W user manual filed by the manufacturer with the FCC describes five
GPS menu functions: GPS Switch, GPS Mode, Time Zone Set, Position Info, and
Satellite Info. It lists seven GPS Mode choices: GPS, BeiDou, GPS + BeiDou,
GLONASS, GPS + GLONASS, BeiDou + GLONASS, and GPS + BeiDou + GLONASS. Position
Info is a positioning-status display; Satellite Info is a satellite-status
display with distribution and signal-detail views. See the manufacturer's
[FCC user-manual exhibit](https://apps.fcc.gov/eas/GetApplicationAttachment.html?id=9378982)
([filing metadata and document hash](https://fccid.io/2BLTR-UVL15W/User-Manual/13-UVL-15W-Users-Manual-9378982)).

The same manual says an APRS GPS beacon uses live GPS coordinates and altitude,
and that the Radio does not transmit that APRS data without a GPS fix. This is
distinct from the APRS Fixed Beacon data stored in the Codeplug.

The official [TYT download page](https://www.tyt888.com/download.html) lists
current UVL-15W CPS and firmware resources. No vendor package was needed or
retained for this research.

### Storage mapping

The repository's reviewed storage reference, reconstructed from the vendor Qt
CPS UI and implementation, maps the settings as follows:

| Setting | Flash address | Codeplug file offset | Encoding |
| --- | ---: | ---: | --- |
| GPS switch | `0x00015401` | `0xD401` | `0=Off`, `1=On` |
| GNSS mode | `0x00015402` | `0xD402` | index `0..6`, in the seven-choice order below |
| GPS time zone | `0x00015403` | `0xD403` | index `0..36` |

The file offset is the flash address minus the Codeplug start address
`0x00008000`. The complete timezone table and the mode formula are in
[the GPS storage section](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#9-gps).

GNSS mode values are:

| Raw | Mode |
| ---: | --- |
| `0` | GPS |
| `1` | BeiDou |
| `2` | GPS + BeiDou |
| `3` | GLONASS |
| `4` | GPS + GLONASS |
| `5` | BeiDou + GLONASS |
| `6` | GPS + BeiDou + GLONASS |

The storage reference describes this as `(selected constellation bitmask - 1)`.
A seven-option select is therefore the clearest UI and cannot represent the
invalid empty selection.

Timezone index `14` is UTC, `17` is UTC+03:00, and the complete range is
UTC-12:00 through UTC+14:00 with the documented half- and quarter-hour choices.
The setting is a fixed UTC-offset choice, not an IANA timezone with daylight
saving rules; the UI must not imply automatic DST handling.

### Read-only check of a real Radio backup

The supplied Radio Read backup was inspected without modification:

- size: `102400` bytes, exactly the expected Codeplug size
- SHA-256: `ab41a5eb96d8dc5eb8886b1abc337fed898df73c5cf5fc800f31723da749aac3`
- offsets `0xD401..0xD403`: `00 06 11`

Under the documented mapping, this snapshot contains GPS Off, GPS + BeiDou +
GLONASS, and timezone index `0x11` (`17`, UTC+03:00). These are all valid values
and the address alignment is consistent with the current full Radio Read.

One snapshot cannot independently prove which control owns each byte or prove
the enum meanings. That requires controlled before/after files where exactly
one vendor-CPS control changes. The snapshot is corroborating evidence, not the
sole basis for the mapping.

## Protocol and product feasibility

The documented clone protocol reads and writes the whole
`0x00008000..0x00021000` region, which includes the three GPS bytes. The current
Radio implementation already reads that complete range into a `Codeplug`; see
[the Radio module](../../modules/uvl15w-radio/index.ts). Consequently, no new
GPS-specific serial command is required to read or edit these settings in the
Working Codeplug.

The current product has no Radio Write implementation. It supports Radio Read,
an immutable Baseline Backup, and in-memory Working Codeplug edits. Therefore:

- GPS decoding and editing can be implemented now.
- The UI must describe changes as Working Codeplug changes, not changes already
  applied to the Radio.
- Do not add a GPS-only or changed-byte Radio write. The project explicitly
  excludes partial writes until they are hardware-verified.
- Applying GPS settings to hardware must wait for the general safe Radio Write
  flow: identity check, preflight backup, full-range write with acknowledgements,
  `E5 "Write Complete"`, reboot/reconnect, complete Radio Read, and byte-for-byte
  verification. See the [reviewed communication protocol](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#62-complete-write-flow).

Position Info and Satellite Info are runtime Radio views, not persistent
settings. Neither the reviewed clone protocol nor the current Radio module
defines a command for streaming GPS fix or satellite data. Those views should
not be reproduced in this CPS unless a separate, hardware-verified telemetry
interface is discovered. APRS TNC `GPWPL` output is a possible future research
lead, but it is not evidence for clone-session GPS telemetry and may contend for
the same USB serial interface.

## Recommended implementation shape

Add GPS as a desktop Radio Settings category consistent with the existing
settings layouts.

1. Add a deep `gps-settings` Codeplug codec owning only offsets
   `0xD401..0xD403`.
2. Decode unknown raw values losslessly and preserve them until the user makes
   an intentional edit, following the existing settings codecs.
3. Expose `getGpsSettings()` and `editGpsSettings(patch)` on `Codeplug`.
4. Add per-field `edit-gps-setting` Change Set reconciliation.
5. Add `/radio-settings/gps` with:
   - GPS switch
   - one seven-choice positioning-mode select
   - one 37-choice UTC-offset select
6. If APRS Position Source is Radio GPS while GPS is Off, show a warning. Do not
   silently change either setting; the vendor exposes them separately.
7. Provide English, Turkish, and Russian strings with the existing locale
   parity conventions.

Tests should prove exact-byte edits, round trips for all documented values,
preservation of adjacent and unknown bytes, rejection of invalid authored
values, Change Set reconciliation, and the real-backup snapshot decoding. The
private full backup does not need to be committed; a minimal, provenance-noted
fixture containing the relevant bytes is sufficient.

## Remaining unknowns and safest next evidence

- The E1 device-information `subModel` is documented as fixed and exposes no
  known GPS-capability flag. Do not claim automatic detection of GPS-equipped
  versus GPS-less hardware.
- The manual names the timezone control but does not establish every runtime
  effect it has. Describe it simply as the Radio's GPS time-zone offset.
- The behavior of GPS beacon selection while GPS is Off or has no fix is only
  partly known: the manual confirms no APRS GPS data is sent without a fix, but
  does not document all UI/error behavior.
- Invalid raw values outside switch `0..1`, mode `0..6`, or timezone `0..36`
  should be preserved and shown as unknown, not normalized.

If stronger write-side mapping evidence is desired, create controlled exports
with the latest official TYT CPS from one common baseline: toggle GPS; select
each of the seven modes; and test timezone indexes `0`, `14`, `17`, and `36`.
Confirm that only `0xD401..0xD403` change as expected. This comparison is useful
but not required to build the read/edit codec conservatively; real Radio Write
verification remains a separate milestone.
