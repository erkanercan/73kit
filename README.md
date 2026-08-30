# TYT UVL-15W Browser CPS

A local-first Customer Programming Software application for the TYT UVL-15W.
It reads, backs up, edits, reviews, and writes the Radio's complete Codeplug
directly through Web Serial. Firmware and resource updates are a separate,
catalog-gated workflow.

## Supported production scope

- desktop Chrome, Edge, or another Chromium browser with Web Serial;
- secure HTTPS deployment or localhost;
- USB CDC transport;
- TYT UVL-15W firmware `3.07.23`;
- complete Source-Radio-bound Codeplugs created by a successful Radio Read;
- complete full-range Radio Write to an unprotected Source Radio;
- four exact catalogued firmware/resource packages released as beta.

Radio Write verifies Source Radio identity, firmware compatibility, write
protection, a non-empty reviewed Change Set, durable recovery artifacts, every
block acknowledgement, and the final reboot response. Interrupted destructive
operations remain `Write Outcome Unknown` and are never blindly resumed.

See [`docs/production-readiness.md`](docs/production-readiness.md) for current
release status and [`docs/CPS_FEATURE_REFERENCE.md`](docs/CPS_FEATURE_REFERENCE.md)
for the complete capability roadmap.

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

## Third-party assets

APRS symbol graphics are vendored from
[`hessu/aprs-symbols`](https://github.com/hessu/aprs-symbols) at a pinned
revision. The complete attribution, provenance notes, and checksums are in
[`public/aprs-symbols/NOTICE.md`](public/aprs-symbols/NOTICE.md).
