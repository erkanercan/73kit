# Radio Write development order

Status: development contract only; Radio Write remains unavailable.

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

## 2. Materialize the firmware-specific write image

- Add one private Codeplug operation for the `uvl15w-3.07.23` profile.
- Apply the documented VFO-to-Temporary-Channel mirror rules.
- Apply the documented fixed Weather Channel templates.
- Preserve all other opaque and reserved bytes.
- Produce exactly 102,400 immutable bytes and a SHA-256 digest.
- Make the materialized image, not the editable pre-normalization bytes, the
  eventual verification target.
- Decide how derived internal changes are disclosed in Change Set review.

Exit gate: fixture tests prove exact bytes and demonstrate that unrelated bytes
remain unchanged.

## 3. Implement the protocol writer using the scripted Transport

- Add E3 full-range start and strict `WRITE START OK` validation.
- Send 200 ordered 512-byte E4 blocks.
- Validate each E6 command, `WF OK`, echoed address, and echoed length.
- Retry only the explicitly documented LRC-error case.
- Never resume after timeout or disconnect.
- Send exact E5 `Write Complete` and validate `Reboot`.
- Record when the first E4 block may have reached the Radio.

Exit gate: exhaustive scripted tests pass while production UI still exposes no
Radio Write action.

## 4. Implement CPS Workspace orchestration and durable recovery

- Persist the prepared operation, recovery backup, intended write image, and
  hashes before E3.
- Perform a complete preflight Radio Read and compare it to the Baseline Backup.
- Stop on Source Radio mismatch, incomplete identity, firmware mismatch, empty
  Change Set, or baseline drift.
- Coordinate write, reboot, reconnect, complete verification Radio Read, and
  byte-for-byte comparison.
- Create a new immutable Baseline Backup only after exact verification.
- Persist `Write Outcome Unknown` across reloads until recovery resolves it.

Exit gate: tests cover reloads and wrong-Radio selection at every phase.

## 5. Add desktop review, confirmation, progress, and recovery UX

- Render semantic before/after Change Set values.
- Require explicit confirmation after the preflight backup succeeds.
- Show preflight, write, reboot, reconnect, verification, and comparison stages.
- Reuse a previously permitted Web Serial port with `getPorts()` where possible,
  with an explicit user-gesture reconnect fallback.
- Lock competing Radio operations and warn against closing the tab or removing
  power after the destructive boundary.

Exit gate: browser tests and Chrome validation cover every success, failure,
and outcome-unknown state.

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
