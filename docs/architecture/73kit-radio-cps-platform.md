# 73Kit and Radio CPS platform architecture

## Status

Implemented architecture. This document is the canonical product and technical
guide for expanding 73Kit beyond one Radio Model. Radio-specific facts remain in
the [Radio CPS feature reference](../CPS_FEATURE_REFERENCE.md).

## Product model

73Kit is the application. A **73Kit Tool** is a top-level operator capability.
**Radio CPS** is the first tool. A **Radio Model** is selected inside Radio CPS,
and a **Support Profile** authorizes a particular Radio Model, firmware version,
Codeplug layout, and driver combination.

```text
73Kit
├── Radio CPS
│   └── Radio Model
│       ├── Codeplug programming
│       ├── Backups and Working Codeplugs
│       └── Firmware and Resources (Beta)
└── Diagnostics
```

Backups and updates are not suite-level destinations. Their data formats,
compatibility, transport, and safety rules depend on a selected Radio Model.
They therefore live inside the Radio CPS route tree. The updater remains a
separate internal module because update-mode protocols, packages, address
ranges, recovery, and success criteria are not Codeplug operations.

## Operator journey

1. The operator opens 73Kit at `/{locale}`.
2. They choose Radio CPS.
3. At `/{locale}/cps`, they select the manufacturer/model printed on the
   Radio. An alias such as Tekser TR-UV15 resolves to the same model definition
   as TYT UVL-15W.
4. 73Kit opens `/{locale}/cps/{radioModel}`.
5. For live work, the operator chooses Radio Read. The Radio reports identity
   and firmware during the connection handshake.
6. The support registry evaluates the exact firmware version. A validated
   profile permits parsing. Missing profiles are shown as **Not validated** and
   are blocked before Radio Read or any destructive operation.
7. The operator edits a Working Codeplug, reviews the Change Set, and may export
   `.73kcps`, save locally, or write to the verified Source Radio.

The operator never selects live firmware manually. Asking them to do so would
let a wrong choice authorize the wrong binary layout. Manual profile selection
is reserved for unbound raw `.bin` import because no Radio handshake or file
manifest exists. While only one profile is validated, the importer can state
that profile rather than presenting a meaningless one-option selector.

## Route architecture

```text
app/[locale]/
├── page.tsx                         73Kit home
├── cps/
│   ├── page.tsx                     Radio Model selector
│   └── [radioModel]/
│       ├── layout.tsx               model validation
│       ├── page.tsx                 CPS overview
│       ├── radio/page.tsx
│       ├── channels/page.tsx
│       ├── backups/page.tsx
│       ├── updates/page.tsx
│       └── ...shared CPS routes
├── diagnostics/page.tsx
└── about/page.tsx
```

There is one dynamic Radio CPS route tree. A new Radio Model does not get a
copied directory. Route duplication would cause navigation, metadata, feature
fixes, and safety behavior to drift between models. The selected registry entry
drives the shell, capabilities, workspace factory, and links.

The application shell has two composition roots:

- general 73Kit routes use `KitAppShell` and do not initialize serial,
  Codeplug, updater, or recovery state;
- recognized `/cps/{radioModel}` routes use `RadioModelProvider`,
  `CpsWorkspaceProvider`, `UpdateCoordinatorProvider`, and `CpsAppShell`.

This keeps CPS lifecycle state out of unrelated future 73Kit tools.

## Support registry

`modules/radio-support/index.ts` is the public catalog of supported models.
Each `RadioModelDefinition` contains:

- stable, URL-safe `id`;
- manufacturer and canonical model;
- display name and marketing aliases;
- driver identifier;
- explicit capabilities;
- firmware support profiles.

A support profile contains:

- stable profile identifier;
- exact firmware version reported by the Radio;
- status;
- Codeplug layout identifier, or `null` when not validated.

Exact means exact. Version `3.08.00` must not inherit `3.07.23` merely because
the model and binary size look similar. File length is a validation fact owned
by a layout profile, not a model-wide discriminator.

Current registry:

| Model ID     | Display name                 | Alias policy          | Validated profile    |
| ------------ | ---------------------------- | --------------------- | -------------------- |
| `tyt-uvl15w` | TYT UVL-15W / Tekser TR-UV15 | one model, one driver | `tyt-uvl15w-3.07.23` |

The current `3.07.23` layout is exactly 102,400 bytes. No other firmware is
authorized by that fact.

## Capability policy

Navigation is filtered by the selected model's explicit capability list.
Capabilities describe implemented product surfaces such as Channels, APRS,
Backups, or Firmware Updates. They are not proof that every firmware profile
supports the same binary layout.

A capability answers “does this Radio integration provide the tool?” A support
profile answers “may this exact firmware be interpreted or written?” Both gates
must pass.

Capability checks belong at module action boundaries as well as in navigation.
Hiding a link is presentation, not authorization.

## Driver and workspace selection

`createCpsWorkspaceForRadioModel` is the only UI-facing workspace factory. It
maps a registered model to its implementation. All live flows use it:

- initial Radio Read;
- restore preparation;
- interrupted Radio Write recovery.

Unknown driver identifiers fail closed. They never fall back to the UVL-15W
driver. A future driver may reuse shared Codeplug/editor modules, but reuse is
an explicit implementation choice rather than route-level inheritance.

## Firmware authority

Live connection follows this order:

```text
operator-selected model
        ↓
model-specific connection/identity handshake
        ↓
Radio-reported firmware
        ↓
exact support-profile lookup
        ↓
validated: parse/read allowed
not validated: disconnect and explain
```

The selected model narrows which protocol may safely attempt identification.
The Radio-reported firmware determines the layout. Neither URL state nor a
previous browser choice overrides hardware identity.

“Not validated” is deliberate wording. It does not claim the firmware is
incompatible; it says 73Kit has no evidence-backed parser/write contract for
it. Unsupported versions remain visible in diagnostics without exposing an
unsafe continue button.

## Portable and local storage

### `.73kcps`

`.73kcps` is the portable 73Kit Radio CPS document. Schema version 1 includes:

- format `73kit-cps`;
- schema version;
- creation time;
- Radio Model ID;
- support profile ID;
- layout ID, firmware version, and byte length;
- Source Radio identity;
- immutable baseline member metadata and SHA-256;
- working member metadata and SHA-256;
- `baseline.bin` and `working.bin`.

There is intentionally no `.uvl15cps` compatibility layer. The project is
pre-release, the user accepted a clean break, and silently upgrading an
identity-bound binary artifact would add complexity at the most safety-sensitive
boundary. Invalid or old manifests fail with an explicit file error.

### IndexedDB

IndexedDB remains the local persistence mechanism for:

- immutable Backup History;
- named Working Codeplug snapshots;
- prepared Radio Write and recovery state;
- diagnostics incidents.

Storage remains local and nothing is automatically uploaded. Records containing
portable CPS files inherit their model/profile metadata from the manifest.
Future schema changes must add explicit model/profile ownership to any record
that can otherwise become ambiguous across selected Radios. Database upgrades
must use the shared versioned opener and preserve existing object stores.

### Raw `.bin`

Raw files carry no Source Radio identity, model, profile, or hash manifest.
They create an Unbound Codeplug and cannot authorize Radio Write. When multiple
validated profiles exist, raw import must require the operator to choose a
model/profile and must validate exact byte length before parsing.

## Updater placement and separation

The operator finds Firmware and Resources under the selected Radio CPS because
compatibility begins with that Radio. Internally:

- CPS Workspace owns Codeplug lifecycle and Radio Write;
- Update Coordinator owns package choice, beta acknowledgement, update-mode
  exclusivity, progress, post-reboot verification, and recovery;
- Update Package owns `.Fir`/`.DAT` parsing and catalog validation;
- the model updater owns update-mode protocol state machines.

The updater stays beta. Catalog entries are exact package allowlists, not a
general file picker. A package that lacks a validated model/profile and recovery
path cannot become runnable merely because its filename looks correct.

## Alias policy

An alias is another label for the same protocol identity and hardware family.
Aliases:

- appear in search and display copy;
- resolve to one canonical model ID;
- share routes, capabilities, driver, support profiles, and file identity;
- do not create duplicate backups, docs, or test matrices.

If future evidence shows materially different protocol identity, memory layout,
or update compatibility, it becomes a separate Radio Model rather than another
alias.

## Adding a firmware version

1. Obtain authoritative documentation or controlled captures.
2. Record the Radio-reported version string exactly.
3. Compare baseline-plus-one-change exports for every affected setting family.
4. Define a new Codeplug layout when any address, size, encoding, default,
   checksum, or Radio-managed range changes.
5. Add a support profile with a stable ID and exact layout.
6. Add parsing/editing/round-trip fixtures and unknown-byte preservation tests.
7. Validate Radio Read on physical hardware.
8. Validate recovery and Radio Write separately before enabling write.
9. Add exact updater packages only after updater-specific validation.
10. Update the support table and production-readiness evidence.

Do not infer a profile from the 102,400-byte `3.07.23` image.

## Adding a Radio Model

1. Choose a stable route ID that will remain valid if marketing names change.
2. Add one registry definition and aliases.
3. Add a model driver or explicitly reuse a proven compatible driver.
4. Add at least one evidence-backed support profile.
5. Implement identity detection that rejects a different model.
6. Declare capabilities; missing features remain absent from navigation.
7. Add the driver branch to the workspace factory and fail closed by default.
8. Namespace or tag persistent records by model/profile.
9. Add selector, route, factory, compatibility, file, and safety tests.
10. Update the feature reference and production-readiness matrix.

No route files are copied.

## Verification contract

Every architecture change must pass:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Browser validation must cover:

- 73Kit home and general navigation;
- Radio CPS selector labels in closed Select state;
- canonical model route and sidebar;
- model switch back to `/cps`;
- direct unknown-model URL returns not found;
- global Diagnostics and About remain outside CPS state;
- Radio Read remains visible throughout the selected CPS workspace.

Physical validation is separate evidence. Automated tests prove software
contracts; they do not claim a new Radio or firmware has been tested on hardware.

## Related decisions and evidence

- [ADR 0005: Separate 73Kit suite context from Radio CPS context](../adr/0005-separate-73kit-suite-from-radio-cps.md)
- [Codeplug file lifecycle](../codeplug-file-lifecycle.md)
- [Production readiness](../production-readiness.md)
