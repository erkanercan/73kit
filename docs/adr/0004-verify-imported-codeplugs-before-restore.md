---
status: accepted
---

# Verify imported Codeplugs before restore

A CPS File preserves Source Radio identity and both baseline and working bytes, but a file is not proof of the Radio currently connected. Reopening and editing are allowed offline; restoring requires a fresh complete Radio Read, exact Source Radio verification, an automatic recovery backup, and a reviewed Restore Plan. Firmware labels and equal byte lengths never establish layout compatibility: same-layout restore and cross-layout migration are enabled only by an explicit validated compatibility rule or migration adapter, with opaque bytes in a migration taken from the freshly read Radio.

A browser-local Backup History entry may enter the same restore workflow directly. It remains bound to its recorded Source Radio and does not bypass the fresh read, recovery backup, Restore Plan, Radio Write review, or final confirmation.

The Radio Write review presents restored fields through the same semantic Change Set used for ordinary edits. Bytes that cannot be explained by a supported semantic field remain visible as an explicit residual Codeplug-data item rather than being hidden or mislabeled as a field change.

## Consequences

- A `.73kcps` file is the normal portable artifact; raw `.bin` remains an advanced, unbound inspection artifact.
- Backup History is the direct local restore source; downloading and reopening an entry is optional.
- The imported Working Codeplug is the desired restore target, whether or not it differs from the exported Baseline Backup.
- Older firmware is not rejected merely for being older. Its recorded layout determines whether the CPS can restore, migrate, or only inspect it.
- Firmware Packages and CPS Files remain separate artifact types and workflows.
