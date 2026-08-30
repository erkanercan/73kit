# Production readiness

Last reviewed: 2026-08-30

## Decision

The CPS is ready for a narrowly scoped production release for Radio Read,
Codeplug editing, Backup History, and complete Radio Write on the validated
TYT UVL-15W profile. It is not a broad stable release for every Radio,
firmware version, transport, or firmware/resource update scenario.

## Released production scope

- desktop Chrome, Edge, or another Chromium browser with Web Serial;
- HTTPS or localhost secure context;
- USB CDC only;
- TYT UVL-15W firmware `3.07.23` only;
- a complete Working Codeplug created by this CPS from the Source Radio;
- `.uvl15cps` export, verified offline import/reopen/edit/re-export, and
  same-layout restore preparation after a fresh Source Radio read;
- complete 102,400-byte writes only;
- Radios with write protection disabled;
- permanent Source Radio identity containing model, sub-model, CPU ID, and
  serial number.

Radio Write is enabled in normal production builds. A build can disable it as
an emergency release action with `NEXT_PUBLIC_DISABLE_RADIO_WRITE=1`. Because
Next.js inlines public environment variables, that switch must be set before
`pnpm build`; changing it after the build does not alter an existing bundle.

## Radio Write safety boundary

Before the first data block, the CPS requires:

- a non-empty semantic Change Set;
- a Working Codeplug bound to the selected Source Radio;
- exact firmware-profile compatibility;
- write protection disabled;
- a complete materialized write image and immutable Baseline Backup;
- durable hashes, recovery artifacts, and reviewed operation state;
- explicit port selection and final operator confirmation.

The writer sends all 200 ordered 512-byte blocks, validates every
acknowledgement, and reports success only after the final `E5` reboot response.
Any interruption after writing may have begun remains durable
`Write Outcome Unknown`; the CPS does not blindly retry or resume it.

## Current evidence

- complete physical Radio Read proven;
- complete physical Radio Write proven with 200 acknowledgements and reboot;
- reversible display-setting change applied and restored on the dedicated Radio;
- scripted coverage for protocol framing, acknowledgements, corruption,
  disconnects, timeouts, identity mismatch, durable recovery, and completion;
- production DTMF, 2-Tone, and 5-Tone Codeplug storage coverage for exact
  offsets, encodings, indexes, round trips, and unrelated-byte preservation;
- local Web Audio Tone Preview for DTMF, 2-Tone, and all 15 supported 5-Tone
  plans; preview never opens Web Serial or mutates the Codeplug;
- source verification: 242 tests, typecheck, lint, and production build passed
  on 2026-08-30;
- production-mode browser smoke test passed with no console warnings or errors.

## Remaining planned product work

- Raw Backup import as an Unbound Codeplug;
- browser-managed named Working Codeplugs without an external CPS File;
- selection-wide bulk editing;
- search by tone, Zone, Scan List, and mode;
- dedicated undo/redo;
- additional user-facing validation warnings;
- PWA/offline packaging;
- Diagnostics and About pages;
- FM noise-suppression/auto-scan encoding research.

These improve completeness and resilience but do not weaken the released
Source-Radio-bound Radio Write contract.

## Validation still required before broader claims

- every additional firmware or hardware profile;
- E7 write-password support;
- Bluetooth, BLE, Node serial, or desktop transports;
- partial or changed-block writes.

## Updater release status

The four exact catalogued Firmware, Language, Image, and combined Resource
packages remain beta. Stable updater promotion requires the same success path
on a second compatible Radio and the controlled interruption/recovery matrix.
This updater status is separate from normal Codeplug Radio Write.

## Operational release checks

Before publishing a build:

1. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Smoke-test `/en`, `/tr`, CPS File export/import, Radio Write availability
   after a Radio Read, and the Updates beta acknowledgement in production mode.
3. Verify the deployed origin is HTTPS and Web Serial capability guidance is
   correct in desktop Chromium.
4. Retain the official TYT CPS and a known-good Raw Backup as the recovery path.
5. Do not claim support outside the exact released scope above.
