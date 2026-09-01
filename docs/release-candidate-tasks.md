# Release candidate tasks

Last reviewed: 2026-09-01

This ledger separates work required for the narrow production scope from
intentionally deferred product work. It was refreshed for the 73Kit route and
file-format implementation on 2026-09-01.

## Required before release

| ID    | Task                                                                                                                                          | Status   | Completion evidence                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-01 | Show direct Backup History restore failures in the Backups workspace                                                                          | Complete | Red-to-green UI regression test                                                                                                                                                 |
| RC-02 | Cover saved-backup restore integrity, Source Radio identity, no-op, changed target and Radio-managed-tail behavior at the controller boundary | Complete | Restore Workflow integration tests                                                                                                                                              |
| RC-03 | Reconcile production readiness, domain terminology and lifecycle documentation for direct Backup History restore                              | Complete | Updated domain, ADR, architecture and readiness documents                                                                                                                       |
| RC-04 | Add repeatable CI and browser release checks without assuming a hosting provider                                                              | Complete | GitHub CI and three production-mode Playwright smoke tests                                                                                                                      |
| RC-05 | Run the complete source, production-build and browser verification matrix                                                                     | Complete | 291 tests, typecheck, lint, production build and source-level route/UI policies; previous production Chromium smoke suite remains in CI                                         |
| RC-06 | Verify latest-backup no-op and older-backup restore on the physical Source Radio                                                              | Complete | Latest-backup no-op, controlled 9 to 8 write, clean post-write read, semantic 8 to 9 restore review, completed restore write, and final level-9 Radio Read passed on 2026-08-31 |
| RC-07 | Prepare a clean release commit                                                                                                                | Pending  | The 73Kit architecture and localization changes must be committed only after review                                                                                             |
| RC-08 | Present recognized restore changes semantically and disclose only unexplained residual bytes                                                  | Complete | Red-to-green backlight restore and mixed-residual tests                                                                                                                         |

## Explicit release decisions

- Firmware, Language, Image and combined Resource updates ship as beta.
- Production Codeplug support remains limited to desktop Chromium, Web Serial,
  USB CDC, the validated UVL-15W firmware `3.07.23` layout, complete writes and
  an unprotected Source Radio.
- Partial writes, other firmware profiles and other transports are not implied
  by this release.

## Deferred product backlog

| ID    | Feature                                                    | Release impact                       |
| ----- | ---------------------------------------------------------- | ------------------------------------ |
| BL-03 | Bulk editing                                               | Product enhancement                  |
| BL-09 | FM noise-suppression and auto-scan encoding research       | Specialist setting research          |
| BL-10 | Bluetooth, BLE, Node serial and desktop transports         | Separate transport validation        |
| BL-11 | Additional firmware profiles and E7 write-password support | Separate compatibility validation    |
| BL-12 | Stable updater promotion on a second Radio                 | Physical beta-to-stable updater gate |

## Completed product backlog

| ID     | Feature                                    | Completion evidence                                                                  |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| BL-02  | Named browser-managed Working Codeplugs    | IndexedDB snapshot store, verified reopen/export, rename/delete and revision tests   |
| BL-05  | Search by tone, Zone, Scan List and mode   | Combined Channel filter module, desktop Sheet controls and search/filter tests       |
| BL-06  | Additional user-facing validation warnings | RX-tone, published TX-band and collection-consistency advisories                     |
| BL-07  | PWA/offline installation                   | Manifest, safe service worker policy tests, production build and HTTP header checks  |
| BL-08  | About page                                 | Routed localized product-scope and safety reference                                  |
| BL-12a | Scripted updater interruption matrix       | First/middle/final Firmware and Resource Flash disconnect tests                      |
| BL-08a | Diagnostics & Support workspace            | Sanitized IndexedDB history, readiness view, JSON preview/download and email handoff |
| BL-01  | Raw `.bin` import as an Unbound Codeplug   | Exact-profile import, unbound safety boundary and edited raw export                  |
| BL-04  | Undo/redo                                  | Bounded document history, keyboard shortcuts and redo-branch tests                   |
| BL-13  | 73Kit multi-Radio application structure    | Suite shell, model selector, dynamic CPS route, support registry and `.73kcps`       |
