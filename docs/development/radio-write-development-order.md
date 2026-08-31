# Radio Write development order

Status: steps 1-6 are complete. The controlled physical write and inverse
restore cycle passed on the dedicated Radio, and Radio Write is released in
normal product builds for the exact scope below. Broader firmware, password,
transport, and hardware support remains separate validation work.

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
- a complete full-range write ending with the validated E5 `Reboot` response.

## 1. Freeze the safety contract - implemented

The CPS Workspace seam now defines:

- the firmware-scoped `RadioWriteLayout`;
- permanent Source Radio identity as model, sub-model, CPU ID, and serial
  number;
- firmware, hardware, bootloader, and resource versions as compatibility facts,
  not permanent identity;
- fail-closed identity comparison when either Radio lacks CPU ID or serial
  number;
- the immutable `PreparedRadioWrite` references required before writing;
- operation phases from review through completed or
  `Write Outcome Unknown`;
- the destructive boundary: before any E4 data block may reach the Radio,
  errors are ordinary failures; from that point until E5 `Reboot` is validated,
  errors are `Write Outcome Unknown`;
- cancellation only during review and the Radio check, before a write session starts.

No E3, E4 write, E6 write acknowledgement, or E5 `Write Complete` command is
implemented or reachable in this step.

## 2. Materialize the firmware-specific write image - implemented

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
  exact payload written to the Radio.

Exit gate passed: independent documented literals prove the exact output,
unrelated-byte preservation, immutability, SHA-256, and derived-change markers.

## 3. Implement the protocol writer using the scripted Transport - implemented

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
destructive boundary. The validated E5 `Reboot` response is both protocol and
product-level Radio Write completion; no later readback stage exists.

## 4. Implement CPS Workspace orchestration and durable interruption handling - implemented

- `CpsWorkspace.prepareRadioWrite` rejects an empty Change Set, an unrelated
  Working Codeplug, or an ineligible Source Radio before E3.
- Preparation materializes the exact firmware-`3.07.23` write image and
  atomically stores the Baseline Backup as the recovery reference, intended
  image, Source Radio, semantic Change Set snapshot, derived changes, operation
  phase, and all hashes without opening a Radio session.
- `CpsWorkspace.executePreparedRadioWrite` performs the E1 Source Radio,
  firmware, and write-protection checks immediately before E3, persists
  `writing-before-first-block`, and runs the complete writer through the
  validated E5 `Reboot` response without reconnecting or reading afterward.
- A new immutable Baseline Backup and Working Codeplug are created from the
  accepted intended image. Backup History retains the initial and completed backups;
  preparation does not create a duplicate preflight backup.
- Any timeout, disconnect, or invalid protocol response after the first E4
  attempt and before validated E5 completion is durably retained as
  `Write Outcome Unknown`. Reloading any destructive phase also becomes
  outcome-unknown rather than resuming from an acknowledgement count.
- No automatic recovery read is performed. The operator may close an
  outcome-unknown status; interrupted writes are never resumed from an ACK.
- The persistence seam has an IndexedDB production adapter and an in-memory
  scripted-test adapter. Durable artifacts and metadata are rehashed and
  cross-checked before E3.

Exit gate passed: scripted end-to-end tests cover protocol-complete success
without post-write traffic, corrupt durable data, reloads in persisted phases,
wrong-Radio selection before E3, and interrupted-transfer handling.

## 5. Add desktop review, confirmation, progress, and outcome UX - implemented

- The Radio page renders semantic before/after Change Set values, including
  write-image normalization disclosures.
- Prepare explicitly opens the browser port chooser, then creates the durable
  review without reading the Radio.
- Confirmation is available only after port selection and durable preparation.
- The desktop workflow presents Radio check, write, and reboot stages with
  acknowledged-block progress.
- The operator explicitly selects the Web Serial port before each prepared
  Radio Write. That selected port is retained through the write operation.
- CPS Workspace stage callbacks lock competing Radio operations. A
  `beforeunload` warning and visible power/USB guidance remain active after the
  destructive boundary and while an outcome is unknown.
- A development-only Radio Write prototype exposes locked, review, writing,
  completed, and outcome-unknown states without
  opening a serial port.
- The production control is available within the firmware, Source Radio,
  write-protection, Change Set, and durable-preparation gates described here.

Automated workspace, presentation, review, Web Serial, typecheck, lint, and
production-build validation pass. Production-mode browser validation confirms
that Radio Write is available only after a complete Radio Read creates a bound
Working Codeplug.

## 6. Run a controlled physical canary - complete

The canary harness now provides:

- the production release gate, with an emergency build-time disable switch;
- a sanitized downloadable operation report containing command direction,
  command number, payload length, address, data length, attempt, and sequence,
  but no Source Radio identity or Codeplug bytes;
- `scripts/radio-write-canary.sh`, a stop-safe procedure that proves the
  official-CPS restore path, applies one reversible display change, confirms
  protocol completion, and writes the inverse change.

The first physical execution completed with the dedicated Radio.

- Use a dedicated Radio on firmware `3.07.23`, USB CDC, stable power, and a
  separately retained official-CPS backup.
- First prove the official-CPS restore path.
- Make one reversible setting change.
- Perform the full browser write and observe the Radio reboot and setting change.
- Restore the original setting with an inverse write.
- Preserve the sanitized bidirectional operation report as regression evidence.

The report captured all 200 E6 block acknowledgements and the final E5 `Reboot`
response. It also exposed the now-removed post-write reconnect attempt. Radio
Write is released for the exact validated scope. Additional physical runs
expand confidence and compatibility; they are not permission to broaden the
current firmware, transport, identity, or write-protection policy.

## Later expansion

Older or newer firmware, E7 write-password support, Bluetooth transport,
imports, and partial writes are separate expansions. Each firmware receives a
distinct layout profile; partial writes remain excluded until separately proven
safe on physical hardware.
