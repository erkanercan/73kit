# Production readiness

Last reviewed: 2026-09-01

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
- `.73kcps` export, verified offline import/reopen/edit/re-export, and
  same-layout restore preparation after a fresh Source Radio read;
- direct verified restore preparation from a browser-local Backup History entry;
- named immutable browser-local Working Codeplug snapshots with verified reopen
  and portable export;
- installable application shell and previously visited-route offline fallback,
  excluding every Codeplug, report and updater package artifact from caches;
- complete 102,400-byte writes for the validated `3.07.23` profile only;
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
- direct restore from the newest Backup History entry physically verified as a
  no-op after a fresh Source Radio read on 2026-08-31;
- controlled backlight-level write from 9 to 8 completed with every Codeplug
  block acknowledged and the reboot command accepted on 2026-08-31;
- the post-write Radio Read completed with zero pending changes and created a
  distinct Backup History entry on 2026-08-31;
- direct restore from the older pre-change Backup History entry completed its
  fresh Radio Read and prepared exactly one changed byte on 2026-08-31;
- that prepared restore was reviewed semantically as backlight level 8 to 9,
  with no generic import marker or unrelated change, on 2026-08-31;
- the older-backup restore write completed with every Codeplug block
  acknowledged and the reboot command accepted on 2026-08-31;
- the final Radio Read decoded backlight level 9, confirming the older Backup
  History entry was restored successfully on 2026-08-31;
- scripted coverage for protocol framing, acknowledgements, corruption,
  disconnects, timeouts, identity mismatch, durable recovery, and completion;
- production DTMF, 2-Tone, and 5-Tone Codeplug storage coverage for exact
  offsets, encodings, indexes, round trips, and unrelated-byte preservation;
- local Web Audio Tone Preview for DTMF, 2-Tone, and all 15 supported 5-Tone
  plans; preview never opens Web Serial or mutates the Codeplug;
- source verification: 291 tests, typecheck, lint, and production build passed
  on 2026-09-01;
- production-mode browser smoke test passed with no console warnings or errors;
- automated production-mode Chromium smoke coverage verifies both locales, the
  updater beta gate, and visible direct-restore failure handling.

## Remaining planned product work

- selection-wide bulk editing;
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
packages remain beta. The scripted transport now verifies first, middle and
final-block disconnect classification for both Firmware and Resource Flash,
alongside timeout, malformed acknowledgement and bounded retry behavior.
Stable updater promotion still requires the same physical success and
controlled interruption/recovery paths on a second compatible Radio. This
updater status is separate from normal Codeplug Radio Write.

## Operational release checks

Before publishing a build:

1. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Smoke-test `/en`, `/tr`, CPS File export/import, direct Backup History
   restore preparation, Radio Write availability after a Radio Read, and the
   Updates beta acknowledgement in production mode.
3. Verify the deployed origin is HTTPS and Web Serial capability guidance is
   correct in desktop Chromium.
4. Retain the official TYT CPS and a known-good Raw Backup as the recovery path.
5. Do not claim support outside the exact released scope above.
