# Radio Write development order

Status: steps 1-5 implemented in source; required Chrome visual validation is
still pending. Radio Write remains unavailable in the product.

## Firmware-scoped rule

The current Codeplug layout is the `uvl15w-3.07.23` profile. Its known clone
range is `0x8000..0x21000`, its Codeplug is 102,400 bytes, and the documented
write block size is 512 bytes.

These values are facts about firmware `3.07.23`, not permanent UVL-15W model
constants. A future or older firmware must have its own reviewed layout profile,
fixtures, address-range evidence, write-image rules, and physical validation
before it can become eligible for Radio Read or Radio Write. Do not infer
compatibility from version ordering.

The first supported Radio Write scope is therefore:

- firmware `3.07.23` only;
- USB CDC only;
- a complete Source Radio identity containing CPU ID and serial number;
- a Radio that does not require a write password;
- a Working Codeplug created from that Source Radio;
- a complete full-range write followed by complete readback verification.

## 1. Freeze the safety contract — implemented

The CPS Workspace seam now defines:

- the firmware-scoped `RadioWriteLayout`;
- permanent Source Radio identity as model, sub-model, CPU ID, and serial
  number;
- firmware, hardware, bootloader, and resource versions as compatibility facts,
  not permanent identity;
- fail-closed identity comparison when either Radio lacks CPU ID or serial
  number;
- the immutable `PreparedRadioWrite` references required before writing;
- operation phases from preflight through verified or
  `Write Outcome Unknown`;
- the destructive boundary: before any E4 data block may reach the Radio,
  errors are ordinary failures; from that point until exact readback succeeds,
  errors are `Write Outcome Unknown`;
- cancellation only during preflight and review, before a write session starts.

No E3, E4 write, E6 write acknowledgement, or E5 `Write Complete` command is
implemented or reachable in this step.

## 2. Materialize the firmware-specific write image — implemented

- The Codeplug interface materializes only the `uvl15w-3.07.23` profile.
- It copies the complete VFO A/B records to Temporary Channels A/B.
- It restores all ten documented fixed Weather Channel records from exact Qt
  literals.
- It preserves all other opaque and reserved bytes and does not mutate the
  Working Codeplug.
- It returns exactly 102,400 immutable bytes, their SHA-256 digest, and the
  layout ID.
- It reports `mirror-vfo-temporary-channels` and
  `restore-fixed-weather-channels` only when those rules change bytes. These
  semantic markers are the later Change Set review disclosure contract; offsets
  and internal records remain hidden from UI callers.
- The materialized image, not the editable pre-normalization bytes, is the
  eventual verification target.

Exit gate passed: independent documented literals prove the exact output,
unrelated-byte preservation, immutability, SHA-256, and derived-change markers.

## 3. Implement the protocol writer using the scripted Transport — implemented

- The Radio interface accepts only a complete materialized
  `uvl15w-3.07.23` write image.
- It sends the E3 full range and strictly validates the E3 command and
  `WRITE START OK` payload.
- It sends exactly 200 ordered 512-byte E4 blocks and reports progress only
  after each valid acknowledgement.
- It strictly validates every E6 command, exact 11-byte payload, `WF OK`,
  echoed address, and echoed length before sending the next block.
- It retries the identical encoded command only when the Radio explicitly
  returns `EE "Frame Lrc Error"`. Decoder errors, timeouts, disconnects, and
  malformed acknowledgements are never retried or resumed.
- It sends exact E5 `Write Complete` and strictly validates the E5 `Reboot`
  response.
- `RadioWriteError` records acknowledged bytes and distinguishes an ordinary
  failure before the first E4 attempt from `write-outcome-unknown` beginning
  immediately before that attempt.

Exit gate passed: scripted tests cover the complete transfer, strict responses,
split frames, stale duplicate acknowledgements, explicit LRC retry, timeout,
disconnect, corrupted frames, write protection, finalization failure, and the
destructive boundary. Production UI still exposes no Radio Write action. The
transfer result is deliberately not product-level Radio Write success; that
requires step 4 readback verification.

## 4. Implement CPS Workspace orchestration and durable recovery — implemented

- `CpsWorkspace.prepareRadioWrite` rejects an empty Change Set, an unrelated
  Working Codeplug, an ineligible Source Radio, a different preflight Radio, or
  baseline drift before E3.
- Preparation performs a complete preflight Radio Read, materializes the exact
  firmware-`3.07.23` write image, and atomically stores the Baseline Backup,
  recovery backup, intended image, Source Radio, semantic Change Set snapshot,
  derived changes, operation phase, and all hashes before the write session.
- `CpsWorkspace.executePreparedRadioWrite` rechecks the Source Radio, persists
  `writing-before-first-block`, runs the complete writer, reconnects, rechecks
  identity, performs a complete verification Radio Read, and compares every
  byte with the intended materialized image.
- A new immutable Baseline Backup and Working Codeplug are created only after
  exact verification. The initial, recovery, and verified backups remain
  distinct entries in the in-memory Backup History.
- Any timeout, disconnect, wrong verification Radio, readback mismatch, or
  other post-destructive failure is durably retained as
  `Write Outcome Unknown`. Reloading any destructive phase also becomes
  outcome-unknown rather than resuming from an acknowledgement count.
- Recovery reconnects to the same Source Radio and performs a complete Radio
  Read. It clears the durable operation only when the result exactly matches
  the intended image or the retained recovery backup; any third state remains
  unresolved.
- The persistence seam has an IndexedDB production adapter and an in-memory
  scripted-test adapter. Durable artifacts and metadata are rehashed and
  cross-checked before E3 or recovery.

Exit gate passed: scripted end-to-end tests cover success, baseline drift,
corrupt durable data, reloads in every persisted phase, wrong-Radio selection
at preflight/write/verification/recovery, readback mismatch, and both safe
recovery resolutions. Production UI still exposes no Radio Write action.

## 5. Add desktop review, confirmation, progress, and recovery UX — implemented

- The Radio page renders semantic before/after Change Set values, including
  write-image normalization disclosures.
- Confirmation is available only after the fresh preflight backup succeeds.
- The desktop workflow presents preflight, write, reboot, reconnect,
  verification, and byte-comparison stages with acknowledged-block progress.
- One selected Web Serial port is retained across the complete workflow.
  Reload recovery first tries the single previously permitted port through
  `getPorts()` and otherwise requires an explicit user-gesture port selection.
- CPS Workspace stage callbacks lock competing Radio operations. A
  `beforeunload` warning and visible power/USB guidance remain active after the
  destructive boundary and while an outcome is unknown.
- A development-only Radio Write prototype exposes locked, review, writing,
  reconnect, verification, verified, and outcome-unknown states without
  opening a serial port.
- The production control is hard-disabled until step 6 passes, while recovery
  remains available for an existing durable outcome-unknown record.

Automated workspace, presentation, review, and Web Serial tests pass. The
production build passes. Required Chrome visual validation is pending because
the ChatGPT browser extension is not installed/enabled in the available Chrome
profile; do not treat step 6 as started until that validation is completed.

## 6. Run a controlled physical canary

- Use a dedicated Radio on firmware `3.07.23`, USB CDC, stable power, and a
  separately retained official-CPS backup.
- First prove the official-CPS restore path.
- Make one reversible setting change.
- Perform the full browser write, reboot, complete readback, and exact compare.
- Power-cycle and read again.
- Restore the original baseline and verify it again.
- Preserve a sanitized bidirectional capture as a regression fixture.

Only after that repeatable success/restore cycle should controlled interruption
and recovery tests begin. The user-facing Radio Write control remains disabled
until this gate passes.

## Later expansion

Older or newer firmware, E7 write-password support, Bluetooth transport,
imports, and partial writes are separate expansions. Each firmware receives a
distinct layout profile; partial writes remain excluded until separately proven
safe on physical hardware.
