# Radio Write Enablement Research

Date: 2026-08-28

## Answer

**Radio Write should not be enabled in the product yet.** The repository has
enough protocol information to implement a full-range writer, but it does not
yet have the durable safety lifecycle around the now-implemented internal
protocol writer or physical write/reboot/readback evidence for the browser
path.

There is no known vendor-protocol blocker for an unprotected UVL-15W on the
currently validated normal-mode firmware `3.07.23`. The blocker is proof and
implementation, not a missing command value. All range, size, address, and
storage claims in this note are scoped to the `3.07.23` Codeplug layout; they
must not be assumed for older or newer firmware. The supplied protocol defines
a complete normal-mode write sequence over the same USB CDC transport already
used for Radio Read:

```text
E0/E1 identity
  -> optional E7 write-password verification
  -> E3 full range 0x8000..0x21000
  -> E4 512-byte block / E6 "WF OK" + echoed address and length
  -> repeat across all 102,400 bytes
  -> E5 "Write Complete"
  -> "Reboot"
```

See the reviewed vendor communication protocol's
[command reference](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#51-command-summary),
[write-block format](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#56-cmd-0xe4-write-a-data-block),
and [complete write flow](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#62-complete-write-flow).

For this CPS, that protocol-level completion is **not** product success. A safe
Radio Write must additionally reconnect, perform a complete Radio Read, compare
all 102,400 bytes with the intended write image, and only then create a new
Baseline Backup and report success. That requirement is already the canonical
product meaning of Radio Write
([domain context](../../CONTEXT.md#L47-L52)) and the documented safe-write plan
([feature reference](../CPS_FEATURE_REFERENCE.md#83-safe-verified-writes--high-value--future)).

The first supported scope should be **USB CDC only, firmware `3.07.23`, and a
Radio that does not require a write password**. Bluetooth CPS transport remains
unsupported and unverified in the tested setup and must not delay the USB
writer ([Bluetooth host research](bluetooth-host-connectivity-research.md)). A
write-protected Radio can be rejected explicitly at first; general support
requires a separate E7 password feature.

## Evidence classification

### Confirmed protocol facts

- For firmware `3.07.23`, the reviewed Codeplug range is
  `0x00008000..0x00021000`, exactly 102,400 bytes. Addresses and lengths are
  big-endian
  ([protocol overview](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#12-address-space)).
- E1 exposes separate read- and write-protection flags, plus model, sub-model,
  firmware, CPU ID, hardware, bootloader, and serial-number fields
  ([E1 layout](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#52-cmd-0xe1-device-information-response-71-bytes)).
- E3 begins a write session for a declared range and expects `WRITE START OK`.
  E4 carries address, length, and data. Its E6 acknowledgement contains
  `WF OK` plus the echoed address and length
  ([E3](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#55-cmd-0xe3-begin-writeclone-session),
  [E4](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#56-cmd-0xe4-write-a-data-block)).
- E5 with the exact 14-byte ASCII payload `Write Complete` returns `Reboot`; the
  document says the Radio reboots after approximately 400 ms
  ([E5](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#57-cmd-0xe5-complete-readwrite-session)).
- E7 type `0x01` verifies an eight-byte padded write password when the E1
  write-protection flag requires it
  ([E7](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#59-cmd-0xe7-password-verification)).
- The protocol recommends retrying the corresponding command for an explicit
  `Frame Lrc Error`; it does not define transaction atomicity, safe omission of
  unchanged blocks, cancellation, or blind resume after interruption
  ([error responses](../technical/TYT_UVL-15W_Communication_Protocol_V3.0_EN_REVIEWED.md#510-cmd-0xee-generic-error-response)).

### Confirmed repository status

- The framing, escaping, LRC, continuous receive pump, timeouts, and bounded
  checksum retry machinery already exist and are used by the hardware-proven
  read path ([protocol codec](../../modules/uvl15w-radio/protocol.ts),
  [Radio module](../../modules/uvl15w-radio/index.ts)).
- `Uvl15wRadio` now exposes an internal `write` operation for a complete
  materialized firmware-`3.07.23` image. It implements E3, 200 ordered E4
  blocks, strict E6 acknowledgement validation, E5 completion, bounded retry
  only for explicit `Frame Lrc Error`, and destructive-boundary error details.
  It is covered through the scripted Transport but is not exposed through the
  CPS Workspace or production UI
  ([Radio module](../../modules/uvl15w-radio/index.ts),
  [writer tests](../../test-support/uvl15w-radio-write.test.ts)). E7 remains
  unimplemented.
- `CpsWorkspace` creates an in-memory Baseline Backup and Working Codeplug after
  a successful read, but exposes no write operation, no Backup History, and no
  recovery state ([workspace module](../../modules/cps-workspace/index.ts)).
- Semantic Change Set tracking exists for the current editors, but there is no
  user-facing review projection with before/after values and no confirmation
  gate. The UI provider exposes `readRadio` and edit actions, not `writeRadio`
  ([workspace provider](../../components/cps-workspace-provider.tsx#L75-L121)).
- Baseline Backup, Working Codeplug, Change Set, and Source Radio live only in
  React/module memory. Reloading or closing the tab loses them. Only Raw Backup
  download exists; durable Backup History, saved Working Codeplugs, CPS
  import/export, and interrupted-write recovery remain unfinished
  ([feature roadmap](../CPS_FEATURE_REFERENCE.md#epic-14--pwa--saved-working-codeplugs--import-export)).
- The Web Serial adapter always calls `requestPort()` and has no `getPorts()`,
  retained-port, or reconnect API
  ([Web Serial adapter](../../adapters/web-serial/index.ts#L130-L204)). Chrome
  requires `requestPort()` to run from a user gesture, while `getPorts()`
  returns previously permitted ports and `connect`/`disconnect` events expose
  device reattachment. This matters because the required workflow reboots the
  Radio after the preflight read, after the write, and after the verification
  read
  ([Chrome Web Serial guide](https://developer.chrome.com/docs/capabilities/serial),
  [Serial API specification](https://wicg.github.io/serial/#dom-serial-requestport)).
- Normal-mode firmware compatibility is currently limited to `3.07.23`
  ([update catalog](../../data/update-catalog/uvl15w.json)).

### Strong storage evidence and implemented write-image materialization

The reviewed storage reference is reconstructed from the vendor Qt CPS and
controlled exports. It is strong implementation evidence, but it is not a
physical browser Radio Write result.

- A full write must copy the complete VFO A record to Temp A and VFO B to Temp
  B, 48 bytes each
  ([VFO/Temp rule](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#32-vfo-channels)).
- A full write should restore all ten fixed WX records from the documented
  templates
  ([WX rule](../technical/TYT_UVL-15W_Data_Storage_Reference_V1.0_EN_REVIEWED.md#35-wx-channels)).
- The Codeplug interface now materializes a firmware-`3.07.23` write image that
  applies both rules, preserves the Working Codeplug, returns immutable bytes
  and SHA-256, and exposes only semantic derived-change markers
  ([write-image materializer](../../modules/codeplug/write-image.ts),
  [Codeplug](../../modules/codeplug/index.ts)).

The materialized write image, rather than the pre-normalization Working
Codeplug bytes, is the future byte-for-byte verification target. The
materializer reports whether VFO/Temporary Channel mirroring or fixed Weather
Channel restoration changed bytes so Change Set review can disclose those
internal normalizations without exposing offsets.

### Hardware-unverified assumptions

The repository currently has no retained capture or completed test of a normal
Codeplug write from this browser CPS. The feature matrix explicitly leaves
physical write/reboot/readback verification incomplete
([feature status](../CPS_FEATURE_REFERENCE.md#13-feature-status-matrix)). Until
tested, the following remain assumptions:

- firmware `3.07.23` accepts the documented full-range E3/E4/E6/E5 flow from
  Chrome over USB CDC;
- 200 consecutive 512-byte E4 blocks are the correct browser transfer shape;
- the Radio's E6 acknowledgement and E5 reboot response exactly match the
  reviewed document during a Codeplug write;
- resending an identical block after an explicit LRC error is safe on the
  physical Radio;
- Chrome retains or rediscovers the selected USB port cleanly across each
  Radio reboot on macOS and Windows;
- the documented VFO/Temp mirroring and fixed WX templates match the currently
  supported firmware's real save behavior;
- a disrupted write is recoverable by a subsequent complete read and complete
  rewrite; the protocol does not promise atomicity or a resumable transaction;
- every currently editable semantic mapping is safe to expose in a production
  write. In particular, DTMF, 2-Tone, and 5-Tone still lack the documented
  controlled TYT CPS export-diff and physical read/write/readback verification
  ([feature roadmap](../CPS_FEATURE_REFERENCE.md#epic-12--dtmf--2-tone--5-tone)).

## Release blockers

### Blockers before any engineering-only physical write

1. **Protocol writer — implemented in scripted tests.** E3, the complete
   full-range E4 transfer, strict E6 validation, E5 completion, progress, and
   destructive-start tracking now live inside `modules/uvl15w-radio`. This is
   not physical write evidence or product-level success.
2. **Use the exact write image.** The firmware-`3.07.23` Codeplug materializer
   now applies the VFO-to-Temp and fixed-WX invariants without exposing offsets,
   and freezes/hashes the 102,400-byte result. The future writer and coordinator
   must use this artifact rather than `WorkingCodeplug.codeplug.toBytes()`.
3. **Failure boundaries — implemented at the protocol seam.** Failures before
   the first E4 attempt are ordinary failures. From immediately before that
   attempt, protocol errors report `write-outcome-unknown` and acknowledged
   byte count. Timeout/disconnect resume is deliberately absent. Step 4 must
   durably preserve this state until exact readback resolves it.
4. **Create a controlled recovery setup.** Preserve a known-good baseline and
   confirm that the official TYT CPS can read and restore the test Radio before
   the browser sends E3. Use USB only and a dedicated/recoverable Radio.

### Blockers before a user-facing beta

1. **Move orchestration into the CPS Workspace.** It must own an immutable
   operation snapshot, Source Radio checks, preflight read, recovery backup,
   write, post-reboot read, exact comparison, Baseline Backup creation, and
   recovery. The React provider should render state and invoke this one deep
   workflow, not assemble protocol phases itself
   ([module ownership](../architecture/module-design.md#cps-workspace)).
2. **Persist safety data before E3.** Store the immutable preflight backup,
   intended write-image hash/bytes, Source Radio fingerprint, Change Set
   snapshot, operation phase, and timestamps in durable browser storage. Keep
   the record until exact verification succeeds. `localStorage` is suitable for
   small recovery metadata, but the Codeplug bytes and Backup History should use
   IndexedDB or an equivalent durable local store.
3. **Define Source Radio identity.** Add one canonical stable fingerprint and
   comparator. A reasonable design is model + sub-model + CPU ID + serial
   number, with firmware/hardware/bootloader handled as compatibility gates
   rather than permanent identity because firmware/resources can change. This
   is an inference from the E1 fields and must be made explicit and tested.
4. **Implement preflight semantics exactly.** Re-read the Radio immediately
   before writing and retain that read as the recovery backup. If its Source
   Radio differs, stop. If its bytes differ from the expected Baseline Backup,
   stop and begin a new working session; never silently rebase the user's
   Change Set
   ([pre-write backup rule](../CPS_FEATURE_REFERENCE.md#82-automatic-pre-write-recovery-backup--required-for-radio-write)).
5. **Implement reboot-aware Web Serial reuse.** Retain the user-selected port,
   wait for disconnect/reconnect, and use an already granted port where
   possible. If automatic reuse fails, persist `Write Outcome Unknown` and ask
   for an explicit user gesture to select the port for verification. Every
   reopened Radio must pass E0/E1 Source Radio comparison before the workflow
   continues.
6. **Add human review and confirmation.** Render each semantic Change Set item
   with owner-facing before/after values, reject an empty Change Set, disclose
   the full-Radio write and reboot, and require explicit confirmation after the
   preflight backup succeeds. The action must be disabled for an unbound or
   mismatched Codeplug.
7. **Gate password-protected Radios.** The smallest beta can stop before E3 with
   a clear `write-password-required` result. General availability needs E7 type
   `0x01`, transient password handling, no logging/persistence of the password,
   explicit incorrect-password behavior, and tests.
8. **Add recovery UX.** On reload, show the persisted `Write Outcome Unknown`
   record first. The only safe next action is reconnect, read the whole Radio,
   compare against both recovery backup and intended image, then guide a fresh
   reviewed full write if recovery is needed. Never claim success from ACK
   count alone.
9. **Restrict evidence scope.** Initially allow only USB, firmware `3.07.23`,
   Source-Radio-bound Working Codeplugs created by a successful Radio Read, and
   Change Set kinds whose encodings have adequate controlled evidence. Import
   support is not required for the first writer; if imports are later allowed,
   Raw Backup imports must remain Unbound and non-writable
   ([export ADR](../adr/0001-separate-raw-and-identity-bound-exports.md)).

Undo/redo, bulk edit, PWA packaging, Bluetooth transport, and general import
support are useful but are **not** blockers for a USB-only writer restricted to
a fresh Source-Radio-bound working session. Durable recovery data, Change Set
review, Source Radio comparison, and readback verification are blockers.

## Recommended development and verification phases

### Phase 1 — Freeze the safety contract

- Define the stable Source Radio fingerprint and compatibility fields.
- Define the immutable `PreparedRadioWrite`: Source Radio fingerprint,
  Baseline Backup ID/hash, recovery backup ID/hash, semantic Change Set,
  materialized target bytes/hash, and creation time.
- Define a state machine with at least `preflight-reading`, `review-required`,
  `writing`, `awaiting-reconnect`, `verifying`, `verified`, and
  `outcome-unknown`.
- Define when cancellation is allowed. It should be available before E3/first
  E4 only; after destructive start the UI must not present cancellation as
  harmless.

Exit gate: domain tests prove that an empty Change Set, Unbound Codeplug,
mismatched Source Radio, baseline drift, unsupported firmware, and
write-protected Radio are rejected before E3.

### Phase 2 — TDD the Radio writer without hardware — implemented

Use the existing scripted Transport and production frame codec. Cover:

- the exact E3 full-range request;
- exactly 200 ordered 512-byte E4 blocks for 102,400 bytes;
- correct address and big-endian length encoding;
- strict E6 command, `WF OK`, echoed-address, and echoed-length validation;
- no next block before the current ACK;
- bounded identical-block retry only for the explicitly supported LRC-error
  cases;
- no automatic timeout/disconnect resume;
- exact E5 `Write Complete` and `Reboot` validation;
- interruption before E3 versus before/after first E4;
- wrong, late, duplicated, malformed, split, and checksum-invalid responses;
- progress and recovery details that never contain Codeplug or identity bytes.

Exit gate: unit/integration tests prove every command and failure boundary, and
the production UI still has no reachable Radio Write action.

### Phase 3 — Implement the CPS Workspace coordinator and persistence

- Materialize and hash the intended write image.
- Persist the Baseline Backup, automatic preflight recovery backup, intended
  image, fingerprint, and operation record before E3.
- Add preflight read/baseline/source checks and semantic review projection.
- Add post-write reconnect, complete verification Radio Read, byte comparison,
  new immutable Baseline Backup, and ordered Backup History.
- On any uncertain result, retain recovery state across reload and power loss.
- Reuse the updater's useful pattern of a persisted outcome-unknown record, but
  keep Radio Write inside the CPS Workspace as the architecture requires.

Exit gate: scripted end-to-end tests cover success, baseline drift, wrong Radio
at every reconnect, tab reload in every phase, mismatch after readback, and
recovery-record clearance only after exact verification.

### Phase 4 — Implement the browser/desktop UX

- Add a desktop Change Set review and confirmation flow using existing shadcn
  patterns.
- Show stage-specific progress: preflight backup, writing, reboot/reconnect,
  verification read, comparison.
- Add an unload warning and clear power/cable guidance while destructive work
  is active.
- Implement retained-port/`getPorts()` reconnect with a user-gesture fallback.
- Keep the UI locked against competing Radio operations. Do not call a transfer
  “complete” while verification is pending.

Exit gate: automated browser tests cover permission denial, port disappearance,
reconnect fallback, reload recovery, and all visible success/unknown states.
Per the repository instructions, final UI validation must use Chrome.

### Phase 5 — Controlled physical canary

Use one reversible, well-understood setting change on a dedicated Radio with
firmware `3.07.23`, USB CDC, a charged battery, stable cable/power, a separately
saved official-CPS backup, and a proven official-CPS restore path.

1. Capture a baseline with both this CPS and the official TYT CPS.
2. Preferably capture one official-CPS normal write first to confirm block size,
   ordering, ACKs, VFO/Temp and WX behavior, E5 response, and reboot timing.
3. Run browser preflight and confirm the recovery backup equals the baseline.
4. Apply one reversible change, execute the full browser write, reconnect, read
   all 102,400 bytes, and require an exact match with the materialized target.
5. Power-cycle the Radio, re-read it, and verify the setting and complete bytes.
6. Restore the original baseline using the same verified full workflow and
   confirm exact readback again.
7. Preserve a sanitized bidirectional capture and turn it into deterministic
   regression fixtures.

Do not begin deliberate interruption tests until this complete success/restore
cycle is repeatable. Then test disconnects at controlled points with the
official recovery path ready. Each case must prove that the CPS persists and
shows `Write Outcome Unknown`, never success or an ordinary harmless failure.

### Phase 6 — Expand the supported matrix

- Validate each additional firmware/hardware profile separately.
- Complete controlled vendor-CPS export diffs for lower-confidence editors,
  especially DTMF, 2-Tone, 5-Tone, and any remaining settings called out by the
  feature reference.
- Add E7 write-password support if required by target users.
- Consider Bluetooth only after a read-only Bluetooth CPS session is proven;
  it is a separate transport-validation project, not part of USB write release.

## Go/no-go gate

Enable the user-facing Radio Write control only when all of these are true:

- the connected Radio is the bound Source Radio and is in the validated
  firmware/hardware scope;
- a non-empty semantic Change Set has been reviewed;
- the complete preflight read equals the expected Baseline Backup and is stored
  durably as a recovery point;
- the exact materialized write image and operation record are stored durably;
- the protocol writer and reboot reconnect path pass automated tests;
- at least one controlled physical write/reboot/readback/restore cycle has
  passed in Chrome over USB;
- every post-destructive interruption becomes durable `Write Outcome Unknown`;
- success is impossible until the full verification read matches byte-for-byte.

Until then, the correct product state remains local Working Codeplug editing
with Radio Write visibly unavailable.
