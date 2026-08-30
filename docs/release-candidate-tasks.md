# Release candidate tasks

Last reviewed: 2026-08-31

This ledger separates work required for the narrow production scope from
intentionally deferred product work. Update task status and evidence here as
the release candidate progresses.

## Required before release

| ID    | Task                                                                                                                                          | Status   | Completion evidence                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-01 | Show direct Backup History restore failures in the Backups workspace                                                                          | Complete | Red-to-green UI regression test                                                                                                                                                 |
| RC-02 | Cover saved-backup restore integrity, Source Radio identity, no-op, changed target and Radio-managed-tail behavior at the controller boundary | Complete | Restore Workflow integration tests                                                                                                                                              |
| RC-03 | Reconcile production readiness, domain terminology and lifecycle documentation for direct Backup History restore                              | Complete | Updated domain, ADR, architecture and readiness documents                                                                                                                       |
| RC-04 | Add repeatable CI and browser release checks without assuming a hosting provider                                                              | Complete | GitHub CI and three production-mode Playwright smoke tests                                                                                                                      |
| RC-05 | Run the complete source, production-build and browser verification matrix                                                                     | Complete | 252 tests, typecheck, lint, build and 3 Chromium smoke tests                                                                                                                    |
| RC-06 | Verify latest-backup no-op and older-backup restore on the physical Source Radio                                                              | Complete | Latest-backup no-op, controlled 9 to 8 write, clean post-write read, semantic 8 to 9 restore review, completed restore write, and final level-9 Radio Read passed on 2026-08-31 |
| RC-07 | Prepare a clean release commit                                                                                                                | Complete | Final verification passed; release work committed locally                                                                                                                       |
| RC-08 | Present recognized restore changes semantically and disclose only unexplained residual bytes                                                  | Complete | Red-to-green backlight restore and mixed-residual tests                                                                                                                         |

## Explicit release decisions

- Firmware, Language, Image and combined Resource updates ship as beta.
- Production Codeplug support remains limited to desktop Chromium, Web Serial,
  USB CDC, the validated UVL-15W firmware `3.07.23` layout, complete writes and
  an unprotected Source Radio.
- Partial writes, other firmware profiles and other transports are not implied
  by this release.

## Deferred product backlog

| ID    | Feature                                                            | Release impact                                             |
| ----- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| BL-01 | Raw `.bin` import as an Unbound Codeplug                           | Not required for the identity-bound CPS File workflow      |
| BL-02 | Named browser-managed Working Codeplugs                            | CPS Files already provide the portable saved-work workflow |
| BL-03 | Bulk editing                                                       | Product enhancement                                        |
| BL-04 | Undo/redo                                                          | Product enhancement; baseline reset remains available      |
| BL-05 | Search by tone, Zone, Scan List and mode                           | Product enhancement                                        |
| BL-06 | Additional user-facing validation warnings                         | Incremental resilience and guidance                        |
| BL-07 | PWA/offline installation                                           | Packaging enhancement                                      |
| BL-08 | Diagnostics and About pages                                        | Non-core product surfaces                                  |
| BL-09 | FM noise-suppression and auto-scan encoding research               | Specialist setting research                                |
| BL-10 | Bluetooth, BLE, Node serial and desktop transports                 | Separate transport validation                              |
| BL-11 | Additional firmware profiles and E7 write-password support         | Separate compatibility validation                          |
| BL-12 | Stable updater promotion on a second Radio and interruption matrix | Beta-to-stable updater gate                                |
