# Module design

The CPS is organized around the Codeplug workflow and a separate updater
workflow, both behind one adapter seam. Application source lives directly at
the repository root; there is no `src/` directory.

```text
UI
├── CPS Workspace
│   ├── UVL-15W Radio
│   └── Codeplug
└── Update Coordinator
    ├── Update Package
    └── UVL-15W Updater
        └── Transport seam
            ├── Web Serial adapter
            └── Scripted test adapter
```

## Repository layout

```text
app/                         Next.js routes and UI composition
components/                  Shared UI
modules/
  cps-workspace/             CPS workflow and safety invariants
  uvl15w-radio/              Radio protocol and session behaviour
  codeplug/                  Codeplug interpretation and editing
  update-coordinator/        Update lifecycle, prerequisites, and recovery
  update-package/            Fir and DAT parsing and validation
  uvl15w-updater/            Update-mode firmware/resource protocols
adapters/
  indexed-db-cps-database/  Shared versioned CPS database opener
  indexed-db-backup-history-store/ Immutable automatic backup history
  indexed-db-radio-write-store/ Durable prepared-write and recovery adapter
  indexed-db-working-codeplug-store/ Named immutable local documents
  web-serial/                Production Transport adapter
test-support/
  scripted-transport/        Deterministic Transport adapter for tests
```

Create these directories only when their first implementation file is needed.

## CPS Workspace

The CPS Workspace module is the interface used by the UI. It owns Source Radio binding, Baseline Backup, Working Codeplug, Change Set, Backup History, import/export semantics, and Radio Write safety. The UI invokes high-level actions and renders returned state; it does not handle protocol bytes or mutate Codeplugs directly.

Its Radio Write interface prepares and durably records one complete operation,
then executes it. Preparation owns write-image materialization and
the review gate without opening a Radio session; execution owns the E1 Source
Radio and firmware checks, complete protocol write, validated reboot response,
and new Baseline Backup from the accepted intended image. It does not reconnect
or perform a Radio Read after writing. An interrupted E4 transfer restored after
reload is treated as `Write Outcome Unknown`, never resumed from its last acknowledgement.

The Radio Write store seam has two adapters: IndexedDB in the browser and an
in-memory scripted-test adapter. One atomic record contains the prepared
operation, the Baseline Backup recovery reference, and intended write image.
The CPS Workspace validates
their lengths, SHA-256 values, references, Source Radio identity, layout, and
Change Set hash before any E3 command.

The Backup History store is a separate seam with the same browser and test
adapter split. The CPS Workspace saves only successful reads and completed
writes through that interface. Browser storage uses a dedicated IndexedDB
object store, while sharing one versioned database opener with Radio Write
recovery so schema upgrades remain compatible. Backup persistence errors are
reported independently and never change a completed Radio operation into a
failed one.

Named Working Codeplugs use a third store in the same versioned IndexedDB
database. Each record contains an immutable `.uvl15cps` snapshot, its verified
manifest, a unique normalized display name, timestamps and an optimistic
revision. Create never overwrites an existing name; rename and delete require
the expected revision. Opening a saved entry passes through the normal CPS File
parser rather than trusting database bytes.

Portable Codeplug lifecycle is also owned here. A CPS File packages a manifest,
immutable baseline bytes, and working bytes; import verifies its schema, layout,
lengths, and hashes before constructing an offline working document. File
identity is never treated as live Source Radio proof. Restore preparation first
performs a complete Radio Read, saves the current Radio Codeplug as recovery,
verifies exact Source Radio identity, and produces a Restore Plan against the
imported working bytes. Cross-layout transfer is available only through an
explicit pairwise migration adapter; the adapter copies understood settings
onto the freshly read Codeplug so its opaque bytes remain authoritative. See
[Codeplug file lifecycle](../codeplug-file-lifecycle.md) and
[ADR 0004](../adr/0004-verify-imported-codeplugs-before-restore.md).

Same-layout restore materialization also overlays known Radio-managed regions
from the fresh read before comparison. The current layout preserves the opaque
tail at flash `0x20BC0–0x20FFF`, whose 8-byte internal records controlled
repeated reads showed can be populated independently of user Codeplug edits.
Those bytes cannot create a Restore Plan item or be rolled back from an older
file.

Deleting this module would force lifecycle and safety rules into routes, UI state, import/export code, and Radio Write callers, so it provides leverage and locality rather than acting as a pass-through.

## UVL-15W Radio

The UVL-15W Radio module owns connection sequencing, device identification, continuous receive processing, framing, escaping, checksums, retries, session completion, and complete Radio Writes. Frame codecs, command handlers, and stream parsing are private implementation, not public modules.

Its initial interface should remain close to:

```ts
interface Uvl15wRadio {
  connect(): Promise<SourceRadio>
  read(options: {
    onProgress(progress: RadioReadProgress): void
  }): Promise<Codeplug>
  write(
    image: CodeplugWriteImage,
    options: {
      onProgress(progress: RadioWriteProgress): void
    }
  ): Promise<RadioWriteTransferResult>
  disconnect(): Promise<void>
}
```

Interface invariants:

- `connect` must succeed before `read`.
- `connect` succeeds only for a UVL-15W firmware version whose Codeplug layout
  has been validated by this CPS; unsupported or unrecognized firmware is
  disconnected before a Radio Read can begin.
- Only one radio operation may run at a time.
- `read` returns only a complete, validated Codeplug.
- Interrupted or invalid read data is discarded.
- Read completion includes the required protocol termination.
- `write` accepts only the complete materialized firmware-`3.07.23` image,
  validates every block acknowledgement and the final E5 `Reboot` response,
  then reports Radio Write completion.
- Neither the Radio module nor the CPS Workspace reconnects or reads the Radio
  after a completed write.
- Cancellation is not exposed until safe cancellation semantics are defined.

## Codeplug

The Codeplug module owns raw-value preservation, parsing, editing, validation, comparison, and encoding. Unknown and reserved values remain hidden inside the module and survive unrelated edits.

The interface should expose domain operations and results rather than addresses, offsets, bit manipulation, or mutable byte arrays. Detailed editor operations should be added only when their first use case is implemented.

Zone and Scan List storage is exposed through immutable collections on the
Codeplug interface. Collection edits and per-Channel membership edits hide the
dual ordered-list/inverted-bitmap representation, capacity enforcement, and
consistency validation. UI callers must not manipulate either storage
representation independently.

VFO Scan Edge storage is likewise exposed as 32 immutable records plus two
independent band selections. The Codeplug module owns header-version migration,
frequency and step/mode validation, little-endian encoding, and preservation of
the reserved record bytes; UI callers submit only complete domain patches.

## Update Coordinator

The Update Coordinator is the only updater interface used by the UI. It owns
package selection, operation type, prerequisite and compatibility gates,
explicit confirmation, progress, exclusive Radio-operation ownership,
post-reboot verification, and Update Outcome Unknown recovery records.

It keeps Firmware Update and Resource Flash out of the CPS Workspace because
they operate in update mode on packages and address ranges that are not
Codeplugs. The UI renders coordinator state and invokes high-level operations;
it never constructs protocol commands or treats progress as proof of success.

## Update Package

The Update Package module parses and validates official Firmware Packages and
Flash Data Packages without opening a serial port. It owns file grammar,
integrity checks, package classification, embedded metadata, hashes, address
continuity, operation-specific address allowlists, and prerequisite facts.

It exposes immutable validated package values. Raw filenames, visible version
strings, and caller-supplied addresses are never sufficient authorization for a
write.

## UVL-15W Updater

The UVL-15W Updater owns the shared update-mode handshake and two private,
distinct state machines: MCU Firmware Update and Resource Flash. It owns
session-key derivation, block transforms, acknowledgement sequencing,
finalization, and protocol-result verification. Opaque identity/activation
fields and session keys remain transient and are never exposed to UI callers.

The updater implements only operations whose evidence status satisfies the
technical update protocol. As of V1.0, Firmware `3.7.23` is fully reproduced,
and Language, Image, and combined Resource Flash transfers are captured. The
official CPS's variable `E3` source is explained; this module selects the
specification's exact compatibility payload only after package-kind and
evidence-set validation. No destructive production action may be exposed until
that browser path has passed physical validation and recovery gates.

## Transport seam

The Transport seam isolates UVL-15W protocol behaviour from byte transport behaviour. It is a real seam because it has two adapters:

- Web Serial adapter for communication with a physical Radio.
- Scripted test adapter for deterministic protocol tests, arbitrary chunk boundaries, timeouts, corruption, and interruption scenarios.

The Web Serial adapter uses the fixed value 115200 baud because that value was verified by the browser PoC. The protocol specification identifies USB CDC as the transport but does not prescribe a baud rate, and the Radio's USB CDC implementation may ignore the requested line-coding value.

The Transport interface is shared by the UVL-15W Radio and UVL-15W Updater
modules. Adapters satisfy it; the UI, CPS Workspace, and Update Coordinator do
not call adapters directly. The production adapter must additionally expose the
captured RTS behavior and connection lifecycle needed in update mode before a
physical updater is enabled.

## Diagnostics and offline shell

Radio and updater diagnostics are separate allowlist serializers at the UI
boundary. The Radio report retains at most 1,000 in-memory events and exposes
only protocol shape and progress fields. Updater reports likewise reconstruct
only catalog metadata, safe recovery progress and bounded event facts. Neither
serializer accepts arbitrary transport objects, raw frames, Radio identity or
full URLs.

`modules/diagnostics` owns the persisted incident contract, retention policy,
portable JSON serialization and support-email summary. The IndexedDB adapter
keeps at most 10 failed or uncertain incidents per Radio/Update source for 30
days, plus only the latest successful summary per source. UI-side recorders are
best-effort observers: a storage or report failure is swallowed and can never
replace the result of the Radio or Update operation. The Diagnostics workspace
is read-only with respect to the Radio and requires the operator to review and
manually attach a downloaded report to the prefilled support email.

The PWA layer is packaging, not a domain persistence mechanism. The service
worker caches only same-origin GET navigation responses and static application
assets. Codeplug files, raw backups, updater packages and JSON reports are
extension-denied and remain in explicit browser download/IndexedDB workflows.
Worker updates do not call `skipWaiting`, so a newly installed shell cannot
force an active Radio session onto new code.

## Testing

Tests use the same module interfaces as production callers:

- UVL-15W Radio tests exercise complete protocol scenarios through its interface using the scripted Transport adapter.
- Codeplug tests exercise decoding, editing, preservation, validation, and encoding through the Codeplug interface using known binary fixtures.
- CPS Workspace and Restore Workflow tests exercise lifecycle, Source Radio binding, Change Sets, imports, exports, Backup History, restore preparation, Radio-managed-byte preservation, and write recovery through their owning interfaces.
- Update Package tests run without a Radio and verify official package hashes,
  malformed-file rejection, integrity tags, DAT continuity, and address policy.
- UVL-15W Updater tests replay complete sanitized protocol fixtures through the
  scripted Transport, including strict acknowledgements and first, middle and
  final-block interruption states for Firmware and Resource Flash.
- Update Coordinator tests exercise prerequisites, confirmation, exclusivity,
  post-reboot verification, and Update Outcome Unknown recovery.

Internal frame, checksum, and escaping helpers may have focused regression tests where useful, but they are not additional public seams.
