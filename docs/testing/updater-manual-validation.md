# UVL-15W Browser Updater Manual Validation

Status: the four exact 2026-07-23 packages are released as a single-Radio beta.
Protocol discovery and the complete success paths are finished; do not repeat
the official-CPS capture campaign or these success-path writes. Stable
promotion still requires a second compatible Radio and the controlled
interruption/recovery matrix.

## Purpose

This plan validates the browser path separately from the already verified
official-CPS evidence. It covers one Radio at a time because the browser CPS
does not implement batch updating.

The production build permits only catalog entries marked `beta` or `stable`.
Every visit to the Updates page starts behind a beta-risk dialog. The user must
explicitly acknowledge it before package selection and the normal preparation
checks become usable. Catalogued `disabled` packages are rejected before Web
Serial opens.

## Fixed evidence set

Use only the vendor files whose SHA-256 values are pinned in
`docs/research/firmware-flash-language-update-research.md`:

- Firmware `3.7.23`;
- Language `1.01.05`;
- Image `1.01.00`;
- combined Language `1.01.05` and Image `1.01.00`.

Before physical testing, run the offline verifier documented in
`scripts/research/uvl15w-update-evidence/README.md`. It must pass in full and
opens no serial port.

## Common preparation

1. Make a current Raw Backup with **Radio Read**.
2. Use a charged Radio battery and a direct, stable USB connection.
3. Close the official TYT CPS and every other program that could own the port.
4. Open `/tr/updates` or `/en/updates` in the development build.
5. Choose exactly one package. Confirm the expected kind, version, and block
   count before a serial-port prompt appears.
6. Power the Radio off. Hold PTT plus the top orange button while powering it
   on to enter update mode. Keep USB connected.
7. Acknowledge the entry dialog, then complete every preparation checkbox.
   Never interrupt a success-path case.
8. After transfer finalization, power the Radio off, release all buttons, and
   power it on normally.
9. For Language or combined packages, inspect the Radio and explicitly confirm
   Language `1.01.05`; the normal handshake does not report this version.
10. Select **Connect and verify**. The case passes only after reported versions
    match where available and a complete normal Codeplug read succeeds.

Record the browser/version, operating system, Radio hardware and bootloader
versions, starting versions, package hash, result, and final-state screenshot.
Do not record raw update-mode `1C` fields, session keys, CPU IDs, serial
numbers, or activation material.

## Success-path cases

### UPD-PHY-01 - Language Resource Write

- Package: Language `1.01.05`
- Expected blocks: `194`
- Required manual version check: Language `1.01.05`
- Final gate: complete normal Codeplug read
- 2026-08-28 observation: the first browser Language update completed
  successfully on the available Radio (user-reported).

### UPD-PHY-02 - Image Resource Flash

- Package: Image `1.01.00`
- Expected blocks: `5,795`
- Expected reported version after reboot: Image Resources `1.01.00`
- Final gate: complete normal Codeplug read
- 2026-08-28 observation: the first browser attempt entered Update Outcome
  Unknown after block 418 was acknowledged. The Radio subsequently started
  normally. The official CPS then recovered it with the exact Image package by
  rewriting all 5,795 blocks from the first address using its recovery-only
  start payload; finalization and the following normal Radio read succeeded.
  The browser success path and browser recovery profile still require a live
  pass, so this is not yet a passed browser success-path case.
- 2026-08-28 second browser observation: after official-CPS recovery, the Radio
  acknowledged blocks 1–2,217 and returned `EE / Frame Head Error` for block
  2,218 at `0x00285200`. The browser frame was valid and byte-for-byte identical
  to the successful official-CPS frame at that address. This established the
  bounded exact-E4 retry policy for pre-execution Head/Tail/Length/LRC parser
  errors. The Radio was recovered again with the official CPS before testing
  that correction.
- 2026-08-28 final browser observation: after the bounded exact-E4 parser retry
  correction, the complete Image `1.01.00` update succeeded on the available
  Radio (user-reported). This passes the single-Radio browser success path; the
  interruption matrix and a second compatible Radio remain separate gates.

### UPD-PHY-03 - Combined Resource Flash

- Package: combined Language `1.01.05` and Image `1.01.00`
- Expected blocks: `13,056`
- Expected reported version after reboot: Image Resources `1.01.00`
- Required manual version check: Language `1.01.05`
- Final gate: complete normal Codeplug read
- 2026-08-28 observation: the complete combined Language `1.01.05` and Image
  `1.01.00` browser update succeeded on the available Radio (user-reported).
  This passes the single-Radio browser success path; the interruption matrix
  and a second compatible Radio remain separate gates.

### UPD-PHY-04 - Firmware Update

- Prerequisite: Language `1.01.05` is installed
- Package: Firmware `3.7.23`
- Expected blocks: `1,590`
- Expected reported firmware after reboot: `3.07.23`
- Final gate: complete normal Codeplug read
- 2026-08-28 first browser observation: blocks 1–176 were acknowledged, then
  the Radio returned `EE / Frame Head Error` for structurally valid block 177.
  The Radio started normally and the user performed an exact-package official
  CPS recovery. This established bounded exact-`C2` parser-error retry; the
  corrected browser success path still requires a live pass.
- 2026-08-28 second browser observation: after official-CPS recovery, blocks
  1–111 were acknowledged. The valid block-112 Web Serial write completed, but
  no complete Radio response arrived within ten seconds. The app correctly did
  not retry the timeout and retained block 111 as the last acknowledgement.
  The Radio was restored again with the exact official package. Transfer-only
  raw RX, write-completion, decoder-buffer, and terminal-error trace events were
  added before another controlled browser run.
- 2026-08-28 final browser observation: after the second official-CPS recovery
  and transfer-only serial instrumentation, the complete Firmware `3.7.23`
  update succeeded on the available Radio (user-reported). The retained trace
  confirms block 1,590 received `2C "OK"`, `C3` verification returned the exact
  expected value, the second identity handshake completed, and `C4` completion
  returned `OK`. This passes the single-Radio browser success path; the
  interruption matrix and a second compatible Radio remain separate gates.

Reinstalling the same validated firmware is acceptable for the first protocol
test. Do not use the supplied `3.3.31 [Test Version]` package.

## Pre-write rejection cases

These cases must fail before Web Serial opens:

| Case       | Input                                      | Expected result                         |
| ---------- | ------------------------------------------ | --------------------------------------- |
| UPD-NEG-01 | empty `.Fir` or `.DAT`                     | Empty package rejected                  |
| UPD-NEG-02 | renamed non-package file                   | Extension/format rejected               |
| UPD-NEG-03 | supplied `3.3.31 [Test Version]` firmware  | Unknown package rejected                |
| UPD-NEG-04 | one-byte-modified validated package        | Hash/integrity rejected                 |
| UPD-NEG-05 | non-contiguous or wrong-address DAT        | Record/address policy rejected          |
| UPD-NEG-06 | unchecked preparation item                 | Start action remains blocked            |
| UPD-NEG-07 | normal-mode Radio selected for update      | Update-mode identity/response rejected  |
| UPD-NEG-08 | different model or unvalidated Radio build | Compatibility gate rejects before write |

## Recovery cases

Do not perform interruption cases on the only available Radio. Use a second
compatible Radio or a documented vendor recovery setup. Each case must confirm
that the browser stores an **Update Outcome Unknown** record containing only
the validated package summary, package hash/kind, phase, last acknowledged
block/address, timestamp, expected versions, and sanitized Radio fingerprint.
The summary contains metadata only, never package bytes. It keeps the
downloadable support report useful after a page reload.

| Case       | Controlled interruption point              |
| ---------- | ------------------------------------------ |
| UPD-REC-01 | after update start, before first block ACK |
| UPD-REC-02 | after an early block ACK                   |
| UPD-REC-03 | during the middle of the transfer          |
| UPD-REC-04 | after final block, before finalization     |
| UPD-REC-05 | after finalization, before normal reboot   |
| UPD-REC-06 | during post-reboot complete Radio Read     |

For every recovery case, prove the UI does not report success, does not retry a
destructive command except for the narrow parser-error policy below, preserves
the recovery record after page reload, and presents the same-package official
TYT recovery instruction.

The non-Radio UI regression checks must also prove that completed workflow
steps are distinct from upcoming steps, unsupported browsers cannot start an
update, and navigation locked by an active update is not labelled as a planned
feature.

When the Radio starts normally, the browser recovery flow must first complete a
normal-mode Radio Read. It may then unlock only the exact package hash recorded
for the interrupted operation. Selecting another package must remain blocked.
The original recovery record remains persisted until either the same-package
browser recovery completes verification or the user explicitly confirms that
official CPS recovery with the exact package is complete. That confirmation is
available only after the normal-mode read succeeds; it clears the browser's
local warning and does not write to the Radio.

For `EE / Frame Head Error`, `Frame Tail Error`, `Frame Length Error`, or
`Frame Lrc Error`, the browser retries the exact encoded `C2` Firmware or `E4`
Resource block at most three total attempts. It never advances the block
counter before the matching `2C "OK"` or `E6` acknowledgement. It never
automatically retries `Option Value Error`, other responses, timeouts,
disconnects, handshake/start commands, verification, completion, or
finalization.

Physical Image and Firmware failure tests must download and retain the error
report offered by the failure UI. If a parser error occurs, verify that its
`protocolEvents` show the byte-identical `E4` address/frame or `C2` block/frame
on the next attempt and then the matching acknowledgement. Three rejected
attempts must still end in Update Outcome Unknown with the preceding
block/address recorded.

For a timeout, the downloaded report must show whether the serial write
completed, every raw transfer-phase RX chunk, and the response decoder's
remaining byte count. Zero buffered bytes means no partial frame remains in the
browser decoder; non-zero bytes preserve the incomplete response for diagnosis.
Neither case is automatically retried. Raw chunk tracing must remain disabled
during identity handshakes and finalization.

The frontend must not expose a live protocol console. The download action is
shown only after an ordinary failure or Update Outcome Unknown. Confirm that
the generated JSON is local-only, clearly discloses that recent serial traffic
can contain transmitted package blocks, and contains no firmware session keys
or `1C` identity/activation payloads.

Capture 10 establishes one additional, exact recovery case: Image `1.01.00`
after a partial Image write. After normal-mode inspection and exact-package
selection, the browser must use the catalog's recovery-only `E3` payload and
rewrite from `0x00170000`; it must not resume from the stored block. Packages
without an explicit captured recovery payload must be rejected before the
serial port opens and handed off to the official TYT CPS.

## Release decision

The release state is per exact catalog package, not per package kind or build:

- `disabled`: the evidence or automated checks are incomplete;
- `beta`: the exact package completed transfer, reboot/version verification,
  and a full normal Radio Read on one compatible Radio; automated checks and
  both locale UI checks pass; every Updates-page visit requires explicit beta
  acceptance;
- `stable`: the beta requirements plus the same success path on a second
  compatible Radio and the controlled interruption/recovery matrix.

The four fixed packages above met the beta gate on 2026-08-28. They remain beta
because no second compatible Radio is currently available and intentionally
interrupting the only Radio is not justified. This is an explicit accepted
risk, not evidence that those unperformed cases passed.

For a later TYT package, model, hardware revision, bootloader, or protocol
revision, register a new evidence set. Do not replace these hashes or infer
compatibility from filenames.
