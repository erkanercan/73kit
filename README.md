# 73Kit

73Kit is a home for local-first browser tools. Its first tool is Radio CPS,
which reads, backs up, edits, reviews, and writes a Radio's complete Codeplug
directly through Web Serial.

## Current validated scope

The first Radio Model is **TYT UVL-15W**, also sold as **Tekser TR-UV15**. Those
names select one model definition and one driver; they are not separate Radios
in the product.

The currently validated support profile is:

| Radio Model                  | Firmware  | Codeplug size | Status    |
| ---------------------------- | --------- | ------------: | --------- |
| TYT UVL-15W / Tekser TR-UV15 | `3.07.23` | 102,400 bytes | Validated |

The byte length belongs to that exact support profile. It is not a universal
UVL-15W rule and must not be reused for a later firmware version without
validation.

Production scope currently includes:

- desktop Chrome, Edge, or another Chromium browser with Web Serial;
- a secure HTTPS deployment or localhost;
- USB CDC transport;
- complete Source-Radio-bound Codeplugs created by Radio Read;
- complete full-range Radio Write to the verified, unprotected Source Radio;
- local Backup History and named Working Codeplugs in IndexedDB;
- portable `.73kcps` files with Radio Model, support profile, layout, identity,
  baseline, working bytes, and integrity hashes;
- four exact catalogued firmware/resource packages exposed as beta.

Known but unvalidated firmware is shown as **Not validated** and is blocked from
Codeplug interpretation and destructive operations. A connected Radio reports
its firmware during the handshake; users do not guess or manually select live
firmware. Raw `.bin` import is the only offline flow that needs a support-profile
choice once multiple validated layouts exist.

## Product routes

```text
/{locale}                         73Kit home
/{locale}/cps                     Radio Model selector
/{locale}/cps/{radioModel}        selected Radio CPS workspace
/{locale}/cps/{radioModel}/...    model-scoped CPS tools
/{locale}/diagnostics             suite-level diagnostics
/{locale}/about                   suite-level product information
```

Adding a Radio Model adds a registry entry, driver/factory branch, support
profiles, and tests. It does not add a copy of the route tree. See
[`docs/architecture/73kit-radio-cps-platform.md`](docs/architecture/73kit-radio-cps-platform.md)
for the architecture, extension procedure, and invariants.

## Safety boundary

Radio Write verifies Source Radio identity, support-profile compatibility,
write protection, a non-empty reviewed Change Set, durable recovery artifacts,
every block acknowledgement, and the final reboot response. Interrupted
destructive operations remain `Write Outcome Unknown` and are never blindly
resumed.

Firmware Update and Resource Flash appear within the selected Radio CPS product
area because they are Radio-specific operator tasks, but their protocol and
recovery implementation remains separate from the Codeplug workspace.

## Documentation

- [73Kit and Radio CPS architecture](docs/architecture/73kit-radio-cps-platform.md)
- [Module design](docs/architecture/module-design.md)
- [Radio CPS feature reference](docs/CPS_FEATURE_REFERENCE.md)
- [Codeplug file lifecycle](docs/codeplug-file-lifecycle.md)
- [Production readiness](docs/production-readiness.md)

## Development

```bash
pnpm install
pnpm dev
```

Required verification:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Official update packages can be checked against the catalog with:

```bash
pnpm updates:verify-packages -- '<firmware.Fir>' '<resource.DAT>'
```

## License

Copyright (C) 2026 Erkan Ercan

Contact: [erkanercandev@gmail.com](mailto:erkanercandev@gmail.com)

This project is independent, unofficial software and is not affiliated with
TYT or Tekser. It is licensed under the GNU Affero General Public License v3.0
only. See [`LICENSE`](LICENSE).

## Third-party assets

APRS symbol graphics are vendored from
[`hessu/aprs-symbols`](https://github.com/hessu/aprs-symbols). The known
attribution limitations, provenance status, and local checksums are in
[`public/aprs-symbols/NOTICE.md`](public/aprs-symbols/NOTICE.md).
