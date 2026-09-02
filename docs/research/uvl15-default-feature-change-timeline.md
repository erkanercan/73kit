# UVL-15W Default Codeplug Feature-Change Timeline

Research date: 2026-09-01

## Conclusion

The official English default PF files expose three observable changes in the
stored Codeplug between the nine CPS packages examined:

1. **CPS 20251118 / bundled firmware 2.11.18** changes several display and key
   defaults and initializes two small unknown/reserved ranges.
2. **CPS 20260526 / bundled firmware 3.5.26** initializes scan flags, audio
   defaults, APRS/TNC defaults, legacy Zone and Scan List metadata, and a
   legacy `EDG1` version-1 VFO Scan Edge block.
3. **CPS 20260715 / bundled firmware 3.7.15** changes Spectrum and scan timing
   defaults, introduces an unmapped `RCFG` version-2 header, and migrates Zone,
   Scan List, and VFO Scan Edge metadata to the current address family. The PF
   writes 32 Zone default-name records but only 16 Scan List names; this alone
   does **not** prove that 32 Zones are usable by the radio or CPS.

The defaults are byte-identical across 20251118, 20251227, 20260316,
20260318, and 20260331, and again across 20260715 and 20260723. Consequently,
the PF evidence cannot attribute firmware features or bug fixes to any release
inside those groups. It is a **default-Codeplug timeline, not a firmware
changelog**.

## Confidence vocabulary

- **Confirmed**: the before/after bytes, addresses, record count, or literal
  text come directly from the official PF files.
- **Mapped**: an address and encoding are identified by TYT's storage
  reference and/or a controlled-PF-backed source codec in this repository.
- **Inferred**: the structural interpretation follows from the byte pattern
  and mapped regions, but TYT did not publish a changelog claim for it.
- **Unknown**: neither TYT's storage document nor controlled evidence in this
  repository establishes a field meaning. Unknown bytes are not guessed.

PF offset `0x00000` corresponds to flash address `0x00008000`. All ranges below
are inclusive. A repeated-byte expression such as `FF × 384` is an exact byte
description, not an approximation.

## Release summary

| CPS package | Bundled firmware   | Change from preceding official CPS default |
| ----------- | ------------------ | ------------------------------------------ |
| 20250703    | 2.7.3 test build   | Baseline for this comparison               |
| 20251118    | 2.11.18 test build | 18 bytes in 8 ranges                       |
| 20251227    | 2.12.27 test build | No change                                  |
| 20260316    | 3.3.16 test build  | No change                                  |
| 20260318    | 3.3.18 test build  | No change                                  |
| 20260331    | 3.3.31 test build  | No change                                  |
| 20260526    | 3.5.26 test build  | 3,082 bytes in 14 ranges                   |
| 20260715    | 3.7.15             | 4,602 bytes in 19 ranges                   |
| 20260723    | 3.7.23             | No change                                  |

The package-to-firmware association and payload hashes are established in
[UVL-15W Default PF Version Comparison](./uvl15-default-pf-version-comparison.md).

## 20250703 to 20251118

### Mapped settings

| PF offset / flash address               | Before        | After         | Semantic decode                                                                                                                                     | Confidence |
| --------------------------------------- | ------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `0x0D405` / `0x15405`                   | `00`          | `03`          | Memory-channel display changes from all three items hidden to channel frequency and channel name shown; Zone name remains hidden.                   | Mapped     |
| `0x0D40A..0x0D40B` / `0x1540A..0x1540B` | `00 00`       | `01 01`       | Exit auto-dim on receive: Off to On; exit auto-dim on transmit: Off to On.                                                                          | Mapped     |
| `0x0D413` / `0x15413`                   | `03`          | `10`          | Side Key 2 long press changes from Send Beacon to Squelch Level.                                                                                    | Mapped     |
| `0x0D42B` / `0x1542B`                   | `08`          | `00`          | Battery-display value changes from an unsupported raw value to Icon.                                                                                | Mapped     |
| `0x0D42C` / `0x1542C`                   | `BB`          | `01`          | RX indicator LED changes from an unsupported raw value to On.                                                                                       | Mapped     |
| `0x0D42D` / `0x1542D`                   | `AC`          | `00`          | Received-signal-strength display changes from an unsupported raw value to Off.                                                                      | Mapped     |
| `0x0D451` / `0x15451`                   | `01`          | `00`          | Digit 1 long press changes from Voice Control to None.                                                                                              | Mapped     |
| `0x0D454..0x0D457` / `0x15454..0x15457` | `88 12 07 08` | `00 00 00 00` | Digit 4 changes from an unsupported raw action, Digit 5 from GPS, Digit 6 from Talk Around, and Digit 7 from Noise Reduction; all four become None. | Mapped     |

The key-action names use the current TYT-backed index map. The presence of an
unsupported old raw value means only its raw transition, not a user-facing old
label, is established.

### Unknown initialization

| PF offset / flash address               | Before     | After      | Interpretation                   | Confidence |
| --------------------------------------- | ---------- | ---------- | -------------------------------- | ---------- |
| `0x0D4F3..0x0D4F5` / `0x154F3..0x154F5` | `00 00 00` | `FF FF FF` | No field mapping is established. | Unknown    |
| `0x0D4FB..0x0D4FD` / `0x154FB..0x154FD` | `00 00 00` | `FF FF FF` | No field mapping is established. | Unknown    |

This transition proves changed factory values. It does not prove that any of
these settings was newly added to firmware 2.11.18.

## 20251118 to 20260331

There are **zero changed payload bytes** in each consecutive transition:

- 20251118 to 20251227;
- 20251227 to 20260316;
- 20260316 to 20260318;
- 20260318 to 20260331.

Confidence: **Confirmed** for the default payloads. Firmware changes remain
unknown because five bundled firmware versions reuse the same default.

## 20260331 to 20260526

### Scan flags and mapped settings

| PF offset / flash address               | Before     | After                 | Semantic decode                                                                                                                                                                                                     | Confidence               |
| --------------------------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `0x0D080..0x0D179` / `0x15080..0x15179` | `00 × 250` | `F0`, then `FF × 249` | The 2-bit Memory Scan flags change from `Off` for all 1,000 channel slots to CH1/CH2 `Off` and CH3..CH1000 raw `3` (reserved). This is consistent with marking unused slots, but that purpose is not stated by TYT. | Mapped; purpose inferred |
| `0x0D423` / `0x15423`                   | `FF`       | `00`                  | Packed coordinate, speed, distance, and altitude units change from unsupported raw values to decimal degrees plus metric units.                                                                                     | Mapped                   |
| `0x0D426` / `0x15426`                   | `00`       | `01`                  | Scan-pause beep: Off to On.                                                                                                                                                                                         | Mapped                   |
| `0x0D427` / `0x15427`                   | `00`       | `0A`                  | AM analog RX gain: 0 to 10.                                                                                                                                                                                         | Mapped                   |
| `0x0D428` / `0x15428`                   | `13`       | `38`                  | AM digital RX gain: -16.5 dB to +2.0 dB (`raw / 2 - 26`).                                                                                                                                                           | Mapped                   |
| `0x0D429` / `0x15429`                   | `4D`       | `0F`                  | AM-N analog RX gain changes from unsupported raw 77 to 15.                                                                                                                                                          | Mapped                   |
| `0x0D42F` / `0x1542F`                   | `08`       | `38`                  | AM-N digital RX gain: -22.0 dB to +2.0 dB.                                                                                                                                                                          | Mapped                   |
| `0x0D445` / `0x15445`                   | `3C`       | `00`                  | Bluetooth role changes from unsupported raw 60 to Master/host.                                                                                                                                                      | Mapped                   |
| `0x0D446..0x0D447` / `0x15446..0x15447` | `00 40`    | `01 01`               | Scan-start beep changes Off to On; scan-stop beep changes from unsupported raw 64 to On.                                                                                                                            | Mapped                   |
| `0x0D5EA` / `0x155EA`                   | `FF`       | `00`                  | APRS RF beacon transmission changes from unsupported raw 255 to Off.                                                                                                                                                | Mapped                   |
| `0x0D740..0x0D745` / `0x15740..0x15745` | `FF × 6`   | `00 × 6`              | TNC A/B/C data-output and data-format defaults are initialized to Off and KISS respectively.                                                                                                                        | Mapped                   |

### Legacy metadata initialized

| PF offset / flash address               | Before      | After                                                                     | Interpretation                                                                                                       | Confidence                           |
| --------------------------------------- | ----------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `0x13000..0x1317F` / `0x1B000..0x1B17F` | `FF × 384`  | 16 NUL-padded 24-byte ASCII records, `Zone 0` through `Zone 15`           | TYT's published storage document identifies this as the legacy 16-Zone name table.                                   | Confirmed and mapped                 |
| `0x13400..0x1357F` / `0x1B400..0x1B57F` | `FF × 384`  | 16 NUL-padded 24-byte ASCII records, `Scan List 0` through `Scan List 15` | TYT's published storage document identifies this as the legacy 16-Scan-List name table.                              | Confirmed and mapped                 |
| `0x13B00..0x13B05` / `0x1BB00..0x1BB05` | `FF × 6`    | `45 44 47 31 01 00` (`EDG1`, little-endian version 1)                     | A legacy VFO Scan Edge header is initialized.                                                                        | Confirmed; structural meaning mapped |
| `0x13B10..0x142FF` / `0x1BB10..0x1C2FF` | `FF × 2032` | `00 × 2032`                                                               | The remainder of the legacy VFO Scan Edge block is zero-initialized. Zero records do not decode as valid scan edges. | Confirmed; structural meaning mapped |

### Unmapped bytes

| PF offset / flash address               | Before     | After            | Confidence                                                                   |
| --------------------------------------- | ---------- | ---------------- | ---------------------------------------------------------------------------- |
| `0x0D4F2` / `0x154F2`                   | `00`       | `FF`             | Unknown                                                                      |
| `0x0D4FA` / `0x154FA`                   | `00`       | `FF`             | Unknown                                                                      |
| `0x0D746..0x0D748` / `0x15746..0x15748` | `FF FF FF` | `00 00 00`       | Unknown; adjacent to the mapped TNC fields, but not documented as TNC fields |
| `0x13612..0x13616` / `0x1B612..0x1B616` | `FF × 5`   | `00 00 00 00 53` | Unknown bytes inside the legacy Scan List attribute region                   |

This release clearly initializes data structures and sane defaults that were
erased or invalid in the preceding PF. That is not sufficient to say the
corresponding radio features were first implemented in firmware 3.5.26.

## 20260526 to 20260715

### Spectrum and radio-setting changes

| PF offset / flash address               | Before                          | After                           | Semantic decode                                                                                                                                                                                                                          | Confidence                            |
| --------------------------------------- | ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `0x0D31A` / `0x1531A`                   | `01`                            | `00`                            | Spectrum mode raw index changes from Edge to Center under the current map.                                                                                                                                                               | Mapped                                |
| `0x0D31C..0x0D325` / `0x1531C..0x15325` | `BB AC 00 08 01 01 04 01 00 02` | `08 B3 C8 80 08 D2 4D 00 09 00` | In the current layout the new values are 146.000 MHz to 148.000 MHz, 25 kHz step, FM. The old frequency bytes do not form a valid current-layout range, so no semantic old-to-new frequency claim is made.                               | New values mapped; old layout unknown |
| `0x0D327..0x0D32C` / `0x15327..0x1532C` | `01 01 0A 01 02 01`             | `00 00 00 00 01 00`             | Mostly reserved bytes plus the start of the current Zone-selection mask. No complete field-level transition is established.                                                                                                              | Unknown except region mapping         |
| `0x0D333` / `0x15333`                   | `04`                            | `00`                            | Final byte of the current Spectrum Scan List mask changes. Under the current layout this changes from Scan List 3 selected to no Scan List selected; whether the older PF used the same mask semantics is not independently established. | Current mapping; old layout uncertain |
| `0x0D448` / `0x15448`                   | `80`                            | `00`                            | CO Resume Delay changes from unsupported raw 128 to 0.0 seconds.                                                                                                                                                                         | Mapped                                |
| `0x0D449` / `0x15449`                   | `00`                            | `32`                            | TO Hold Time changes from unsupported raw 0 to 5.0 seconds.                                                                                                                                                                              | Mapped                                |
| `0x0D44A` / `0x1544A`                   | `00`                            | `02`                            | Scan Dwell Time: 10 ms to 30 ms.                                                                                                                                                                                                         | Mapped                                |
| `0x0D4BB` / `0x154BB`                   | `00`                            | `03`                            | No field mapping is established.                                                                                                                                                                                                         | Unknown                               |
| `0x0D4BC` / `0x154BC`                   | `CE`                            | `01`                            | Auto AM Mode changes from unsupported raw 206 to automatic AM over 108–136 MHz.                                                                                                                                                          | Mapped                                |

### Version marker and metadata-layout migration

| PF offset / flash address               | Before                                       | After                                                                     | Interpretation                                                                                                                   | Confidence                                  |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `0x0FF00..0x0FF05` / `0x17F00..0x17F05` | `FF × 6`                                     | `52 43 46 47 02 00` (`RCFG`, little-endian version 2)                     | A versioned configuration header appears. No authoritative field map for `RCFG` was found.                                       | Confirmed bytes; purpose inferred           |
| `0x0FF08..0x0FF09` / `0x17F08..0x17F09` | `FF FF`                                      | `20 00`                                                                   | Header-associated value `0x0020` if little-endian; meaning unknown.                                                              | Unknown                                     |
| `0x13000..0x1317F` / `0x1B000..0x1B17F` | Legacy `Zone 0`..`Zone 15` records           | `FF × 384`                                                                | Legacy Zone name table erased.                                                                                                   | Confirmed                                   |
| `0x13400..0x1357F` / `0x1B400..0x1B57F` | Legacy `Scan List 0`..`Scan List 15` records | `FF × 384`                                                                | Legacy Scan List name table erased.                                                                                              | Confirmed                                   |
| `0x13612..0x13616` / `0x1B612..0x1B616` | `00 00 00 00 53`                             | `FF × 5`                                                                  | Unmapped legacy Scan List attribute bytes erased.                                                                                | Confirmed bytes; meaning unknown            |
| `0x13B00..0x13B05` / `0x1BB00..0x1BB05` | `EDG1`, version 1                            | `FF × 6`                                                                  | Legacy VFO Scan Edge header erased.                                                                                              | Confirmed                                   |
| `0x13B10..0x142FF` / `0x1BB10..0x1C2FF` | `00 × 2032`                                  | `FF × 2032`                                                               | Legacy VFO Scan Edge data/reserved area erased.                                                                                  | Confirmed                                   |
| `0x16000..0x162FF` / `0x1E000..0x1E2FF` | `FF × 768`                                   | 32 NUL-padded 24-byte ASCII records, `Zone 0` through `Zone 31`           | New Zone name area initialized. The literal 32 labels are confirmed; usable 32-Zone behavior is unproven.                        | Confirmed; capacity interpretation inferred |
| `0x16342..0x16349` / `0x1E342..0x1E349` | `FF × 8`                                     | `00 × 8`                                                                  | Current A/B Zone selection bitmaps initialized with no selections.                                                               | Mapped                                      |
| `0x1634A` / `0x1E34A`                   | `FF`                                         | `5A`                                                                      | Adjacent byte, not part of the mapped A/B selectors.                                                                             | Unknown                                     |
| `0x16500..0x1667F` / `0x1E500..0x1E67F` | `FF × 384`                                   | 16 NUL-padded 24-byte ASCII records, `Scan List 0` through `Scan List 15` | Current Scan List name area initialized.                                                                                         | Confirmed and mapped                        |
| `0x16822..0x16829` / `0x1E822..0x1E829` | `FF × 8`                                     | `00 × 8`                                                                  | Current A/B Scan List selection bitmaps initialized with no selections.                                                          | Mapped                                      |
| `0x1682A` / `0x1E82A`                   | `FF`                                         | `53`                                                                      | Adjacent byte, not part of the mapped A/B selectors.                                                                             | Unknown                                     |
| `0x16B00..0x16B05` / `0x1EB00..0x1EB05` | `FF × 6`                                     | `45 44 47 31 02 00` (`EDG1`, little-endian version 2)                     | Current VFO Scan Edge header initialized as version 2.                                                                           | Confirmed and mapped                        |
| `0x16B08..0x16D4F` / `0x1EB08..0x1ED4F` | `FF × 584`                                   | `00 × 584`                                                                | Eight header-selection bytes and 16 zeroed 36-byte record slots are initialized. Zero records do not decode as valid scan edges. | Confirmed and mapped                        |

Taken together, the paired erase-and-initialize operations are strong evidence
of a **stored-layout migration** from the `0x1Bxxx` family to the `0x1Exxx`
family. Calling this a Zone/Scan List/VFO Scan Edge _feature addition_ would be
too strong: the 20260526 default already contains the same conceptual metadata
in the legacy locations.

The 32 Zone labels are a genuine new default-file fact. The reviewed storage
reference and this repository's current codecs establish only 16 Zone member
lists and interpret only the lower 16 membership bits. Until controlled CPS
exports or physical-radio tests establish Zone 17–32 semantics, the extra
labels must remain a capacity clue rather than a supported-feature claim.

## 20260715 to 20260723

There are **zero changed payload bytes**. The English defaults have the same
decoded SHA-256:
`e9f2f60e0f1d5393559e3dd6861e85c3a4e4fcce122b4b63115e6a08949113cd`.

Confidence: **Confirmed** for the default payload. This does not mean firmware
3.7.23 added no features or fixes relative to 3.7.15; it means only that TYT
shipped the same English default Codeplug.

## What can and cannot be attributed to a version

The package dates let us say when a changed default first appears among the
official packages currently available. They do not prove the exact firmware
build that introduced the underlying feature because:

- the PF syntax carries no CPS or firmware version declaration;
- several firmware versions reuse byte-identical defaults;
- a newly initialized field may have existed in earlier firmware with an
  erased, invalid, or implicit default;
- firmware-only behavior and bug fixes do not appear in PF comparisons;
- a storage relocation can change thousands of bytes without adding a new
  user-facing feature.

Accordingly, the defensible product labels are “default/layout first observed
in official CPS YYYYMMDD,” not “feature introduced by firmware X,” unless a
TYT changelog, controlled one-setting export, or physical validation supplies
that missing evidence.

## Primary evidence and implementation cross-checks

- TYT's current [download page](https://www.tyt888.com/download.html) and the
  official archive URLs catalogued in the
  [PF version comparison](./uvl15-default-pf-version-comparison.md).
- Official extracted `Default_EN.PF` files under the temporary evidence tree
  `/private/tmp/tyt-uvl15-defaults.5arGHj/`; these were strictly decoded and
  compared byte-for-byte. The temporary tree is evidence for this run, not a
  durable repository dependency.
- [Reviewed TYT data-storage reference](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md),
  including the storage map, Memory Scan flags, radio settings, APRS/TNC,
  Zone/Scan List metadata, and VFO Scan Edge notes.
- Current source codecs:
  [memory map](../../modules/codeplug/memory-map.ts),
  [display settings](../../modules/codeplug/display-settings.ts),
  [keyboard settings](../../modules/codeplug/keyboard-settings.ts),
  [sound settings](../../modules/codeplug/sound-settings.ts),
  [function settings](../../modules/codeplug/function-settings.ts),
  [APRS settings](../../modules/codeplug/aprs-settings.ts),
  [Spectrum settings](../../modules/codeplug/spectrum-settings.ts), and
  [VFO Scan Edge](../../modules/codeplug/vfo-scan-edge.ts).
- Controlled mapping notes:
  [Sound Settings PF research](./sound-settings-pf-research.md) and
  [Bluetooth Settings research](./bluetooth-settings-research.md).

## Method

1. Strictly decoded each 3,200-record official English PF to the 102,400-byte
   Codeplug payload at flash `0x8000..0x20FFF`.
2. Compared every consecutive CPS package byte-for-byte and coalesced only
   immediately adjacent changed addresses into ranges.
3. Decoded a field only where TYT's official storage document or this
   repository's controlled-PF-backed codec establishes its address and enum.
4. Inspected large ranges as typed records rather than treating a high changed
   byte count as a feature count.
5. Left unowned/reserved bytes and version-header fields unknown.
