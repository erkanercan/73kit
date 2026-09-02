# UVL-15W Default PF Version Comparison

Research date: 2026-09-01

## Conclusion

`Default_EN.PF` is **not specific to firmware 3.07.23 as a file format**, and
the supplied 20260723 default is not even unique to that exact firmware.
TYT's 20260715 and 20260723 CPS packages contain byte-identical English and
Chinese defaults although their bundled current firmware files are 3.7.15 and
3.7.23 respectively.

Across all nine CPS-bearing UVL-15W packages currently linked by TYT, every
default PF has exactly the same container shape:

- 3,200 ASCII hexadecimal records;
- 76 characters plus LF per record, for 246,400 file bytes;
- 8 hexadecimal address characters, 4 hexadecimal length characters, then
  32 payload bytes encoded as 64 hexadecimal characters;
- continuous addresses from `0x00008000` through `0x00020FFF`;
- `0x0020` (32) payload bytes in every record;
- exactly 102,400 decoded bytes.

The PF syntax contains no declared CPS or firmware version outside those data
records. A single UVL-15W PF parser/importer can therefore accept every
official default examined here; it does not need a parser variant for 3.07.23.

The **payload does change in some CPS generations**, so the stronger claim
that every default is interchangeable with every firmware is not established.
The practical, simple policy is to treat `.PF` as a generic UVL-15W import and
export format, while labeling a bundled factory default with the official CPS
package it came from. Do not infer an exact firmware version from a PF file
alone.

## Official packages examined

The current [TYT download page](https://www.tyt888.com/download.html) contains
exactly ten entries whose label contains `UVL-15W`, and no separate plain
`UVL-15` entry. Archive size is the total returned by the TYT server's HTTP
`Content-Range` response.

| Page label                               | Official archive                                                            |       Bytes | CPS/default evidence                                                                                         | Bundled firmware evidence               |
| ---------------------------------------- | --------------------------------------------------------------------------- | ----------: | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 2026-07-25 UVL-15W Firmware 20260725     | [ZIP](https://www.tyt888.com/uploads/file/20260725/20260725104726_6123.zip) |  51,025,388 | Nested `UVL-15W CPS & Firmware [Win10 11] 20260723.rar`; `Default_EN.PF` and `Default_CN.PF` in CPS 20260723 | 3.3.31 test build and 3.7.23            |
| 2026-07-15 UVL-15W firmware 20260715     | [ZIP](https://www.tyt888.com/uploads/file/20260715/20260715173730_4119.zip) |  50,828,588 | Nested `UVL-15W CPS & Firmware [Win10 11] 20260715.rar`; both defaults present                               | 3.3.31 test build and 3.7.15            |
| 2026-07-15 UVL-15W open sourse firmware  | [ZIP](https://www.tyt888.com/uploads/file/20260715/20260715091955_6795.zip) |      33,929 | No CPS or default folder; contains only the official data-storage and communications-protocol HTML documents | None in the archive                     |
| 2026-05-26 UVL-15W CPS firmware 20260526 | [ZIP](https://www.tyt888.com/uploads/file/20260526/20260526162432_6168.zip) |  52,786,521 | Direct CPS 20260526 tree; both defaults present                                                              | 3.3.31 test build and 3.5.26 test build |
| 2026-03-31 UVL-15W 20260331 FIRMWARE     | [ZIP](https://www.tyt888.com/uploads/file/20260331/20260331172549_2755.zip) | 101,597,931 | Direct Win10/11 and WinXP/7 CPS 20260331 trees, plus a nested RAR; both OS trees have identical defaults     | 3.3.31 test build                       |
| 2026-03-18 uvl-15w FIRMWARE 20260318     | [ZIP](https://www.tyt888.com/uploads/file/20260318/20260318163541_1672.zip) |  69,475,854 | Direct Win10/11 and WinXP/7 CPS 20260318 trees; both OS trees have identical defaults                        | 3.3.18 test build                       |
| 2026-03-17 UVL-15W20260316 Firmware      | [ZIP](https://www.tyt888.com/uploads/file/20260317/20260317082513_7610.zip) |  69,475,441 | Direct Win10/11 and WinXP/7 CPS 20260316 trees; both OS trees have identical defaults                        | 3.3.16 test build                       |
| 2025-12-25 UVL-15W firmware 1227         | [ZIP](https://www.tyt888.com/uploads/file/20251229/20251229135826_7626.zip) |  65,287,098 | Nested Win10/11 and WinXP/7 CPS 20251227 RARs; Win10/11 defaults examined                                    | 2.12.27 test build                      |
| 2025-11-19 UVL-15W firmware and CPS 1119 | [ZIP](https://www.tyt888.com/uploads/file/20251119/20251119170302_4521.zip) |  44,005,773 | Nested Win10/11 CPS 20251118 RAR; both defaults present                                                      | 2.11.18 test build                      |
| 2025-08-29 UVL-15W                       | [ZIP](https://www.tyt888.com/uploads/file/20250829/20250829143823_0322.zip) |  13,775,597 | Direct `UVL-15W Program Software20250703` tree; both defaults present                                        | 2.7.3 test build                        |

The page date, upload directory, and internal CPS date are not always the same.
The clearest example is the page's 2026-07-25 entry, whose archive contains CPS 20260723. The 2025-12-25 label similarly points at a 20251229 upload containing
CPS 20251227.

## Default-content comparison

The nine CPS releases reduce to four distinct default payload families.
SHA-256 hashes are given for both the exact 246,400-byte PF text and its decoded
102,400-byte payload.

| CPS dates using this exact family                | EN text SHA-256                                                    | EN decoded SHA-256                                                 | CN text SHA-256                                                    | CN decoded SHA-256                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 20250703                                         | `2d330f84cb88d3550c1b186af350704b686b6f5236fe92621f7bd6142044b8c0` | `da46623ca3c71657b018749a9c0ef5ea284a57ded467476191c37eb862498c81` | `e3f675e9010454f0843026cc770cf74104f0a1194525c56426f7619ff7ff5b0b` | `185e6039ed777a67aedca2515d4a0ea9361d14b6396f45a09a4fe1b9bdb27a3c` |
| 20251118, 20251227, 20260316, 20260318, 20260331 | `3abe7d326be92dbaae710c75f22ad611e6459d52be0e3ae1f1e380f6c16f876f` | `2b52234676461d8d9bbd5477eb78446f5e38fb25a03985facaa80775ca357342` | `1fa47ea1cb701b945c749370f1fbe8ca5e16bca248799ed61caab81950d0ae33` | `26ee4259ec35db6e768e8dcadd09a0c3e00bb04ac468c6227dda7c5417d24d16` |
| 20260526                                         | `53d860f5fab85a928e10a80c0d3784240c9b87a7d039e38dba4d5efbfa3be60a` | `431769774eee4d604b0cccb3365c67ee2bd9476e66905387e2ae8fdf3d02f1c8` | `d92cf69bba9665ec4aab643c000f9fef7b0d11e4dd655f2c4a002597a24e9ef6` | `9d387a696aaed879445926ff4e1cb1c3085dcea19050122385894d0539698f24` |
| 20260715, 20260723                               | `d8e3c5f6b39a43874c90eb84aeadff726789d15a3918c394f5e51773ad41fe3c` | `e9f2f60e0f1d5393559e3dd6861e85c3a4e4fcce122b4b63115e6a08949113cd` | `7551e6a58761374e0c3fb5d8f6f5fc71fa59f2f09a88d2eb6631d8a457f1ee85` | `717713cbb093bb9f56401fd9837a8068c2969beeea5d53d95b361b8e41a131c5` |

### Byte changes between consecutive CPS releases

Counts are over the decoded 102,400-byte payload.

| From     | To       | EN changed bytes | CN changed bytes |
| -------- | -------- | ---------------: | ---------------: |
| 20250703 | 20251118 |               18 |               20 |
| 20251118 | 20251227 |                0 |                0 |
| 20251227 | 20260316 |                0 |                0 |
| 20260316 | 20260318 |                0 |                0 |
| 20260318 | 20260331 |                0 |                0 |
| 20260331 | 20260526 |            3,082 |            3,082 |
| 20260526 | 20260715 |            4,602 |            4,604 |
| 20260715 | 20260723 |                0 |                0 |

This reuse is the strongest evidence against exact-firmware binding:

- one default family spans firmware 2.11.18, 2.12.27, 3.3.16, 3.3.18, and
  3.3.31;
- another family spans 3.7.15 and 3.7.23;
- Win10/11 and WinXP/7 packages in the March releases have matching PF CRCs;
- EN and CN use the same record layout. In the 20260715/20260723 family their
  decoded payloads differ at only one byte (`0xD400`: EN `0x02`, CN `0x00`).

## Retrieval and validation method

1. Read the current official page and resolved all ten direct TYT-hosted ZIP
   URLs above.
2. Used one-byte HTTP range requests to record authoritative archive lengths,
   then fetched the final 65,536 bytes to parse each ZIP central directory.
3. Checked the central-directory names before extraction. For direct CPS trees,
   fetched only the exact local ZIP entries for `Default_EN.PF` and
   `Default_CN.PF`. For CPS packaged as RAR, fetched and inflated the complete
   nested RAR entry, listed it, and extracted only `*/Default/*.PF`.
4. Fully downloaded and integrity-tested the 20250829 ZIP; its SHA-256 is
   `a5af475e1d826a895f9714403bb7e50193c280da3705173e117fa49e75a5fc9b`.
   Fully downloaded and integrity-tested the 20260715 open-source ZIP; its
   SHA-256 is
   `5ee64c169a571b11136b6fcd9495b637be1ae58862026e83c00bd6adc1f2c949`.
5. Strictly validated every PF record's hexadecimal shape, record length,
   continuous address, decoded length, and SHA-256. The supplied 20260723
   `Default_EN.PF` reproduced the official 20260715 default byte-for-byte.

Temporary evidence paths used during this run:

- `/private/tmp/tyt-uvl15-defaults.5arGHj/` — central-directory tails, exact ZIP
  entries, nested CPS RARs, and extracted PF files;
- `/private/tmp/tyt-uvl15-defaults.5arGHj/archives/20250829.zip` — independently
  downloaded and integrity-tested 20250829 package;
- the user-supplied 20260723 extraction under
  `/Users/abajour/Downloads/20260723 UVL-15W CPS and FW 2/`.

Temporary paths are ephemeral and should not be treated as repository inputs.

## Limitations

- The current TYT page is a point-in-time inventory and can change.
- This comparison proves a stable PF container across the packages available
  on 2026-09-01 and proves several byte-identical cross-version defaults. It
  does not prove compatibility with unobserved firmware, different UVL-15W
  hardware revisions, or a different radio model.
- Most large ZIPs were inspected with deterministic central-directory and
  exact-entry range retrieval instead of retaining and expanding every unrelated
  video, APK, DLL, firmware, and image file. The CPS RARs needed for the default
  comparison were retrieved completely. This is sufficient for the PF result,
  but it is not a malware or provenance audit of all bundled executables.
- The official page labels do not publish a PF format specification or a
  compatibility promise. The conclusion that one parser can handle all
  observed defaults is based on the files TYT published, not on a written TYT
  guarantee.
