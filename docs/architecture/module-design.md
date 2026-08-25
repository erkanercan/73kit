# Module design

The CPS is organized around three deep modules and one adapter seam. Application source lives directly at the repository root; there is no `src/` directory.

```text
UI
└── CPS Workspace
    ├── UVL-15W Radio
    │   └── Transport seam
    │       ├── Web Serial adapter
    │       └── Scripted test adapter
    └── Codeplug
```

## Repository layout

```text
app/                         Next.js routes and UI composition
components/                  Shared UI
modules/
  cps-workspace/             CPS workflow and safety invariants
  uvl15w-radio/              Radio protocol and session behaviour
  codeplug/                  Codeplug interpretation and editing
adapters/
  web-serial/                Production Transport adapter
test-support/
  scripted-transport/        Deterministic Transport adapter for tests
```

Create these directories only when their first implementation file is needed.

## CPS Workspace

The CPS Workspace module is the interface used by the UI. It owns Source Radio binding, Baseline Backup, Working Codeplug, Change Set, Backup History, import/export semantics, and Radio Write safety. The UI invokes high-level actions and renders returned state; it does not handle protocol bytes or mutate Codeplugs directly.

Deleting this module would force lifecycle and safety rules into routes, UI state, import/export code, and Radio Write callers, so it provides leverage and locality rather than acting as a pass-through.

## UVL-15W Radio

The UVL-15W Radio module owns connection sequencing, device identification, continuous receive processing, framing, escaping, checksums, retries, session completion, and eventual verified Radio Writes. Frame codecs, command handlers, and stream parsing are private implementation, not public modules.

Its initial interface should remain close to:

```ts
interface Uvl15wRadio {
  connect(): Promise<SourceRadio>
  read(options: {
    onProgress(progress: RadioReadProgress): void
  }): Promise<Codeplug>
  disconnect(): Promise<void>
}
```

Interface invariants:

- `connect` must succeed before `read`.
- Only one radio operation may run at a time.
- `read` returns only a complete, validated Codeplug.
- Interrupted or invalid read data is discarded.
- Read completion includes the required protocol termination.
- Cancellation is not exposed until safe cancellation semantics are defined.

## Codeplug

The Codeplug module owns raw-value preservation, parsing, editing, validation, comparison, and encoding. Unknown and reserved values remain hidden inside the module and survive unrelated edits.

The interface should expose domain operations and results rather than addresses, offsets, bit manipulation, or mutable byte arrays. Detailed editor operations should be added only when their first use case is implemented.

## Transport seam

The Transport seam isolates UVL-15W protocol behaviour from byte transport behaviour. It is a real seam because it has two adapters:

- Web Serial adapter for communication with a physical Radio.
- Scripted test adapter for deterministic protocol tests, arbitrary chunk boundaries, timeouts, corruption, and interruption scenarios.

The Web Serial adapter uses the fixed value 115200 baud because that value was verified by the browser PoC. The protocol specification identifies USB CDC as the transport but does not prescribe a baud rate, and the Radio's USB CDC implementation may ignore the requested line-coding value.

The Transport interface belongs to the UVL-15W Radio module. Adapters satisfy it; the UI and CPS Workspace do not call adapters directly.

## Testing

Tests use the same module interfaces as production callers:

- UVL-15W Radio tests exercise complete protocol scenarios through its interface using the scripted Transport adapter.
- Codeplug tests exercise decoding, editing, preservation, validation, and encoding through the Codeplug interface using known binary fixtures.
- CPS Workspace tests exercise lifecycle, Source Radio binding, Change Sets, imports, exports, Backup History, and write recovery through the workspace interface.

Internal frame, checksum, and escaping helpers may have focused regression tests where useful, but they are not additional public seams.
