---
status: accepted
---

# Verify imported Codeplugs before restore

A CPS File preserves Source Radio identity and both baseline and working bytes, but a file is not proof of the Radio currently connected. Reopening and editing are allowed offline; restoring requires a fresh complete Radio Read, exact Source Radio verification, an automatic recovery backup, and a reviewed Restore Plan. Firmware labels and equal byte lengths never establish layout compatibility: same-layout restore and cross-layout migration are enabled only by an explicit validated compatibility rule or migration adapter, with opaque bytes in a migration taken from the freshly read Radio.

## Consequences

- A `.uvl15cps` file is the normal portable artifact; raw `.bin` remains an advanced, unbound inspection artifact.
- The imported Working Codeplug is the desired restore target, whether or not it differs from the exported Baseline Backup.
- Older firmware is not rejected merely for being older. Its recorded layout determines whether the CPS can restore, migrate, or only inspect it.
- Firmware Packages and CPS Files remain separate artifact types and workflows.
