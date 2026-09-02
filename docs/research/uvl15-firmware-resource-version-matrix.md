# UVL-15W Firmware, Language, and Image Resource Matrix

Research date: 2026-09-01

## Conclusion

The official TYT CPS packages establish a clear resource progression beginning
with the May 2026 firmware family:

| Firmware          | Package-intended Language | Package-intended Image | Confidence                                                                                       |
| ----------------- | ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| 2.7.3             | Unknown                   | Unknown                | No resource package or prerequisite found                                                        |
| 2.11.18           | Unknown                   | Unknown                | CPS contains an empty `Flash Data` folder                                                        |
| 2.12.27           | Unknown                   | Unknown                | CPS contains an empty `Flash Data` folder                                                        |
| 3.3.16            | Unknown                   | Unknown                | CPS contains an empty `Flash Data` folder                                                        |
| 3.3.18            | Unknown                   | Unknown                | CPS contains an empty `Flash Data` folder                                                        |
| 3.3.31            | Unknown                   | Unknown                | March CPS contains no resource file; later packages retain this firmware as a rollback/test file |
| 3.5.26 test build | **1.01.03**               | **1.01.00**            | Strong package pairing; vendor explicitly requires flash data after 3.5.16                       |
| 3.7.15            | **1.01.04**               | **1.01.00**            | Explicit Language prerequisite plus matching combined package                                    |
| 3.7.23            | **1.01.05**               | **1.01.00**            | Current package pairing, project catalog prerequisite, and physical single-Radio validation      |

This is enough to model three resource profiles for the resource-aware firmware
families:

- Firmware 3.5.26: Language 1.01.03 + Image 1.01.00;
- Firmware 3.7.15: Language 1.01.04 + Image 1.01.00;
- Firmware 3.7.23: Language 1.01.05 + Image 1.01.00.

It is **not** enough to assign Language 1.00.00 or Image 1.00.00 to every older
firmware. TYT supplies a combined `Language 1.00.00 And Image 1.00.00.DAT` in
the May and July packages, but never states that it is the required historical
pairing for firmware 2.x or 3.3.x. It should be treated as a supplied
baseline/fallback package with an undocumented purpose, not as evidence of the
older Radios' installed versions.

## Confidence vocabulary

- **Explicit prerequisite**: TYT's included operation document names the
  resource version that must be written before a firmware threshold.
- **Package-intended pairing**: one dated CPS tree contains a current firmware,
  separate Language and Image packages, and a combined package naming the same
  versions. This is strong evidence of intended use, but not a universal
  compatibility promise.
- **Co-bundled fallback**: an older firmware remains in a newer package beside
  current resources. Co-location alone does not prove that the old firmware
  requires those resources.
- **Unknown**: the official package contains no applicable resource file or
  version statement. Unknown is not silently replaced with 1.00.00.

## Vendor instruction timeline

The resource rules were added progressively to the first page of TYT's bundled
`Operation instruction.docx`:

| CPS package | Instruction-page evidence                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 20260331    | No resource prerequisite appears on page 1.                                                                                              |
| 20260526    | Before updating past firmware 3.5.16, write flash data. The screenshot on the same page shows firmware and Flash Data selected together. |
| 20260715    | Retains the 3.5.16 rule and adds Language 1.01.04 before firmware after 3.7.11.                                                          |
| 20260723    | Retains both rules and adds Language 1.01.05 for the 3.7.23 generation.                                                                  |

The latest document literally uses the translated phrase “version after
V3.7.23.” That wording is threshold-ambiguous. The 20260723 CPS nevertheless
packages firmware 3.7.23 with Language 1.01.05, and this repository's validated
catalog conservatively requires exact Language 1.01.05 for firmware 3.7.23.
That exact 3.7.23 pairing has also completed a single-Radio combined-resource
write and firmware-update workflow. See
[Firmware, Resource Flash, and Language Update Evidence](./firmware-flash-language-update-research.md)
and [`data/update-catalog/uvl15w.json`](../../data/update-catalog/uvl15w.json).

Primary instruction sources inspected and rendered:

- official 20260331 archive:
  [download](https://www.tyt888.com/uploads/file/20260331/20260331172549_2755.zip),
  `Operation instruction.docx`, page 1;
- official 20260526 archive:
  [download](https://www.tyt888.com/uploads/file/20260526/20260526162432_6168.zip),
  `Operation instruction.docx`, page 1;
- official 20260715 archive:
  [download](https://www.tyt888.com/uploads/file/20260715/20260715173730_4119.zip),
  `Operation instruction.docx`, page 1;
- official 20260723 extraction supplied by the user:
  `/Users/abajour/Downloads/20260723 UVL-15W CPS and FW 2/Operation instruction.docx`,
  page 1. The corresponding official outer archive is
  [20260725](https://www.tyt888.com/uploads/file/20260725/20260725104726_6123.zip).

## Official package inventory

### Packages without resource DAT files

| CPS date | Bundled current firmware | `Flash Data` evidence                                           |
| -------- | ------------------------ | --------------------------------------------------------------- |
| 20250703 | 2.7.3 test build         | No `Flash Data` directory in the official ZIP tree              |
| 20251118 | 2.11.18 test build       | Empty directory in the nested Win10/11 CPS RAR                  |
| 20251227 | 2.12.27 test build       | Empty directory in the nested Win10/11 CPS RAR                  |
| 20260316 | 3.3.16 test build        | Empty directory in the Win10/11 CPS tree; no resource DAT entry |
| 20260318 | 3.3.18 test build        | Empty directory in the Win10/11 CPS tree; no resource DAT entry |
| 20260331 | 3.3.31 test build        | Empty directory in the Win10/11 CPS tree; no resource DAT entry |

These archives prove absence of bundled update files, not the versions installed
at the factory. They therefore cannot support a safe updater prerequisite for
the older firmware families.

Package URLs and archive-to-firmware associations are recorded in
[UVL-15W Default PF Version Comparison](./uvl15-default-pf-version-comparison.md).

### CPS 20260526

The official
[20260526 package](https://www.tyt888.com/uploads/file/20260526/20260526162432_6168.zip)
contains firmware 3.3.31 as a prior test build and firmware 3.5.26 as the current
test build. Its current resource set is:

| Official entry                                      |      Bytes | SHA-256                                                            | Internal version marker                                              |
| --------------------------------------------------- | ---------: | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `Flash Data/Language/Language 1.01.03.DAT`          |    212,674 | `c3903930af4a13f25c811a56384503f646abf52e6eee65d843d36460c90dfda2` | `01 01 03` at flash `0x74002C`                                       |
| `Flash Data/Image/Image 1.01.00.DAT`                |  7,139,209 | `0164e952aca45c345f152936fd57b54744be5aff78f6ef0b9ec5f63c2abbb5d2` | `01 01 00` at flash `0x170000`                                       |
| `Flash Data/Language 1.01.03 And Image 1.01.00.DAT` | 16,084,992 | `b3d7d361e9fdf31d595dcd22ec2d5d16305a6067ada6d9ec4973fa1ee013a984` | both markers present                                                 |
| `Flash Data/Language 1.00.00 And Image 1.00.00.DAT` | 16,084,992 | `bef6edaef08ac7d2a201186f00b3be2d660a2e33253e853eb3d45b99f133f889` | version known from filename only; current-version markers are absent |

The combination of the new instruction to write flash data after 3.5.16, the
3.5.26 current firmware, and an exact combined 1.01.03 + 1.01.00 DAT makes that
the intended 3.5.26 resource profile. The retained 3.3.31 firmware is not proof
that 3.3.31 requires these resources: its own March package had no DAT files.

### CPS 20260715

The official
[20260715 package](https://www.tyt888.com/uploads/file/20260715/20260715173730_4119.zip)
contains firmware 3.3.31 as a prior test build and firmware 3.7.15 as current.
Its resource set is:

| Official entry                                      |      Bytes | SHA-256                                                            | Internal version marker                          |
| --------------------------------------------------- | ---------: | ------------------------------------------------------------------ | ------------------------------------------------ |
| `Flash Data/Language/Language 1.01.04.DAT`          |    233,310 | `72d02dde371340780b8ce7f43e783529bab7e9b10f53b6d76383b42834e0695e` | `01 01 04` at flash `0x74002C`                   |
| `Flash Data/Image/Image 1.01.00.DAT`                |  7,139,209 | `0164e952aca45c345f152936fd57b54744be5aff78f6ef0b9ec5f63c2abbb5d2` | `01 01 00` at flash `0x170000`                   |
| `Flash Data/Language 1.01.04 And Image 1.01.00.DAT` | 16,084,992 | `e447157d28cda739d27c50a1df4414f3b93df9fdf76daa95ebec26cfa6209ab5` | both markers present                             |
| `Flash Data/Language 1.00.00 And Image 1.00.00.DAT` | 16,084,992 | `bef6edaef08ac7d2a201186f00b3be2d660a2e33253e853eb3d45b99f133f889` | same filename-identified baseline package as May |

TYT's instruction explicitly requires Language 1.01.04 for firmware versions
after 3.7.11. Firmware 3.7.15 satisfies that threshold. The matching combined
DAT establishes Image 1.01.00 as the package-intended companion.

### CPS 20260723

The user-supplied extraction of TYT's official 20260723 CPS contains firmware
3.3.31 as a prior test build and firmware 3.7.23 as current. Its resource set is:

| Official entry                                      |      Bytes | SHA-256                                                            | Internal version marker                                      |
| --------------------------------------------------- | ---------: | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `Flash Data/Language/Language 1.01.05.DAT`          |    237,853 | `bcf6c1f19233518d7bb7fde970a1062843f3868b5876d3ea6c3e6ed5e291e1e6` | `01 01 05` at flash `0x74002C`                               |
| `Flash Data/Image/Image 1.01.00.DAT`                |  7,139,209 | `0164e952aca45c345f152936fd57b54744be5aff78f6ef0b9ec5f63c2abbb5d2` | `01 01 00` at flash `0x170000`                               |
| `Flash Data/Language 1.01.05 And Image 1.01.00.DAT` | 16,084,992 | `56213735761983aefd5ea6e9e449c1cbb0d998ebe851857102a02275fdf80934` | both markers present                                         |
| `Flash Data/Language 1.00.00 And Image 1.00.00.DAT` | 16,084,992 | `bef6edaef08ac7d2a201186f00b3be2d660a2e33253e853eb3d45b99f133f889` | same filename-identified baseline package as May and July 15 |

The current repository catalog requires exact Language 1.01.05 before firmware
3.7.23 and targets Image 1.01.00. Unlike the older profiles, this exact set has
been parsed, captured from the official CPS, reproduced by the browser updater,
and physically exercised on the available 3.07.23 Radio. It remains beta because
second-Radio and controlled-interruption evidence are separate release gates.

## Resource lineage

The package hashes establish two useful facts independently of filenames:

1. **Image 1.01.00 is byte-identical in CPS 20260526, 20260715, and 20260723.**
   There is one observed current Image resource across all three
   resource-aware firmware families.
2. **The combined 1.00.00 + 1.00.00 baseline is also byte-identical in all
   three packages.** Its stable presence does not identify which old firmware
   used it or whether TYT intended it only for recovery/factory reset.

The current separate and combined DAT contents carry independent version bytes:

- Image version begins at resource address `0x170000`;
- Language version is present at `0x74002C..0x74002E`;
- each current combined DAT contains the matching Image and Language markers.

Therefore the three current pairings do not depend only on human-readable
filenames. The 1.00.00 + 1.00.00 baseline is the exception: it lacks the current
marker structures at those addresses, so its version label comes only from the
vendor filename.

## Implications for 73Kit support

The updater can encode the observed pairings as exact profile data without
claiming unsupported compatibility:

| Firmware target | Required/expected resources      | Safe status from present evidence                                                |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| 3.5.26          | Language 1.01.03 + Image 1.01.00 | Catalog candidate only; package and instruction evidence, no physical validation |
| 3.7.15          | Language 1.01.04 + Image 1.01.00 | Strong next candidate; explicit Language rule, no physical validation            |
| 3.7.23          | Language 1.01.05 + Image 1.01.00 | Existing beta profile; single-Radio validated                                    |

Firmware 2.7.3 through 3.3.31 should keep resource versions `unknown`, not
invent defaults. Adding them to the updater requires either an official package
or a physical Radio readout establishing installed versions and a controlled
update path.

TYT's normal E1 device-information response exposes the Image-resource version
but not the Language-resource version. The browser can therefore verify Image
automatically after reboot, while Language still needs an operator-visible
Radio menu check. See
[TYT UVL-15W Data Storage Reference](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#sec2_0)
and [updater manual validation](../testing/updater-manual-validation.md).

## Retrieval and validation method

1. Parsed the central directories of every TYT-hosted CPS archive listed in
   [the PF package inventory](./uvl15-default-pf-version-comparison.md), including
   nested RAR CPS trees, and recorded all `Firmware/` and `Flash Data/` entries.
2. Confirmed the absence or emptiness of `Flash Data` in every CPS through 20260331.
3. Extracted the full retained 20260715 CPS RAR and hashed every firmware and
   resource file.
4. Hashed the user-supplied 20260723 extraction and matched its current files to
   the existing updater evidence and catalog.
5. Retrieved only the four exact `Flash Data` entries from the official
   20260526 ZIP by their central-directory offsets, inflated them, and calculated
   SHA-256.
6. Parsed the address-record DAT text to verify the internal Image and Language
   version markers, including both markers inside each combined current DAT.
7. Retrieved, rendered, visually inspected, and text-extracted page 1 of TYT's
   20260331, 20260526, 20260715, and 20260723 operation documents.

Temporary research evidence was held under
`/private/tmp/tyt-uvl15-defaults.5arGHj/`,
`/private/tmp/uvl15-resource-inspect/`, and
`/private/tmp/uvl15-operation-*`. These paths are ephemeral and are not product
inputs.

## Limitations

- A dated archive is evidence of what TYT distributed together, not a promise
  that every hardware revision can safely use the same packages.
- The exact prerequisite wording is translated and inconsistent at the
  3.7.23 boundary. The repository intentionally uses the safer exact
  Language-1.01.05 prerequisite for 3.7.23.
- The firmware binaries expose their firmware version in their headers, but no
  independent required-Language or required-Image declaration was found there.
  The resource relationship comes from TYT's instruction document, dated
  package composition, DAT-internal markers, and, for 3.7.23, physical evidence.
- No older physical Radio was available to read its installed Image and
  Language versions. Those rows remain unknown.
