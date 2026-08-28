# UVL-15W update catalog

`uvl15w.json` is the only release-specific input used by the browser updater.
The package parser and serial updater do not contain release hashes, target
versions, address layouts, prerequisites, release state, or update-mode Radio
identities.

Every package has an explicit `releaseStatus`:

- `disabled`: catalogued for engineering work, but rejected before Web Serial;
- `beta`: available only after the UI warning and explicit beta acknowledgement;
- `stable`: available with the normal destructive-operation confirmations.

New entries start as `disabled`. Do not infer release state from a filename,
version, package kind, build mode, or the presence of a catalog entry.

## Adding an older or newer package

1. Preserve the original TYT package and record its source. Do not rename or
   modify the binary before calculating its SHA-256.
2. Validate the package with the evidence workflow in
   `scripts/research/uvl15w-update-evidence/README.md`. A `.Fir` package must
   pass its internal TYT integrity tag. A `.DAT` package must have contiguous
   32-byte records and a known start/end address range.
3. Capture the stock CPS operation if the package uses a new update command,
   resource payload, Radio identity, bootloader, source firmware version, or
   address layout. Existing evidence does not automatically authorize a new
   compatibility combination.
   A recovery payload may be added only after capturing the official CPS
   recovering that exact package from a known partial-write state. A successful
   fresh update does not establish recovery behavior.
4. Add one entry to `packages` in `uvl15w.json` with `releaseStatus` set to
   `disabled`. Reuse a `radioProfileId` only
   when the captured update-mode identity matches that profile. Otherwise add a
   new Radio profile.
5. Set `targets` to the versions installed by the package. Put every required
   pre-update resource in `prerequisites`. `sourceFirmwareVersions` lists the
   installed versions from which this exact package has been validated.
   Add a firmware version to `normalModeFirmwareVersions` only after normal
   Radio Read and Codeplug compatibility have also been validated for it.
6. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, the evidence verifier, and
   `pnpm build`. Run `pnpm updates:verify-packages -- <paths...>` against the
   original files; this offline command may inspect `disabled` entries without
   making them selectable in the app. Then select each released package in the
   browser and confirm that its kind, version, size, and block count are correct
   before any physical write.
7. Add physical and recovery evidence to
   `docs/testing/updater-manual-validation.md`. A successful complete write,
   reboot, version check, and Radio Read on one compatible unit may qualify an
   exact package for `beta`. Promotion to `stable` also requires a second
   compatible Radio and the controlled interruption/recovery matrix.

The catalog is intentionally allowlisted. The TYT integrity tag detects damage,
but its key is present in the public CPS and therefore is not a publisher
signature. A structurally valid unknown package must remain unable to open the
serial port.
